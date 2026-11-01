#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Protocol-2 transport adapted from Jevpact's t3-rpc.js; credentials never enter errors.
export const t3Error = (code, ambiguous = false) => Object.assign(new Error(code), { code, ambiguous });
const maintenanceCodes = new Set(['maintenance-unavailable', 'maintenance-stale-target', 'maintenance-direction-changed',
  'maintenance-thread-unavailable', 'maintenance-busy', 'maintenance-unsupported', 'maintenance-invalid-continuation',
  'maintenance-ambiguous-delivery', 'maintenance-invalid-input']);

function rejection(cause, mutation) {
  const pending = [cause];
  while (pending.length) {
    const item = pending.pop();
    if (Array.isArray(item)) { pending.push(...item); continue; }
    if (!item || typeof item !== 'object') continue;
    if (maintenanceCodes.has(item.code)) return t3Error(item.code, item.code === 'maintenance-ambiguous-delivery');
    if (item._tag === 'EnvironmentAuthorizationError') return t3Error('t3-authorization-failed');
    for (const key of ['cause', 'error', 'reason']) if (item[key]) pending.push(item[key]);
    if (Array.isArray(item.reasons)) pending.push(...item.reasons);
  }
  return t3Error('t3-rpc-rejected', mutation);
}

/** Protocol-2 RPC connection. Native errors and credential-bearing URLs never enter errors. */
export class T3Rpc {
  #token;
  constructor({ origin, token, fetch = globalThis.fetch, WebSocket = globalThis.WebSocket }) {
    let url;
    try { url = new URL(origin); } catch { throw t3Error('t3-invalid-origin'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw t3Error('t3-invalid-origin');
    this.origin = url.origin; this.#token = token; this.fetch = fetch; this.WebSocket = WebSocket;
    this.pending = new Map(); this.streams = new Map(); this.closed = false;
  }

  async credential() {
    const token = typeof this.#token === 'function' ? await this.#token() : this.#token;
    if (typeof token !== 'string' || !token) throw t3Error('t3-missing-token');
    return token;
  }

  connect() {
    if (this.closed) return Promise.reject(t3Error('t3-rpc-closed'));
    if (this.socket?.readyState === 1) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.connecting = this.open().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  async open() {
    try {
      const token = await this.credential();
      const response = await this.fetch(new URL('/api/auth/websocket-ticket/rpc', this.origin), {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw t3Error('t3-authentication-failed');
      const { ticket } = await response.json();
      if (!ticket) throw t3Error('t3-invalid-ticket');
      if (this.closed) throw t3Error('t3-rpc-closed');
      const url = new URL('/ws', this.origin); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('orchestrationProtocol', '2'); url.searchParams.set('wsTicket', ticket);
      await this.listen(url);
    } catch (error) { throw t3Error(error.code?.startsWith('t3-') ? error.code : 't3-connection-failed'); }
  }

  listen(url) {
    return new Promise((resolve, reject) => {
      const socket = this.socket = new this.WebSocket(url.href);
      const ended = () => { reject(t3Error('t3-disconnected')); this.fail(socket); };
      socket.addEventListener('open', () => { if (this.closed) { socket.close(); ended(); } else resolve(); });
      socket.addEventListener('error', ended); socket.addEventListener('close', ended);
      socket.addEventListener('message', event => {
        if (this.socket !== socket) return;
        try { for (const line of String(event.data).split('\n').filter(Boolean)) this.handle(JSON.parse(line), socket); }
        catch { this.fail(socket, 't3-invalid-frame'); socket.close(); }
      });
    });
  }

  fail(socket, code = 't3-disconnected') {
    if (this.socket !== socket) return;
    this.socket = null;
    for (const request of this.pending.values()) request.reject(t3Error(code, request.mutation && request.sent));
    this.pending.clear();
    const streams = [...this.streams.values()]; this.streams.clear();
    for (const stream of streams) { stream.reject(t3Error(code)); stream.onDisconnect(t3Error(code)); }
  }

  handle(message, socket) {
    if (message._tag === 'Ping') { socket.send(JSON.stringify({ _tag: 'Pong' })); return; }
    if (message._tag === 'Defect') { this.fail(socket, 't3-protocol-failed'); socket.close(); return; }
    const stream = this.streams.get(String(message.requestId));
    if (stream) {
      if (message._tag !== 'Chunk' || !Array.isArray(message.values)) throw t3Error('t3-subscription-ended');
      for (const frame of message.values) { stream.onFrame(frame); if (frame.kind === 'synchronized') stream.resolve(); }
      socket.send(JSON.stringify({ _tag: 'Ack', requestId: message.requestId })); return;
    }
    const request = this.pending.get(String(message.requestId));
    if (!request) return;
    if (message._tag !== 'Exit') throw t3Error('t3-invalid-frame');
    this.pending.delete(String(message.requestId));
    if (message.exit?._tag === 'Success') request.resolve(message.exit.value);
    else request.reject(rejection(message.exit?.cause, request.mutation));
  }

  async request(tag, payload, { mutation = false, isCurrent } = {}) {
    if (!['server.getConfig'].includes(tag)) throw t3Error('t3-read-only');
    await this.connect();
    if (isCurrent && !isCurrent()) throw t3Error('stale-action');
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const request = { resolve, reject, mutation, sent: false }; this.pending.set(id, request);
      try {
        request.sent = true;
        this.socket.send(JSON.stringify({ _tag: 'Request', id, tag, payload, headers: [] }));
      } catch { this.pending.delete(id); reject(t3Error('t3-send-failed', mutation)); }
    });
  }

  async subscribe(tag, payload, { onFrame, onDisconnect }) {
    if (!['orchestration.subscribeShell', 'orchestration.subscribeThread'].includes(tag)) throw t3Error('t3-read-only');
    await this.connect();
    const id = randomUUID();
    const ready = new Promise((resolve, reject) => this.streams.set(id, { resolve, reject, onFrame, onDisconnect }));
    try {
      this.socket.send(JSON.stringify({ _tag: 'Request', id, tag, payload, headers: [] }));
      await ready;
    } catch { this.streams.delete(id); throw t3Error('t3-subscription-failed'); }
    return () => {
      if (!this.streams.delete(id)) return;
      this.socket?.send(JSON.stringify({ _tag: 'Interrupt', requestId: id }));
    };
  }

  async history(threadId, cursor) {
    const url = new URL(`/api/orchestration/threads/${encodeURIComponent(threadId)}/history`, this.origin);
    url.searchParams.set('cursor', cursor);
    const token = await this.credential();
    try {
      const response = await this.fetch(url, { headers: { Authorization: `Bearer ${token}`, 'x-t3-orchestration-protocol': '2' } });
      if (!response.ok) throw t3Error('t3-history-unavailable');
      return await response.json();
    } catch { throw t3Error('t3-history-unavailable'); }
  }

  close() {
    this.closed = true;
    const socket = this.socket;
    this.fail(socket, 't3-rpc-closed'); socket?.close();
  }
}

export const RULES = {
  start: 'new turn: one handoff or follow-up per turn; the RESULT ends it. New work for a busy thread: t3_thread_send mode queue.',
  steer: "t3_thread_send mode steer is input for THIS turn's work only. Answer formal questions with t3_pending_request respond; queue new follow-up work with t3_thread_send mode queue.",
  queued: 'queued: delivered as a new turn when the running turn ends; t3_queue action list shows it and action cancel removes a queuedRunId.',
  active: 'active turn: queue new work with t3_thread_send mode queue; use mode steer only to correct this turn. Answer formal questions with t3_pending_request respond. Past its timebox: act on it now.',
  questions: 'answer with t3_pending_request respond: an answer is input for this turn.',
  done: 'read the full reply and RESULT before acting, and check its claims against the evidence.',
  stalled: "stalled: inspect and act in this turn; don't just wait again.",
  created: 'new thread: track it with a name, and give it one handoff with its timebox.',
  result: 'read the full RESULT before acting and check its claims against the evidence; then send new work with t3_thread_send mode queue.',
  idle: 'turn ended: read the reply in full; send the next work with t3_thread_send mode queue.',
};

const KEY_START = /\s+(?=[A-Za-z_][\w.-]*=)/;

export function extractResult(text, marker = 'RESULT') {
  if (!text) return null;
  const lines = String(text).split('\n');
  const starts = l => { const t = l.trim(); return t === marker || t.startsWith(`${marker} `); };
  let start = -1;
  for (let i = lines.length - 1; i >= 0; i--) if (starts(lines[i])) { start = i; break; }
  if (start < 0) return null;
  const block = [];
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) break;
    if (i > start && !l.trim()) {
      if (/^\s*[A-Za-z_][\w.-]*=/.test(lines[i + 1] || '')) continue;
      break;
    }
    block.push(l);
  }
  const fields = {};
  let last = null;
  const add = (k, v) => { fields[k] = fields[k] === undefined ? v : `${fields[k]}\n${v}`; last = k; };
  block.forEach((l, n) => {
    const body = n === 0 ? l.trim().slice(marker.length).trim() : l;
    if (n > 0 && !/^\s*[A-Za-z_][\w.-]*=/.test(body)) {
      if (last && body.trim()) fields[last] += `\n${body.trim()}`;
      return;
    }
    for (const part of body.trim().split(KEY_START)) {
      const eq = part.indexOf('=');
      if (eq > 0) add(part.slice(0, eq), part.slice(eq + 1).trim());
    }
  });
  return { raw: block.join('\n'), fields };
}


const OMIT = new Set(['rolloutPath', 'title', 'cwd', 'model', 'archived', 'ownerClientId', 'threadId']);
const TEXT_FIELDS = ['lastAgentMessage', 'finalMessage', 'message'];
export function toText(out) {
  if (Array.isArray(out)) return out.map(r => toText(r)).join('\n');
  if (out === null || typeof out !== 'object') return String(out);
  const kv = [], texts = [];
  for (const [k, v] of Object.entries(out)) {
    if (k === 'rule' || OMIT.has(k) || v === null || v === undefined || v === '') continue;
    if (TEXT_FIELDS.includes(k)) { texts.push(String(v)); continue; }
    if (Array.isArray(v)) { texts.push(v.map(x => (typeof x === 'object' ? toText(x) : String(x))).join('\n---\n')); continue; }
    kv.push(`${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  return [kv.join(' '), ...texts, out.rule ? `rule: ${out.rule}` : null].filter(Boolean).join('\n');
}


const ACTIVE = new Set(['queued', 'preparing', 'starting', 'running', 'waiting']);
const ACTIONABLE = new Set(['QUESTION', 'APPROVAL', 'RESULT', 'PAUSED', 'STALLED']);
const COLLECTIONS = { 'run.created': 'runs', 'run.updated': 'runs', 'message.updated': 'messages',
  'runtime-request.updated': 'runtimeRequests', 'turn-item.updated': 'turnItems',
  'node.updated': 'nodes', 'provider-thread.updated': 'providerThreads', 'provider-turn.updated': 'providerTurns',
  'subagent.updated': 'subagents', 'run-attempt.created': 'attempts', 'run-attempt.updated': 'attempts', 'provider-session.attached': 'providerSessions', 'provider-session.updated': 'providerSessions', 'checkpoint-scope.created': 'checkpointScopes', 'plan.updated': 'plans',
  'checkpoint.updated': 'checkpoints', 'checkpoint.captured': 'checkpoints',
  'context-handoff.updated': 'contextHandoffs', 'context-transfer.created': 'contextTransfers',
  'context-transfer.updated': 'contextTransfers' };
const hash = value => createHash('sha256').update(String(value)).digest('hex');
const fail = (code, message = code) => Object.assign(new Error(message), { code });
const ordered = records => Object.values(records ?? {}).sort((a, b) =>
  (a.ordinal ?? Date.parse(a.createdAt ?? a.startedAt) ?? 0) - (b.ordinal ?? Date.parse(b.createdAt ?? b.startedAt) ?? 0));

export function freshState(id) {
  return { id, sequence: null, records: {}, reported: {}, pending: [], idleSince: null,
    lastEventAt: Date.now(), initialized: false, missing: false };
}

export class Reducer {
  constructor(state, { expect, progress = false } = {}) {
    delete state.position; // Discard the obsolete page-relative offset in older cursors.
    this.state = state; this.expect = expect == null ? null : new RegExp(expect, 'm'); this.progress = progress;
  }
  emit(event, key, data = {}) {
    const s = this.state;
    if (s.reported[key]) return;
    s.reported[key] = true;
    if (this.baselining) return;
    const rule = ({ QUESTION: RULES.questions, STALLED: RULES.stalled, PAUSED: RULES.done, DONE: RULES.done })[event];
    s.pending.push({ event, threadId: s.id, at: new Date().toISOString(), ...data, ...(rule ? { rule } : {}) });
  }
  store(collection, record) {
    if (!record?.id) throw fail('t3-invalid-record');
    const s = this.state;
    (s.records[collection] ??= {})[record.id] = record;
    if (collection === 'runs') {
      this.emit('STARTED', `run:${record.id}`, { turnId: record.id, status: record.status });
    } else if (collection === 'messages') {
      if (record.maintenance) this.emit('MAINTENANCE', `maintenance:${record.id}`, { maintenance: record.maintenance });
      if (record.role === 'assistant') this.message(record);
    } else if (collection === 'runtimeRequests') {
      if (record.status === 'pending') this.request(record);
    } else if (collection === 'turnItems') {
      if (record.type === 'compaction' && record.status === 'completed')
        this.emit('COMPACTED', `compaction:${record.id}`, { itemId: record.id });
      if (record.type === 'user_input_request') {
        const request = s.records.runtimeRequests?.[record.requestId];
        if (request?.status === 'pending' || (!request && ['pending', 'running', 'waiting'].includes(record.status))) this.request({ ...record, id: record.requestId, kind: 'user_input' });
      }
    }
  }
  request(record) {
    const item = Object.values(this.state.records.turnItems ?? {}).find(i => i.requestId === record.id);
    this.emit(record.kind === 'user_input' ? 'QUESTION' : 'APPROVAL', `request:${record.id}`,
      { requestId: record.id, kind: record.kind, questions: record.questions ?? item?.questions ?? [],
        message: record.kind === 'user_input' ? 'Read with questions; answer with t3_pending_request respond.' : 'The user must review this approval in T3.' });
  }
  message(record) {
    const s = this.state, text = record.text ?? '';
    if (this.expect && !record.streaming) {
      for (const line of text.split('\n')) if (new RegExp(this.expect.source, this.expect.flags).test(line))
        this.emit('RESULT', `result:${record.id}:${hash(line)}`, { messageId: record.id, turnId: record.runId, message: line });
    }
    if (this.progress && !record.streaming && text)
      this.emit('NOTE', `note:${record.id}:${hash(text)}`, { messageId: record.id, message: text });
    s.lastAgentMessage = text;
  }
  baseline(frame, now = Date.now()) {
    this.baselining = true;
    try { this.accept(frame, now); } finally { this.baselining = false; }
    this.state.settleArmed = this.active();
    for (const request of Object.values(this.state.records.runtimeRequests ?? {})) {
      if (request.status !== 'pending') continue;
      delete this.state.reported[`request:${request.id}`];
      this.request(request);
    }
  }
  accept(frame, now = Date.now()) {
    const s = this.state;
    if (frame.kind === 'synchronized') { s.initialized = true; return; }
    if (frame.kind === 'snapshot') {
      if (frame.projection?.thread?.id !== s.id) throw fail('t3-thread-identity-mismatch');
      s.lastEventAt ??= now;
      s.thread = frame.projection.thread;
      // A bounded snapshot supersedes liveness; evicted runs must not stay active.
      s.records.runs = {};
      const currentRequests = new Set((frame.projection.runtimeRequests ?? []).map(r => r.id));
      for (const [id, request] of Object.entries(s.records.runtimeRequests ?? {}))
        if (request.status === 'pending' && !currentRequests.has(id)) delete s.records.runtimeRequests[id];
      // Merge, rather than discard, records restored by history paging.
      for (const [name, records] of Object.entries(frame.projection)) {
        if (Array.isArray(records) && name !== 'visibleTurnItems') for (const record of records) this.store(name, record);
      }
      for (const row of frame.projection.visibleTurnItems ?? []) this.historyItem(row);
      s.sequence = frame.snapshotSequence;
    } else if (frame.kind === 'event') {
      if (frame.sequence <= (s.sequence ?? -1)) return;
      if (frame.event.threadId && frame.event.threadId !== s.id) throw fail('t3-thread-identity-mismatch');
      const { type, payload } = frame.event;
      if (type === 'thread.visited') {
        const id = payload?.id ?? payload?.threadId;
        if (id !== s.id) throw fail('t3-thread-identity-mismatch');
        if (payload.id) s.thread = payload;
        s.sequence = frame.sequence;
        return;
      }
      if (type.startsWith('provider-') || type.startsWith('run.') || type.startsWith('run-attempt.') ||
          ['runtime-request.updated', 'node.updated', 'subagent.updated', 'plan.updated'].includes(type) ||
          (type === 'message.updated' && payload?.role === 'assistant') ||
          (type === 'turn-item.updated' && !['user_message', 'notification'].includes(payload?.type))) s.lastEventAt = now;
      if (type === 'run.created' || type === 'run.updated') {
        const previous = s.records.runs?.[payload?.id];
        if (!previous || ACTIVE.has(previous.status) || ACTIVE.has(payload?.status)) s.settleArmed = true;
      }
      if (COLLECTIONS[type]) this.store(COLLECTIONS[type], payload);
      else if (type.startsWith('thread.') && payload?.id === s.id) s.thread = payload;
      else if (!['thread.pull-request-link-updated', 'provider-session.detached', 'run.background-work-cancelled', 'checkpoint.rollback-requested'].includes(type)) this.emit('UNPARSED', `unknown:${frame.sequence}`, { type });
      s.sequence = frame.sequence;
    } else this.emit('UNPARSED', `unknown:${frame.sequence ?? hash(JSON.stringify(frame))}`, { type: frame.eventType ?? frame.kind });
    if (this.active()) { s.idleSince = null; s.classified = null; }
    else {
      s.idleSince ??= now;
      const completedAt = Math.max(0, ...Object.values(s.records.runs ?? {}).map(r => Date.parse(r.completedAt) || 0));
      s.idleSince = Math.max(s.idleSince, completedAt);
    }
  }
  historyItem(row) {
    const item = row.item ?? row;
    if (row.visibility === 'inherited') return;
    if (item.runId) this.emit('STARTED', `run:${item.runId}`, { turnId: item.runId, recovered: true });
    if (item.type === 'assistant_message') this.store('messages', { ...item, id: item.messageId ?? item.id, role: 'assistant' });
    else this.store('turnItems', item);
  }
  active() {
    const s = this.state;
    if (s.thread?.activeRunId || s.shell?.activeRunId || s.shell?.activityRunStatus || s.shell?.pendingBackgroundTasks?.length) return true;
    return Object.values(s.records.runs ?? {}).some(run => ACTIVE.has(run.status));
  }
  status() {
    const s = this.state, run = ordered(s.records.runs).at(-1);
    const messages = ordered(s.records.messages).filter(m => m.role === 'assistant');
    return { threadId: s.id, status: this.active() ? 'active' : 'idle', turnId: run?.id ?? null,
      lastTurnStatus: run?.status ?? null, lastAgentMessage: messages.at(-1)?.text ?? '',
      pending: Object.values(s.records.runtimeRequests ?? {}).filter(r => r.status === 'pending').length,
      rule: this.active() ? RULES.active : null };
  }
  tick(now, settleMs, stallMs) {
    const s = this.state;
    if (!s.initialized || s.missing) return;
    if (this.active()) {
      if (now - s.lastEventAt >= stallMs) this.emit('STALLED', `stall:${s.lastEventAt}`);
    } else if (s.settleArmed !== false && s.idleSince != null && now - s.idleSince >= settleMs) {
      const run = ordered(s.records.runs).at(-1), key = run?.id ?? 'idle';
      const messages = ordered(s.records.messages).filter(m => m.role === 'assistant' && (!run || m.runId === run.id));
      const matched = this.expect && new RegExp(this.expect.source, 'm').test(messages.at(-1)?.text ?? '');
      const event = this.expect && !matched ? 'PAUSED' : 'DONE';
      this.emit(event, `settled:${key}`, { turnId: run?.id ?? null, lastAgentMessage: this.status().lastAgentMessage });
      s.classified = event;
    }
  }
}

// History pages are chronological windows with page-relative positions. Only item identities resume them.
export async function recoverHistory(rpc, reducer, frame) {
  let cursor = frame.historyCursor, found = false;
  const newer = [], visited = new Set();
  const held = new Set([...Object.keys(reducer.state.records.turnItems ?? {}), ...Object.keys(reducer.state.records.messages ?? {})]);
  const scan = rows => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const item = rows[i].item ?? rows[i];
      if (held.has(item.id) || held.has(item.messageId)) return i;
      newer.push(rows[i]);
    }
    return -1;
  };
  const snapshotRows = frame.projection?.visibleTurnItems ?? [];
  const snapshotBoundary = scan(snapshotRows);
  found = snapshotBoundary >= 0;
  while (!found && cursor && frame.hasMoreHistory !== false) {
    if (visited.has(cursor)) throw fail('t3-history-cursor-loop');
    visited.add(cursor);
    const page = await rpc.history(reducer.state.id, cursor);
    if (!Array.isArray(page.items)) throw fail('t3-invalid-history');
    found = scan(page.items) >= 0;
    if (found || !page.hasMoreHistory) break;
    if (!page.nextCursor) throw fail('t3-history-incomplete');
    cursor = page.nextCursor;
  }
  if (found && snapshotBoundary >= 0) {
    // Hydration below must not report pre-baseline rows from the same snapshot window.
    reducer.baselining = true;
    try {
      const messages = new Map((frame.projection.messages ?? []).map(message => [message.id, message]));
      for (const row of snapshotRows.slice(0, snapshotBoundary)) {
        reducer.historyItem(row);
        const message = messages.get(row.item?.messageId);
        if (message) reducer.store('messages', message);
      }
    } finally { reducer.baselining = false; }
  }
  if (!found) reducer.emit('HISTORY_START', `history-start:${frame.snapshotSequence ?? reducer.state.sequence}`,
    { message: 'No held history item found; recovered to the start of available history.' });
  for (const row of newer.reverse()) reducer.historyItem(row);
}

function parse(args) {
  const opt = {}, pos = [];
  const booleans = new Set(['json', 'tracked', 'progress', 'until-event', 'until-question', 'all', 'queue', 'steer', 'wait', 'stdin', 'no-open']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) { pos.push(arg); continue; }
    const [key, inline] = arg.slice(2).split(/=(.*)/s);
    if (booleans.has(key)) opt[key] = true;
    else { const value = inline ?? args[++i]; if (value == null || value.startsWith('--')) throw fail('missing-option-value', arg); opt[key] = value; }
  }
  return { opt, pos };
}
const jsonFile = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
};
function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 }); fs.renameSync(temp, file);
}
function registryPath(opt) {
  if (opt.registry || process.env.T3_APP_LINK_REGISTRY) return path.resolve(opt.registry ?? process.env.T3_APP_LINK_REGISTRY);
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return path.join(r.status === 0 ? r.stdout.trim() : process.cwd(), '.t3-app-link.json');
}
export function resolveRef(ref, reg) {
  if (!ref) throw fail('missing-thread', 'pass a thread ID or tracked name');
  return reg.threads.find(t => t.name.toLowerCase() === ref.toLowerCase())?.id ?? ref;
}
function refuseSelf(id) {
  const own = [process.env.T3CODE_THREAD_ID, process.env.T3_THREAD_ID, process.env.T3_APP_LINK_SELF];
  if (own.includes(id)) throw fail('self-tracking', 'Do not track the lead thread.');
}
const TOKEN_FILE = path.join(os.homedir(), 'Library/Application Support/T3-App-Link/token');
const runtimePath = () => path.join(process.env.T3CODE_HOME ?? path.join(os.homedir(), '.t3'), 'userdata/server-runtime.json');
function privateToken(file = TOKEN_FILE) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || (process.getuid && stat.uid !== process.getuid())) throw fail('unsafe-token-file');
  if (stat.mode & 0o077) fs.chmodSync(file, 0o600);
  return fs.readFileSync(file, 'utf8').trim();
}
export async function setup({ tokenFile = TOKEN_FILE, app = process.env.T3_APP_LINK_APP ?? '/Applications/T3 Code (Beta).app', run = spawnSync, fetch = globalThis.fetch, origin } = {}) {
  if (fs.existsSync(tokenFile)) {
    const token = privateToken(tokenFile);
    let response, session;
    try {
      origin ??= jsonFile(runtimePath()).origin;
      response = await fetch(new URL('/api/auth/session', origin), { headers: { Authorization: `Bearer ${token}` } });
      session = await response.json();
    } catch { throw fail('token-validation-failed', 'Could not validate the existing monitoring session with T3.'); }
    if (response.ok && session.authenticated && Date.parse(session.expiresAt) > Date.now()) {
      if (JSON.stringify(session.scopes) !== JSON.stringify(['orchestration:read'])) throw fail('token-scope-mismatch', 'The monitoring token must have only orchestration:read.');
      atomicJson(`${tokenFile}.json`, { expiresAt: session.expiresAt });
      return { setup: 'ready', scope: 'orchestration:read', reused: true };
    }
    if (response.status !== 401 && response.status !== 403 && session.authenticated !== false && !(Date.parse(session.expiresAt) <= Date.now())) throw fail('token-validation-failed');
  }
  const plist = run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleExecutable', path.join(app, 'Contents/Info.plist')], { encoding: 'utf8' });
  if (plist.status !== 0) throw fail('bundled-cli-unavailable');
  const executable = path.join(app, 'Contents/MacOS', plist.stdout.trim());
  const entry = path.join(app, 'Contents/Resources/app.asar/apps/server/dist/bin.mjs');
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  for (const key of ['T3_SERVICE_LAUNCHER_CONTEXT', 'T3_BOOT_SERVICE_UNIT', 'VITE_DEV_SERVER_URL', 'T3CODE_DEV_AUTH_TOKEN']) delete env[key];
  const result = run(executable, [entry, 'auth', 'session', 'issue', '--base-dir', path.dirname(path.dirname(runtimePath())),
    '--json', '--scope', 'orchestration:read', '--label', 'T3 App Link', '--subject', 't3-app-link'], { encoding: 'utf8', env });
  if (result.status !== 0) throw fail('token-issue-failed', 'Bundled auth CLI failed; output withheld to protect credentials.');
  let issued;
  try { issued = JSON.parse(result.stdout); } catch { throw fail('token-issue-invalid'); }
  if (typeof issued.token !== 'string' || !issued.token || !issued.sessionId || !Number.isFinite(Date.parse(issued.expiresAt)) || JSON.stringify(issued.scopes) !== JSON.stringify(['orchestration:read'])) throw fail('token-issue-invalid');
  fs.mkdirSync(path.dirname(tokenFile), { recursive: true, mode: 0o700 });
  const temporary = `${tokenFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, issued.token + '\n', { mode: 0o600, flag: 'wx' }); fs.renameSync(temporary, tokenFile);
  atomicJson(`${tokenFile}.json`, { expiresAt: issued.expiresAt, sessionId: issued.sessionId });
  return { setup: 'ready', scope: 'orchestration:read', reused: false };
}

export function lockCursor(file) {
  if (!file) return () => {};
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  for (;;) {
    try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 }); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const pid = Number(fs.readFileSync(lock, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid <= 0) throw fail('cursor-in-use');
      try { process.kill(pid, 0); throw fail('cursor-in-use'); }
      catch (error) { if (error.code !== 'ESRCH') throw error; fs.unlinkSync(lock); }
    }
  }
  return () => { if (fs.existsSync(lock) && fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock); };
}

export class Monitor {
  constructor(ids, saved, options, reg) {
    this.options = options; this.reg = reg; this.saved = saved; this.ids = ids;
    saved.threads ??= {}; this.reducers = new Map(ids.map(id => {
      saved.threads[id] ??= freshState(id); return [id, new Reducer(saved.threads[id], options)];
    }));
    this.shells = new Map(); this.work = Promise.resolve(); this.subscriptions = new Set(); this.connected = false;
  }
  enqueue(fn) { this.work = this.work.then(fn).then(() => this.changed?.()).catch(e => { this.error = e; this.changed?.(); }); }
  async open() {
    const runtime = jsonFile(runtimePath());
    this.rpc = new T3Rpc({ origin: this.options.origin ?? runtime.origin, token: privateToken() });
    const config = await this.rpc.request('server.getConfig', {});
    const environmentId = config.environment?.environmentId;
    const expected = this.options.environment ?? this.reg.environmentId;
    if (expected && expected !== environmentId) throw fail('t3-environment-mismatch');
    if (this.saved.environmentId && this.saved.environmentId !== environmentId) throw fail('cursor-environment-mismatch');
    this.saved.environmentId = environmentId;
    await this.rpc.subscribe('orchestration.subscribeShell', { requestCompletionMarker: true, omitIdleSubagents: false, omitOlderSettled: false }, {
      onFrame: frame => this.enqueue(() => this.shell(frame)), onDisconnect: error => this.disconnect(error),
    });
    await this.work;
    for (const id of this.ids) if (this.shells.has(id) && !this.reducers.get(id).state.missing) await this.subscribe(id);
    await this.work; this.connected = true;
  }
  shell(frame) {
    if (frame.resolvedRepositoryIdentityRoots !== undefined) return;
    if (frame.kind === 'snapshot' && frame.snapshot?.threads) {
      this.shells = new Map([...frame.snapshot.threads, ...(frame.snapshot.archivedThreads ?? [])].map(t => [t.id, t]));
      for (const [id, reducer] of this.reducers) this.updateShell(reducer, this.shells.get(id));
    } else if (frame.kind === 'thread.updated') {
      this.shells.set(frame.thread.id, frame.thread);
      const reducer = this.reducers.get(frame.thread.id);
      if (reducer) {
        this.updateShell(reducer, frame.thread);
        if (this.connected && !reducer.state.missing) return this.subscribe(frame.thread.id);
      }
    } else if (frame.kind === 'thread.removed') {
      this.shells.delete(frame.threadId); const reducer = this.reducers.get(frame.threadId); if (reducer) this.updateShell(reducer, null);
    }
  }
  updateShell(reducer, shell) {
    const s = reducer.state; s.shell = shell ?? null;
    const missing = !shell || !!shell.deletedAt || !!shell.archivedAt;
    if (missing && !s.missing) { reducer.emit('MISSING', `missing:${Date.now()}`); s.missing = true; }
    else if (!missing && s.missing) { reducer.emit('FOUND', `found:${Date.now()}`); s.missing = false; }
    if (reducer.active()) { s.idleSince = null; s.classified = null; } else s.idleSince ??= Date.now();
  }
  async subscribe(id) {
    if (this.subscriptions.has(id)) return;
    const reducer = this.reducers.get(id), s = reducer.state;
    this.subscriptions.add(id);
    await this.rpc.subscribe('orchestration.subscribeThread', { threadId: id, acceptBoundedSnapshot: true, requestCompletionMarker: true,
      ...(s.sequence != null ? { afterSequence: s.sequence } : {}) }, {
      onFrame: frame => this.enqueue(async () => {
        if (frame.kind === 'snapshot' && this.options.watching && s.sequence == null) {
          reducer.baseline(frame);
        } else {
          if (frame.kind === 'snapshot') await recoverHistory(this.rpc, reducer, frame);
          reducer.accept(frame);
        }
      }), onDisconnect: error => this.disconnect(error),
    });
  }
  disconnect(error) {
    if (error && !['t3-disconnected', 't3-connection-failed', 't3-rpc-closed'].includes(error.code)) { this.error = error; this.changed?.(); return; }
    if (this.closed || this.disconnected) return;
    this.disconnected = true; this.connected = false;
    for (const reducer of this.reducers.values()) {
      const s = reducer.state; if (!s.missing) { reducer.emit('MISSING', `disconnect:${Date.now()}`); s.missing = true; }
    }
    this.changed?.();
  }
  close() { this.closed = true; this.rpc?.close(); }
}

function seconds(opt, key, fallback) {
  const n = opt[key] == null ? fallback : Number(opt[key]);
  if (!Number.isFinite(n) || n < 0) throw fail('invalid-duration', key);
  return n * 1000;
}
const exitFor = event => ({ STALLED: 3, QUESTION: 5, PAUSED: 6 })[event] ?? 0;
function eventText(event, reg) {
  const name = reg.threads.find(t => t.id === event.threadId)?.name ?? event.threadId;
  return `${event.event} ${name} ${toText({ ...event, event: null, at: null }).replace(/\n/g, ' | ')}`.trim();
}

export async function runMonitor(ids, opt, reg, waiting = false) {
  const cursorFile = opt.cursor ? path.resolve(opt.cursor) : null;
  let monitor, timer, deadline, retry, finish;
  const saved = cursorFile ? jsonFile(cursorFile, { threads: {} }) : { threads: {} };
  const settle = seconds(opt, 'settle', 45), stall = seconds(opt, 'stall', 2700), timeout = seconds(opt, 'timeout', 10800);
  const options = { ...opt, progress: !!opt.progress, watching: !waiting };
  const release = lockCursor(cursorFile);
  const save = () => { if (cursorFile) atomicJson(cursorFile, saved); };
  let done = false;
  const output = value => console.log(opt.json ? JSON.stringify(value) : waiting ? toText(value) : eventText(value, reg));
  const stop = code => { if (done) return; done = true; process.exitCode = code; finish?.(); };
  const drain = () => {
    if (done) return;
    if (monitor?.error) { stop(1); return; }
    for (const id of ids) {
      const reducer = monitor.reducers.get(id), s = reducer.state;
      while (s.pending.length) {
        const event = s.pending.shift();
        if (waiting) {
          const terminal = ['DONE', 'PAUSED', 'STALLED'].includes(event.event) || (opt['until-question'] && event.event === 'QUESTION');
          if (!terminal) continue;
          const result = ({ DONE: 'done', PAUSED: 'paused', STALLED: 'stalled', QUESTION: 'question' })[event.event];
          output({ ...reducer.status(), result, rule: event.rule }); save(); stop(exitFor(event.event)); return;
        }
        if (event.event === 'DONE' && opt.expect) continue;
        output(event); save();
        if (opt['until-event'] && ACTIONABLE.has(event.event)) { stop(exitFor(event.event)); return; }
      }
    }
    save();
  };
  const tick = () => {
    if (done || !monitor.connected) return;
    for (const reducer of monitor.reducers.values()) reducer.tick(Date.now(), settle, stall);
    drain();
  };
  const signal = () => { save(); stop(0); };
  try {
    await new Promise((resolve, reject) => {
      finish = resolve;
      const connect = async () => {
        if (done) return;
        monitor?.close(); monitor = new Monitor(ids, saved, options, reg);
        monitor.changed = () => {
          drain();
          if (monitor.disconnected && !done && !retry) {
            // T3's connection supervisor uses a one-second reconnect base.
            retry = setTimeout(() => { retry = null; connect(); }, 1000);
          }
        };
        try { await monitor.open(); drain(); tick(); }
        catch (e) {
          if (['t3-connection-failed', 't3-disconnected'].includes(e.code) && !done) {
            monitor.disconnect();
            if (!retry) retry = setTimeout(() => { retry = null; connect(); }, 1000);
          } else reject(e);
        }
      };
      process.once('SIGINT', signal); process.once('SIGTERM', signal);
      // Timer cadence is the manager kit's existing five-second watch default.
      timer = setInterval(tick, seconds(opt, 'poll', waiting ? 15 : 5));
      deadline = setTimeout(() => {
        output(waiting ? { ...monitor.reducers.get(ids[0]).status(), result: 'timeout' } : { event: 'TIMEOUT' });
        save(); stop(4);
      }, timeout);
      connect();
    });
    if (monitor?.error) throw monitor.error;
  } finally {
    clearInterval(timer); clearTimeout(deadline); clearTimeout(retry);
    monitor?.close(); process.removeListener('SIGINT', signal); process.removeListener('SIGTERM', signal); release();
  }
}

export function completedReplies(state) {
  const active = new Set(Object.values(state.records.runs ?? {}).filter(r => ACTIVE.has(r.status)).map(r => r.id));
  const replies = new Map();
  for (const message of ordered(state.records.messages))
    if (message.role === 'assistant' && !message.streaming && !active.has(message.runId)) replies.set(message.runId, message);
  return [...replies.values()];
}

async function inspect(ids, opt, reg) {
  const monitor = new Monitor(ids, { threads: {} }, opt, reg);
  try { await monitor.open(); if (monitor.error) throw monitor.error; return monitor; }
  finally { monitor.close(); }
}
function redirects(cmd, pos, opt, reg) {
  const id = pos[0] ? resolveRef(pos[0], reg) : '<threadId>';
  const message = opt.text ?? (opt.file ? '<contents of --file>' : '<message>');
  const calls = {
    send: ['t3_thread_send', { threadId: id, message, mode: opt.queue ? 'queue' : opt.steer ? 'steer' : 'auto' }],
    new: ['t3_thread_launch', { title: '<title>', message }],
    queue: ['t3_queue', { threadId: id, action: pos[1] === 'rm' ? 'cancel' : 'list', ...(pos[2] ? { queuedRunId: pos[2] } : {}) }],
    interrupt: ['t3_thread_interrupt', { threadId: id }],
    access: ['t3_thread_configure', { threadId: id }],
  };
  const [tool, args] = calls[cmd];
  return `Use ${tool}(${JSON.stringify(args)})${cmd === 'access' ? '; runtime permissions must be set in T3.' : ''}`;
}
const USAGE = `t3-thread setup|status|read|list|wait|questions|result|watch|track|rules|version
status|read|wait|questions|result <thread ID or tracked name> [--json]
read --last N=1; result --marker RESULT --turns N=10; questions --all --since ISO
wait --settle SEC=45 --stall SEC=2700 --timeout SEC=10800 --until-question --expect REGEX
watch (<id>... | --tracked) --expect REGEX --cursor FILE --progress --until-event
track add <id> --name NAME [--role ROLE] [--note TEXT] [--environment ID] | rm <name> | list
list --limit N=10 --cwd DIR; --registry FILE selects .t3-app-link.json
send|new|queue|interrupt|access redirect to native T3 tools and exit 2.`;

export async function main(args = process.argv.slice(2)) {
  const [cmd, ...rest] = args, { opt, pos } = parse(rest);
  const file = registryPath(opt), reg = jsonFile(file, { threads: [] }); reg.threads ??= [];
  const print = value => console.log(opt.json ? JSON.stringify(value) : toText(value));
  if (['send', 'new', 'queue', 'interrupt', 'access'].includes(cmd)) {
    console.error(redirects(cmd, pos, opt, reg)); process.exitCode = 2; return;
  }
  if (cmd === 'setup') { print(await setup()); return; }
  if (cmd === 'version') {
    const script = fileURLToPath(import.meta.url), manifest = jsonFile(path.resolve(path.dirname(script), '../../../.claude-plugin/plugin.json'), {});
    print({ version: manifest.version ?? 'unknown', script, registry: file }); return;
  }
  if (cmd === 'rules') { print(opt.json ? RULES : Object.entries(RULES).map(([key, value]) => `${key}: ${value}`).join('\n')); return; }
  if (cmd === 'track') {
    if (pos[0] === 'add') {
      if (!pos[1] || !opt.name) throw fail('missing-name', 'track add <id> --name NAME');
      refuseSelf(pos[1]);
      const entry = { id: pos[1], name: opt.name, role: opt.role ?? null, note: opt.note ?? null,
        environmentId: opt.environment ?? reg.environmentId ?? null, added: new Date().toISOString() };
      reg.threads = reg.threads.filter(t => t.id !== entry.id && t.name.toLowerCase() !== entry.name.toLowerCase());
      reg.threads.push(entry);
    } else if (pos[0] === 'rm') {
      const id = resolveRef(pos[1], reg); const before = reg.threads.length; reg.threads = reg.threads.filter(t => t.id !== id);
      if (reg.threads.length === before) throw fail('unknown-thread-name');
    } else if (pos[0] !== 'list') throw fail('invalid-track-action');
    if (pos[0] !== 'list') atomicJson(file, reg);
    print(reg.threads); return;
  }
  if (cmd === 'list') {
    const monitor = new Monitor([], { threads: {} }, opt, reg);
    try {
      await monitor.open();
      const limit = Number(opt.limit ?? 10);
      print([...monitor.shells.values()].filter(t => !t.archivedAt && !t.deletedAt && (!opt.cwd || t.worktreePath === opt.cwd))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit)
        .map(t => ({ id: t.id, name: t.title, updated: t.updatedAt, status: t.status })));
    } finally { monitor.close(); } return;
  }
  if (!['watch', 'wait', 'read', 'status', 'questions', 'result'].includes(cmd)) { console.error(USAGE); process.exitCode = 2; return; }
  const ids = [...new Set(opt.tracked ? reg.threads.map(t => t.id) : pos.map(ref => resolveRef(ref, reg)))];
  if (!ids.length) throw fail('missing-thread');
  for (const id of ids) {
    refuseSelf(id);
    const environment = reg.threads.find(t => t.id === id)?.environmentId;
    if (environment && reg.environmentId && environment !== reg.environmentId) throw fail('mixed-environments');
    if (environment && !opt.environment) opt.environment = environment;
    else if (environment && environment !== opt.environment) throw fail('mixed-environments');
  }
  if (cmd === 'watch' || cmd === 'wait') { await runMonitor(ids, opt, reg, cmd === 'wait'); return; }
  const monitor = await inspect(ids, opt, reg), reducer = monitor.reducers.get(ids[0]), s = reducer.state;
  if (cmd === 'status') print(reducer.status());
  const replies = completedReplies(s);
  if (cmd === 'read') {
    print({ threadId: ids[0], turns: replies.slice(-Number(opt.last ?? 1)).map(m => ({ turnId: m.runId, message: m.text })) });
  }
  if (cmd === 'result') {
    const result = replies.slice(-Number(opt.turns ?? 10)).map(m => extractResult(m.text, opt.marker ?? 'RESULT')).findLast(Boolean);
    if (!result) { print({ result: 'none', marker: opt.marker ?? 'RESULT' }); process.exitCode = 6; }
    else print(opt.json ? result : `${Object.entries(result.fields).map(([k, v]) => `${k}=${v}`).join('\n')}\nrule: ${RULES.done}`);
  }
  if (cmd === 'questions') {
    const since = opt.since ? Date.parse(opt.since) : 0;
    if (Number.isNaN(since)) throw fail('invalid-since');
    const questions = Object.values(s.records.runtimeRequests ?? {}).filter(r => r.kind === 'user_input' && Date.parse(r.createdAt) >= since)
      .map(r => ({ ...r, questions: Object.values(s.records.turnItems ?? {}).find(i => i.requestId === r.id)?.questions ?? [] }));
    const pending = questions.filter(r => r.status === 'pending').length;
    print({ pending, asked: questions.length, questions: opt.all ? questions : questions.filter(r => r.status === 'pending'), rule: pending ? RULES.questions : null });
    process.exitCode = pending ? 5 : 0;
  }
}
// Compare real paths: a symlinked install or macOS /tmp would otherwise exit 0 having done nothing.
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  main().catch(error => { console.error(JSON.stringify({ error: error.code ?? 'error', message: error.code ? error.message : 'T3 App Link failed; inspect local configuration and protocol compatibility.' })); process.exitCode = 1; });
}
