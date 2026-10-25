#!/usr/bin/env node
// Drive Codex desktop-app threads from the terminal.
//
// Transport: the Codex desktop app's private IPC socket (~/.codex/ipc/ipc.sock),
// length-prefixed JSON frames (uint32 LE + UTF-8 JSON). Protocol learned from
// Jevpact (plugins/jevpact/src/codex.js); it is undocumented and may change
// between Codex releases. Thread state is read from Codex's own files:
// ~/.codex/state_5.sqlite (thread index) and the thread's rollout JSONL.

import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

// node:sqlite prints an ExperimentalWarning on load; drop the default printer first.
process.removeAllListeners('warning');
const { DatabaseSync } = await import('node:sqlite');

function query(sql, ...params) {
  const db = new DatabaseSync(path.join(CODEX_HOME, 'state_5.sqlite'), { readOnly: true });
  try { return db.prepare(sql).all(...params); } finally { db.close(); }
}

const CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const SOCKET = path.join(CODEX_HOME, 'ipc', 'ipc.sock');
// `open codex://...` is handled by the default Codex instance (~/.codex), whatever
// CODEX_HOME says; other instances are reached by process instead (openInInstance).
const DEFAULT_HOME = path.join(os.homedir(), '.codex');
const IS_DEFAULT_HOME = path.resolve(CODEX_HOME) === path.resolve(DEFAULT_HOME);
// Prefer the CLI bundled with the desktop app: it matches the app's version and
// supports the same models. An older `codex` on PATH may reject the configured model.
const APP_CODEX = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';
const CODEX_BIN = process.env.CODEX_BIN || (fs.existsSync(APP_CODEX) ? APP_CODEX : 'codex');
const PROTOCOL = {
  initialize: 0,
  'thread-owner-discovery': 1,
  'thread-follower-start-turn': 2,
  'thread-follower-steer-turn': 1,
  'thread-follower-update-thread-settings': 2,
};

// Access presets, as the composer's access selector sends them (`full-access`
// agent mode). Measured against the app bundle on 2026-10-19.
const ACCESS_PRESETS = {
  full: { permissions: ':danger-full-access', approvalPolicy: 'never', approvalsReviewer: 'user' },
};

class Fail extends Error {
  constructor(code, detail) { super(detail ? `${code}: ${detail}` : code); this.code = code; }
}

// ---------- IPC client ----------

class Ipc {
  constructor(timeoutMs) { this.timeoutMs = timeoutMs; this.pending = new Map(); this.buf = Buffer.alloc(0); this.clientId = 'initializing-client'; }

  async open() {
    if (!fs.existsSync(SOCKET)) throw new Fail('app-not-running', `no IPC socket at ${SOCKET}; start the Codex desktop app`);
    this.sock = net.createConnection(SOCKET);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Fail('connect-timeout')), this.timeoutMs);
      this.sock.once('connect', () => { clearTimeout(t); resolve(); });
      this.sock.once('error', e => { clearTimeout(t); reject(new Fail('connect-error', e.message)); });
    });
    this.sock.on('data', d => this.receive(d));
    this.sock.on('error', () => this.failAll(new Fail('connection-error')));
    this.sock.on('close', () => this.failAll(new Fail('disconnected')));
    const res = await this.request('initialize', { clientType: 'claude-code-orchestrator' });
    if (typeof res.result?.clientId !== 'string') throw new Fail('invalid-initialize-response');
    this.clientId = res.result.clientId;
    return this;
  }

  receive(data) {
    this.buf = Buffer.concat([this.buf, data]);
    while (this.buf.length >= 4) {
      const size = this.buf.readUInt32LE(0);
      if (this.buf.length < size + 4) return;
      const msg = JSON.parse(this.buf.subarray(4, size + 4).toString('utf8'));
      this.buf = this.buf.subarray(size + 4);
      this.handle(msg);
    }
  }

  handle(msg) {
    if (msg.type === 'client-discovery-request') {
      // We never own threads; tell the router to ask someone else.
      this.write({ type: 'client-discovery-response', requestId: msg.requestId, response: { canHandle: false } });
      return;
    }
    if (msg.type !== 'response') return;
    const p = this.pending.get(msg.requestId);
    if (!p) return;
    this.pending.delete(msg.requestId);
    clearTimeout(p.timer);
    if (msg.resultType !== 'success') p.reject(new Fail(typeof msg.error === 'string' ? msg.error : 'request-failed'));
    else if (p.target && msg.handledByClientId !== p.target) p.reject(new Fail('response-owner-mismatch'));
    else p.resolve(msg);
  }

  write(obj) {
    const body = Buffer.from(JSON.stringify(obj));
    const head = Buffer.allocUnsafe(4);
    head.writeUInt32LE(body.length);
    this.sock.write(Buffer.concat([head, body]));
  }

  request(method, params, target) {
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(requestId); reject(new Fail('request-timeout', method)); }, this.timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer, target });
      this.write({ type: 'request', requestId, sourceClientId: this.clientId, version: PROTOCOL[method], method, params, targetClientId: target, timeoutMs: this.timeoutMs });
    });
  }

  failAll(err) {
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(err); }
    this.pending.clear();
  }

  close() { this.sock?.destroy(); }
}

// ---------- Shared app-server daemon client ----------
//
// Terminal CLI sessions (`codex` in a terminal) don't belong to the desktop app: they
// are clients of the shared local app-server daemon, which holds the thread. The app
// never takes ownership of such a thread, so the IPC route above can't reach it. The
// daemon speaks JSON-RPC over a WebSocket on a Unix socket; a second client can steer
// or start turns on the same loaded thread, so the terminal sees the message arrive
// and no second instance of the thread is created.

const DAEMON_SOCKET = path.join(CODEX_HOME, 'app-server-control', 'app-server-control.sock');

class Daemon {
  constructor(timeoutMs) { this.timeoutMs = timeoutMs; this.pending = new Map(); this.buf = Buffer.alloc(0); this.nextId = 1; }

  async open() {
    if (!fs.existsSync(DAEMON_SOCKET)) throw new Fail('daemon-not-running', `no app-server daemon socket at ${DAEMON_SOCKET}`);
    this.sock = net.createConnection(DAEMON_SOCKET);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Fail('daemon-connect-timeout')), this.timeoutMs);
      this.sock.once('error', e => { clearTimeout(t); reject(new Fail('daemon-connect-error', e.message)); });
      this.sock.once('connect', () => {
        const key = Buffer.from(randomUUID().replace(/-/g, ''), 'hex').toString('base64');
        this.sock.write(`GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n`
          + `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
      });
      let head = Buffer.alloc(0);
      const onData = d => {
        head = Buffer.concat([head, d]);
        const end = head.indexOf('\r\n\r\n');
        if (end < 0) return;
        this.sock.off('data', onData);
        clearTimeout(t);
        if (!/^HTTP\/1\.1 101/.test(head.subarray(0, end).toString())) return reject(new Fail('daemon-handshake-failed', head.subarray(0, end).toString().split('\r\n')[0]));
        this.sock.on('data', x => this.receive(x));
        this.receive(head.subarray(end + 4));
        resolve();
      };
      this.sock.on('data', onData);
    });
    this.sock.on('error', () => this.failAll(new Fail('daemon-connection-error')));
    this.sock.on('close', () => this.failAll(new Fail('daemon-disconnected')));
    await this.request('initialize', { clientInfo: { name: 'codex-app-link', title: 'codex-app-link', version: '0' } });
    this.notify('initialized');
    return this;
  }

  receive(data) {
    this.buf = Buffer.concat([this.buf, data]);
    for (;;) {
      if (this.buf.length < 2) return;
      let len = this.buf[1] & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + len) return;
      const op = this.buf[0] & 0x0f, body = this.buf.subarray(off, off + len);
      this.buf = this.buf.subarray(off + len);
      if (op === 1) this.handle(JSON.parse(body.toString('utf8')));
      else if (op === 9) this.frame(0xa, body); // answer pings
    }
  }

  handle(msg) {
    if (msg.id === undefined || !this.pending.has(msg.id)) return; // notifications and server requests
    const p = this.pending.get(msg.id);
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.error) p.reject(new Fail('daemon-request-failed', `${p.method}: ${msg.error.message || JSON.stringify(msg.error)}`));
    else p.resolve(msg.result);
  }

  frame(op, payload) {
    const mask = Buffer.from(randomUUID().replace(/-/g, '').slice(0, 8), 'hex');
    const n = payload.length;
    const head = n < 126 ? Buffer.from([0x80 | op, 0x80 | n])
      : n < 65536 ? Buffer.concat([Buffer.from([0x80 | op, 0x80 | 126]), Buffer.from([n >> 8, n & 0xff])])
        : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | op; b[1] = 0x80 | 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
    const body = Buffer.from(payload);
    for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
    this.sock.write(Buffer.concat([head, mask, body]));
  }

  notify(method, params) { this.frame(1, Buffer.from(JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) }))); }

  request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Fail('daemon-request-timeout', method)); }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.frame(1, Buffer.from(JSON.stringify({ jsonrpc: '2.0', id, method, params })));
    });
  }

  failAll(err) {
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(err); }
    this.pending.clear();
  }

  close() { this.sock?.destroy(); }
}

async function withDaemon(fn, timeoutMs = 8000) {
  const d = await new Daemon(timeoutMs).open();
  try { return await fn(d); } finally { d.close(); }
}

// Whether the shared daemon has this thread loaded. A missing daemon means "no".
async function daemonHolds(threadId) {
  if (!fs.existsSync(DAEMON_SOCKET)) return false;
  try {
    return await withDaemon(async d => {
      for (let cursor = null; ;) {
        const r = await d.request('thread/loaded/list', cursor ? { cursor } : {});
        if ((r.data || []).includes(threadId)) return true;
        if (!r.nextCursor) return false;
        cursor = r.nextCursor;
      }
    }, 3000);
  } catch { return false; }
}

// The daemon's own view of the newest turn: authoritative for steering preconditions.
async function daemonLatestTurn(d, threadId) {
  const r = await d.request('thread/turns/list', { threadId, limit: 1, sortDirection: 'desc' });
  return (r.data || [])[0] || null;
}

async function withIpc(fn, timeoutMs = 8000) {
  const ipc = await new Ipc(timeoutMs).open();
  try { return await fn(ipc); } finally { ipc.close(); }
}

async function owner(ipc, threadId) {
  const res = await ipc.request('thread-owner-discovery', { hostId: 'local', conversationId: threadId });
  if (typeof res.handledByClientId !== 'string') throw new Fail('invalid-owner-response');
  return res.handledByClientId;
}

// ---------- Local thread state ----------

function locate(threadId) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) throw new Fail('invalid-thread-id', threadId);
  let rows;
  try { rows = query('SELECT id, rollout_path, cwd, model, title, archived FROM threads WHERE id = ?', threadId); }
  catch (e) { throw new Fail('thread-index-unavailable', e.message.split('\n')[0]); }
  if (!rows.length) throw new Fail('thread-not-indexed', threadId);
  return rows[0];
}

// Rollout files grow without bound (long threads pass hundreds of MB), and every
// question this script asks is about recent history. Read them backwards from
// the end, a chunk at a time, and stop as soon as the answer is known. Lines are
// split on the newline byte and decoded individually, so multi-byte characters
// never straddle a chunk boundary.
function* linesFromEnd(rolloutPath) {
  const fd = fs.openSync(rolloutPath, 'r');
  const size = 1024 * 1024;
  let pos = fs.fstatSync(fd).size;
  let carry = Buffer.alloc(0); // start of a line whose beginning is in an earlier chunk
  try {
    while (pos > 0) {
      const len = Math.min(size, pos);
      pos -= len;
      const chunk = Buffer.alloc(len);
      fs.readSync(fd, chunk, 0, len, pos);
      const buf = carry.length ? Buffer.concat([chunk, carry]) : chunk;
      let end = buf.length;
      for (let i = buf.lastIndexOf(10, end - 1); i !== -1; i = end > 0 ? buf.lastIndexOf(10, end - 1) : -1) {
        if (end > i + 1) yield buf.toString('utf8', i + 1, end);
        end = i;
      }
      carry = Buffer.from(buf.subarray(0, end));
    }
    if (carry.length) yield carry.toString('utf8');
  } finally { fs.closeSync(fd); }
}

function parseRecord(line) { try { return JSON.parse(line); } catch { return null; } } // tolerate a partial last line

// Turn state from the rollout: task_started => busy; task_complete/turn_aborted => idle.
// Scanning backwards, the most recent task_started decides: the thread is idle if
// that turn already ended (an end event for it appeared later), active otherwise.
function turnState(rolloutPath) {
  const state = { status: 'unknown', turnId: null, lastTurnId: null, lastTurnStatus: null, lastAgentMessage: null };
  const ended = new Map(); // turnId -> end event, collected from the end of the file
  let latestEnd = null;
  for (const line of linesFromEnd(rolloutPath)) {
    if (!line.includes('"task_') && !line.includes('"turn_aborted"')) continue; // cheap prefilter
    const rec = parseRecord(line);
    if (!rec || rec.type !== 'event_msg') continue;
    const p = rec.payload || {};
    if (p.type === 'task_complete' || p.type === 'turn_aborted') {
      latestEnd ??= p;
      if (p.turn_id) ended.set(p.turn_id, p);
    } else if (p.type === 'task_started') {
      state.startedAt = Date.parse(rec.timestamp) || null;
      const end = ended.get(p.turn_id);
      if (end) {
        state.status = 'idle'; state.lastTurnId = p.turn_id;
        state.lastTurnStatus = end.type === 'task_complete' ? 'completed' : 'aborted';
      } else {
        state.status = 'active'; state.turnId = p.turn_id; state.lastTurnId = p.turn_id; state.lastTurnStatus = 'inProgress';
      }
      break;
    }
  }
  if (state.status === 'unknown' && latestEnd) { // an end with no start in the file
    state.status = 'idle'; state.lastTurnId = latestEnd.turn_id ?? null;
    state.lastTurnStatus = latestEnd.type === 'task_complete' ? 'completed' : 'aborted';
  }
  const lastComplete = latestEnd?.type === 'task_complete' ? latestEnd : [...ended.values()].find(e => e.type === 'task_complete');
  state.lastAgentMessage = lastComplete?.last_agent_message ?? null;
  return state;
}

// The last `limit` completed or aborted turns, oldest first.
function completedTurns(rolloutPath, limit = 1) {
  const turns = [];
  for (const line of linesFromEnd(rolloutPath)) {
    if (turns.length >= limit) break;
    if (!line.includes('"task_complete"') && !line.includes('"turn_aborted"')) continue;
    const rec = parseRecord(line);
    const p = rec?.payload || {};
    if (rec?.type === 'event_msg' && (p.type === 'task_complete' || p.type === 'turn_aborted')) {
      turns.push({ turnId: p.turn_id, status: p.type === 'task_complete' ? 'completed' : 'aborted', completedAt: p.completed_at ?? rec.timestamp, message: p.last_agent_message ?? null });
    }
  }
  return turns.reverse();
}

// Formal questions. Codex asks through request_user_input / request_user_input_async
// tool calls. The async form is accepted at once and the turn keeps running, so
// "wait" never sees the thread go idle: a manager must look for questions directly.
// The rollout never links an answer to its question. A question counts as answered
// once a user message (a send or steer) arrives after it; injected context such as
// AGENTS.md, environment blocks or a configured automation prompt doesn't count.
const INJECTED_USER = /^\s*(# AGENTS\.md|<environment_context>|<user_instructions>|<INSTRUCTIONS>)/;

// Optional context-maintenance controllers (for example Jevpact) send their own user
// messages: a pause request before compaction and a resume after it. Their wording is
// configurable, so nothing is built in. A project sets regexes in its registry
// ("automation": {"pause": ..., "resume": ...}) or passes --pause-pattern/--resume-pattern.
// Matching messages become MAINTENANCE events and never count as answers.
const AUTOMATION = { pause: null, resume: null };
function configureAutomation(reg, opt) {
  const pick = (flag, key) => (typeof opt[flag] === 'string' ? opt[flag] : reg.automation?.[key]);
  for (const [flag, key] of [['pause-pattern', 'pause'], ['resume-pattern', 'resume']]) {
    const src = pick(flag, key);
    if (!src) continue;
    try { AUTOMATION[key] = new RegExp(src, 'i'); } catch (e) { throw new Fail('invalid-pattern', `${key}: ${e.message}`); }
  }
}
function automationKind(text) {
  if (AUTOMATION.pause?.test(text)) return 'pause';
  if (AUTOMATION.resume?.test(text)) return 'resume';
  return null;
}

function userText(p) {
  return (p.content || []).map(c => c.text || '').join('').trim();
}

// Questions asked at or after sinceMs, oldest first. Scans backwards and stops at
// sinceMs, once every collected question knows the turn it was asked in.
function questionsIn(rolloutPath, sinceMs = 0) {
  const asked = [];
  let answer = null; // earliest qualifying user message after the current position
  for (const line of linesFromEnd(rolloutPath)) {
    // Only three kinds of record matter here; skip parsing everything else (turns can be tens of MB).
    if (!line.includes('request_user_input') && !line.includes('"role":"user"') && !line.includes('"role": "user"')
      && !line.includes('task_started')) continue;
    const rec = parseRecord(line);
    if (!rec) continue;
    const p = rec.payload || {};
    if (rec.type === 'event_msg' && p.type === 'task_started') {
      for (const q of asked) if (q.turnId === undefined) q.turnId = p.turn_id;
      if (Date.parse(rec.timestamp) < sinceMs) break;
      continue;
    }
    if (Date.parse(rec.timestamp) < sinceMs && asked.every(q => q.turnId !== undefined)) break;
    if (rec.type !== 'response_item') continue;
    if (p.type === 'function_call' && String(p.name || '').startsWith('request_user_input')) {
      if (Date.parse(rec.timestamp) < sinceMs) continue;
      let args = {};
      try { args = JSON.parse(p.arguments || '{}'); } catch { /* keep empty */ }
      const items = (args.questions || []).map(q => ({
        title: q.title ?? q.question ?? '',
        options: (q.options || []).map(o => (typeof o === 'string' ? o : o.label ?? o.title ?? JSON.stringify(o))),
      }));
      asked.push({ callId: p.call_id, askedAt: rec.timestamp, turnId: undefined, async: p.name.endsWith('_async'),
        questions: items, answeredAt: answer?.at ?? null, answer: answer?.text ?? null });
    } else if (p.type === 'message' && p.role === 'user') {
      const text = userText(p);
      if (!text || INJECTED_USER.test(text) || automationKind(text)) continue;
      answer = { at: rec.timestamp, text: text.slice(0, 400) };
    }
  }
  for (const q of asked) if (q.turnId === undefined) q.turnId = null;
  return asked.reverse();
}

function pendingQuestions(rolloutPath, sinceMs = 0) {
  return questionsIn(rolloutPath, sinceMs).filter(q => !q.answeredAt);
}

async function status(threadId, { needOwner = true } = {}) {
  const t = locate(threadId);
  const s = turnState(t.rollout_path);
  let ownerClientId = null, ownerError = null;
  if (needOwner) {
    try { ownerClientId = await withIpc(ipc => owner(ipc, threadId)); }
    catch (e) { ownerError = e.code || e.message; }
  }
  const loadedInDaemon = !ownerClientId && await daemonHolds(threadId);
  const queued = readQueue(threadId).length;
  const runningFor = s.status === 'active' && s.startedAt ? `${Math.round((Date.now() - s.startedAt) / 60_000)}m` : null;
  return { threadId, title: t.title, cwd: t.cwd, model: t.model, archived: !!t.archived, rolloutPath: t.rollout_path,
    ...s, runningFor, queued: queued || null, loadedInApp: !!ownerClientId, ownerClientId, ownerError, loadedInDaemon,
    rule: s.status === 'active' ? RULES.active : null };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatQuestions(list) {
  return list.map(q => {
    const head = `[${q.askedAt}${q.answeredAt ? ` answered ${q.answeredAt}` : ' PENDING'}]`;
    const body = q.questions.map(x => `Q: ${x.title}${x.options.length ? `\n  options: ${x.options.join(' | ')}` : ''}`).join('\n');
    return `${head}\n${body}${q.answer ? `\n  answer: ${q.answer.replace(/\s+/g, ' ').slice(0, 200)}` : ''}`;
  }).join('\n---\n');
}

// Wait until the THREAD is done, not a particular turn. Codex often chains turns
// (compaction, auto-continue), and a turn can end without a normal completion
// event, so pinning to a turn ID can hang forever. Rules:
// - done   = thread idle continuously for `settleMs` (absorbs chained turns);
//            if `turnId` is given, any later turn also counts as that turn done.
// - stalled = thread claims active but its rollout file has not been written
//            for `stallMs` (dead or wedged turn): return instead of hanging.
// - timeout = overall deadline reached.
// - question = (with untilQuestion) the thread asked a formal question that no user
//              message has answered yet. Only questions asked after the wait began
//              count, so an old unanswered one can't end every wait at once.
// Always returns a result object (never throws on timeout) so callers see state.
async function waitIdle(threadId, { turnId = null, timeoutMs = 3 * 3600_000, pollMs = 15_000,
  settleMs = 45_000, stallMs = 45 * 60_000, untilQuestion = false } = {}) {
  const t = locate(threadId);
  const started = Date.now();
  const deadline = started + timeoutMs;
  let idleSince = null;
  for (;;) {
    const s = turnState(t.rollout_path);
    const now = Date.now();
    if (untilQuestion) {
      const pending = pendingQuestions(t.rollout_path, started);
      if (pending.length) {
        return { threadId, result: 'question', waitedSeconds: Math.round((now - started) / 1000), ...s,
          pendingQuestions: pending.length, message: formatQuestions(pending) };
      }
    }
    const pastTurn = !turnId || s.lastTurnId !== turnId || s.status === 'idle';
    if (s.status === 'idle' && pastTurn) {
      idleSince ??= now;
      if (now - idleSince >= settleMs) {
        return { threadId, result: 'done', waitedSeconds: Math.round((now - started) / 1000), ...s };
      }
    } else {
      idleSince = null;
      const lastWrite = fs.statSync(t.rollout_path).mtimeMs;
      if (s.status === 'active' && now - lastWrite >= stallMs) {
        return { threadId, result: 'stalled', waitedSeconds: Math.round((now - started) / 1000),
          rolloutIdleSeconds: Math.round((now - lastWrite) / 1000), ...s };
      }
    }
    if (now >= deadline) {
      return { threadId, result: 'timeout', waitedSeconds: Math.round((now - started) / 1000), ...s };
    }
    await sleep(Math.min(pollMs, Math.max(1000, deadline - now)));
  }
}

// The app only answers for threads it has loaded (opened at least once since it
// started). There is no IPC request to load one, so we open its deep link in the
// background (`open -g`); the app loads it and becomes the owner. This can switch
// the thread shown in the app window. Opening also delivers any `codex queue`d
// messages, which may start a turn immediately.
// A second instance runs the same app bundle (with its own user-data dir), so
// `open` cannot choose it. Send the link as a GetURL Apple Event addressed to
// the process that owns this instance's socket instead.
const GURL_JXA = `ObjC.import('Foundation');
function run(a) {
  const c = s => (s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3);
  const ev = $.NSAppleEventDescriptor.appleEventWithEventClassEventIDTargetDescriptorReturnIDTransactionID(
    c('GURL'), c('GURL'), $.NSAppleEventDescriptor.descriptorWithProcessIdentifier(parseInt(a[0], 10)), -1, 0);
  ev.setParamDescriptorForKeyword($.NSAppleEventDescriptor.descriptorWithString(a[1]), c('----'));
  const err = Ref();
  const reply = ev.sendEventWithOptionsTimeoutError(3, 10, err);
  return reply && !reply.isNil() ? 'sent' : 'error: ' + (err[0] ? ObjC.unwrap(err[0].localizedDescription) : 'unknown');
}`;

function openInInstance(threadId) {
  const owner = spawnSync('lsof', ['-t', SOCKET], { encoding: 'utf8' });
  const pid = String(owner.stdout || '').trim().split('\n')[0];
  if (!/^\d+$/.test(pid)) {
    throw new Fail('not-loaded-in-instance', `no running app owns ${SOCKET}; start the app instance for CODEX_HOME=${CODEX_HOME}, `
      + 'or open the thread in it, then retry');
  }
  const r = spawnSync('osascript', ['-l', 'JavaScript', '-e', GURL_JXA, pid, `codex://threads/${threadId}`], { encoding: 'utf8' });
  if (r.status !== 0 || String(r.stdout).trim() !== 'sent') {
    throw new Fail('open-failed', `could not send the thread link to pid ${pid}: ${String(r.stderr || r.stdout).trim()}`);
  }
}

async function ensureLoaded(threadId, { open = true } = {}) {
  const probe = () => withIpc(ipc => owner(ipc, threadId), 3000);
  try { return { ownerId: await probe(), opened: false }; }
  catch (e) { if (!open || !['request-timeout', 'no-client-found'].includes(e.code)) throw e; }
  if (IS_DEFAULT_HOME) {
    const r = spawnSync('open', ['-g', `codex://threads/${threadId}`]);
    if (r.status !== 0) throw new Fail('open-failed', String(r.stderr || '').trim());
  } else {
    openInInstance(threadId);
  }
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    try { return { ownerId: await probe(), opened: true }; } catch { /* still loading */ }
  }
  throw new Fail('not-loaded-in-app', 'opened the thread link but the app did not take ownership within 30s');
}

// ---------- Commands ----------

// Sets a thread's access the way the composer's selector does. The app reloads
// threads under a restricted profile after a restart (workspace write, network
// off), which breaks builds, the Simulator and localhost services until access
// is restored. With no turn running, the setting applies from the next turn.
async function access(threadId, mode, { open = true } = {}) {
  const threadSettings = ACCESS_PRESETS[mode];
  if (!threadSettings) throw new Fail('invalid-access-mode', `${mode}; expected one of: ${Object.keys(ACCESS_PRESETS).join(', ')}`);
  const t = locate(threadId);
  let appOwner = null;
  try { appOwner = await withIpc(ipc => owner(ipc, threadId), 3000); } catch { /* not app-owned */ }
  if (!appOwner && await daemonHolds(threadId)) {
    throw new Fail('daemon-thread', 'this thread is a terminal session on the shared app-server daemon; set its access in that terminal');
  }
  const { ownerId, opened } = appOwner ? { ownerId: appOwner, opened: false } : await ensureLoaded(threadId, { open });
  const s = turnState(t.rollout_path);
  return withIpc(async ipc => {
    const res = await ipc.request('thread-follower-update-thread-settings', {
      conversationId: threadId, threadSettings, activeTurnId: s.status === 'active' ? s.turnId : null, condition: null,
    }, ownerId);
    const applied = res.result?.result?.applied ?? res.result?.applied;
    return { threadId, mode, applied: applied === true, appliedTo: s.status === 'active' ? 'current-turn' : 'next-turn', openedInApp: opened };
  }, 15000);
}

// A thread held by the shared daemon (a terminal CLI session) is driven through the
// daemon, on the instance it already holds: steer requires the daemon's active turn id,
// so a message can never land in a different turn or start a parallel one.
async function sendViaDaemon(threadId, text, { steer, wait, timeoutMs }) {
  let result = await withDaemon(async d => {
    const turn = await daemonLatestTurn(d, threadId);
    const input = [{ type: 'text', text, text_elements: [] }];
    if (turn?.status === 'inProgress') {
      if (!steer) throw new Fail('thread-busy', busyHint(turn.id));
      const r = await d.request('turn/steer', { threadId, expectedTurnId: turn.id, input, clientUserMessageId: randomUUID() });
      return { mode: 'steer', turnId: r.turnId ?? turn.id };
    }
    const r = await d.request('turn/start', { threadId, input, clientUserMessageId: randomUUID() });
    if (typeof r.turn?.id !== 'string') throw new Fail('invalid-start-turn-response', JSON.stringify(r).slice(0, 300));
    return { mode: 'start', turnId: r.turn.id };
  }, 15000);
  result = { accepted: true, threadId, via: 'daemon', ...result };
  if (wait && result.turnId) {
    const done = await waitIdle(threadId, { turnId: result.turnId, timeoutMs });
    result = { ...result, turnStatus: done.lastTurnStatus, lastAgentMessage: done.lastAgentMessage };
  }
  return result;
}

async function send(threadId, text, { steer = false, wait = false, timeoutMs, open = true } = {}) {
  if (!text || !text.trim()) throw new Fail('empty-message');
  const t = locate(threadId);
  // Route first: an app-owned thread uses the app's IPC; a thread the shared daemon holds
  // (a terminal session) uses the daemon. Only a thread neither holds is opened in the app.
  let appOwner = null;
  try { appOwner = await withIpc(ipc => owner(ipc, threadId), 3000); } catch { /* not app-owned */ }
  if (!appOwner && await daemonHolds(threadId)) return sendViaDaemon(threadId, text, { steer, wait, timeoutMs });
  const { ownerId, opened } = appOwner ? { ownerId: appOwner, opened: false } : await ensureLoaded(threadId, { open });
  // Read state only after loading: opening can start a turn for queued messages.
  // Codex has been seen to lose a large thread's session file while the thread keeps running
  // in the app. The app still accepts messages by thread id, so without the file, --steer
  // means "steer the running turn" and its absence means "start a turn".
  const s = fs.existsSync(t.rollout_path) ? turnState(t.rollout_path) : { status: steer ? 'active' : 'idle', turnId: '(session file missing)' };
  return withIpc(async ipc => {
    let result;
    if (s.status === 'active') {
      if (!steer) throw new Fail('thread-busy', busyHint(s.turnId));
      const id = randomUUID();
      const res = await ipc.request('thread-follower-steer-turn', {
        conversationId: threadId, clientUserMessageId: id,
        input: [{ type: 'text', text, text_elements: [] }],
        restoreMessage: { id, text, context: {} },
      }, ownerId);
      result = { mode: 'steer', turnId: res.result?.result?.turnId ?? null };
    } else {
      const res = await ipc.request('thread-follower-start-turn', {
        conversationId: threadId,
        turnStart: {
          request: { threadId, clientUserMessageId: randomUUID(), input: [{ type: 'text', text, text_elements: [] }] },
          context: { inheritThreadSettings: true },
        },
      }, ownerId);
      const turnId = res.result?.result?.turn?.id;
      if (typeof turnId !== 'string') throw new Fail('invalid-start-turn-response', JSON.stringify(res.result).slice(0, 300));
      result = { mode: 'start', turnId };
    }
    result = { accepted: true, threadId, ownerClientId: ownerId, openedInApp: opened, ...result };
    if (wait && result.turnId) {
      ipc.close();
      const done = await waitIdle(threadId, { turnId: result.turnId, timeoutMs });
      result = { ...result, turnStatus: done.lastTurnStatus, lastAgentMessage: done.lastAgentMessage };
    }
    return result;
  }, 15000);
}

// Protocol reminders printed with command output (as `rule: ...`), so the rule that governs
// what to do next is in front of the caller at the moment it acts.
const RULES = {
  start: 'new turn: one handoff or follow-up per turn; the RESULT ends it. New work for a busy thread: send --queue.',
  steer: "steer is input for THIS turn's work only (answer its question, correct it). New follow-up work: send --queue, never --steer.",
  queued: 'queued: delivered as a new turn when the running turn ends; `queue <thread>` lists it, `queue <thread> rm <id>` removes it.',
  active: 'active turn: queue new work (send --queue); steer only to answer or correct it. Past its timebox: act on it now.',
  questions: 'answer with send --steer: an answer is input for this turn.',
  done: 'read the full reply and RESULT before acting, and check its claims against the evidence.',
  stalled: "stalled: inspect and act in this turn; don't just wait again.",
  created: 'new thread: track it with a name, and give it one handoff with its timebox.',
};
const busyHint = turnId => `turn ${turnId} is running. New work: --queue (delivered when it ends). --steer only to answer or correct this turn.`;

// A per-thread follow-up queue. A message queued for a busy thread is delivered as a new turn
// when the running turn ends, one message per turn, by a detached deliverer (one per thread).
const QUEUE_DIR = path.join(os.homedir(), '.codex', 'codex-app-link-queue');
const queueFile = id => path.join(QUEUE_DIR, `${id}.json`);
function readQueue(id) {
  try { return JSON.parse(fs.readFileSync(queueFile(id), 'utf8')); } catch { return []; }
}
function writeQueue(id, items) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  const tmp = `${queueFile(id)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 1));
  fs.renameSync(tmp, queueFile(id));
}
function delivererAlive(id) {
  try { const pid = Number(fs.readFileSync(`${queueFile(id)}.lock`, 'utf8')); process.kill(pid, 0); return pid; } catch { return 0; }
}
function startDeliverer(id) {
  if (delivererAlive(id)) return;
  const child = spawn(process.execPath, [new URL(import.meta.url).pathname, 'deliver', id],
    { detached: true, stdio: 'ignore' });
  child.unref();
}
function enqueue(threadId, text, turnId) {
  const items = readQueue(threadId);
  const item = { id: randomUUID().slice(0, 8), queuedAt: new Date().toISOString(), afterTurn: turnId, text };
  items.push(item);
  writeQueue(threadId, items);
  startDeliverer(threadId);
  return { accepted: true, threadId, mode: 'queued', queueId: item.id, position: items.length, afterTurn: turnId };
}
async function deliver(threadId) {
  const lock = `${queueFile(threadId)}.lock`;
  if (delivererAlive(threadId)) return;
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  fs.writeFileSync(lock, String(process.pid));
  try {
    for (;;) {
      if (!readQueue(threadId).length) return;
      const w = await waitIdle(threadId, { settleMs: 20_000, timeoutMs: 24 * 3600_000 });
      if (w.result !== 'done') continue;
      const items = readQueue(threadId);
      if (!items.length) return;
      try { await send(threadId, items[0].text, {}); }
      catch (e) { if (e.code === 'thread-busy') continue; throw e; }
      writeQueue(threadId, readQueue(threadId).filter(x => x.id !== items[0].id));
    }
  } finally { try { if (Number(fs.readFileSync(lock, 'utf8')) === process.pid) fs.unlinkSync(lock); } catch { /* gone */ } }
}

// New thread via the CLI. The CLI runs the first turn and exits, which releases
// the thread so the desktop app can load it.
async function create({ cwd, prompt, extra = [], timeoutMs }) {
  if (!cwd || !fs.existsSync(cwd)) throw new Fail('invalid-cwd', cwd);
  if (!prompt || !prompt.trim()) throw new Fail('empty-prompt');
  const args = ['exec', '--json', '-C', cwd, ...extra, prompt];
  return new Promise((resolve, reject) => {
    const child = spawn(CODEX_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let threadId = null, finalMessage = null, err = '', out = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Fail('create-timeout')); }, timeoutMs ?? 30 * 60_000);
    child.stdout.on('data', d => {
      out += d.toString();
      let i;
      while ((i = out.indexOf('\n')) >= 0) {
        const line = out.slice(0, i); out = out.slice(i + 1);
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'thread.started') threadId = ev.thread_id;
          if (ev.type === 'item.completed' && ev.item?.type === 'agent_message') finalMessage = ev.item.text;
        } catch { /* non-JSON noise */ }
      }
    });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('close', code => {
      clearTimeout(timer);
      if (!threadId) return reject(new Fail('no-thread-id', err.trim().split('\n').slice(-3).join(' | ')));
      resolve({ threadId, exitCode: code, cwd, finalMessage });
    });
  });
}

// ---------- Manager kit: registry, results, watch ----------

// A per-project registry names the threads a manager tracks, so commands take
// `sol-b` instead of a UUID and `watch --tracked` knows what to follow. It lives
// at the git root as .codex-app-link.json (override: --registry or
// CODEX_APP_LINK_REGISTRY), so every manager of the project shares it.
function registryPath(opt = {}) {
  if (opt.registry) return path.resolve(String(opt.registry));
  if (process.env.CODEX_APP_LINK_REGISTRY) return path.resolve(process.env.CODEX_APP_LINK_REGISTRY);
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return path.join(r.status === 0 ? r.stdout.trim() : process.cwd(), '.codex-app-link.json');
}

function loadRegistry(file) {
  try {
    const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...reg, threads: Array.isArray(reg.threads) ? reg.threads : [] };
  } catch { return { threads: [] }; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveRef(ref, reg) {
  if (ref === undefined) throw new Fail('missing-thread', 'pass a thread ID or a tracked name');
  if (UUID.test(ref)) return ref;
  const hit = reg.threads.find(t => t.name.toLowerCase() === String(ref).toLowerCase());
  if (!hit) throw new Fail('unknown-thread-name', `${ref} is not in the registry; run "track list"`);
  return hit.id;
}

const nameOf = (id, reg) => reg.threads.find(t => t.id === id)?.name ?? id.slice(0, 8);

function track(action, pos, opt, file) {
  const reg = loadRegistry(file);
  if (action === 'add') {
    const id = pos[0];
    if (!UUID.test(id || '')) throw new Fail('invalid-thread-id', id);
    if (!opt.name || opt.name === true) throw new Fail('missing-name', 'track add <id> --name NAME [--role ROLE] [--note TEXT]');
    locate(id);
    const entry = { id, name: String(opt.name), role: opt.role ? String(opt.role) : null, note: opt.note ? String(opt.note) : null,
      added: new Date().toISOString() };
    reg.threads = reg.threads.filter(t => t.id !== id && t.name.toLowerCase() !== entry.name.toLowerCase());
    reg.threads.push(entry);
  } else if (action === 'rm') {
    const before = reg.threads.length;
    reg.threads = reg.threads.filter(t => t.name.toLowerCase() !== String(pos[0]).toLowerCase() && t.id !== pos[0]);
    if (reg.threads.length === before) throw new Fail('unknown-thread-name', pos[0]);
  } else if (action !== 'list') {
    throw new Fail('invalid-track-action', 'track add|rm|list');
  }
  if (action !== 'list') fs.writeFileSync(file, JSON.stringify(reg, null, 2) + '\n');
  return reg.threads.map(t => {
    let s = { status: 'unknown' };
    try { s = turnState(locate(t.id).rollout_path); } catch (e) { s = { status: e.code || 'error' }; }
    return { name: t.name, id: t.id, role: t.role, status: s.status, note: t.note };
  });
}

// RESULT blocks: the line that starts with the marker, plus the key=value lines
// and indented continuations after it, inside or outside a code fence. A space
// followed by `key=` starts a new field, so `branch=x head=y` splits in two.
const KEY_START = /\s+(?=[A-Za-z_][\w.-]*=)/;

function extractResult(text, marker = 'RESULT') {
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

function latestResult(rolloutPath, marker, turns = 10) {
  const done = completedTurns(rolloutPath, turns).filter(t => t.message);
  for (const t of done.reverse()) {
    const r = extractResult(t.message, marker);
    if (r) return { turnId: t.turnId, completedAt: t.completedAt, ...r };
  }
  return null;
}

// watch: one event stream for many threads, one line per event, for a
// background monitor. Events:
//   STARTED   a turn began (also after compaction or a resume)
//   QUESTION  a formal request_user_input* question, with options; answer with send --steer.
//             Also found by re-checking the running turn for pending questions whenever the file grows.
//   APPROVAL  an approval-request event
//   COMPACTED the thread compacted its context
//   MAINTENANCE a configured maintenance controller paused or resumed the worker (see AUTOMATION)
//   RESULT    a reply matching --expect, reported when it is written (mid-turn too), one line per match
//   PAUSED    the thread settled idle WITHOUT matching --expect: it stopped short, so resume it
//   DONE      the thread settled idle (no --expect given)
//   STALLED   active, but no session write for --stall seconds (verify before acting)
//   MISSING   the thread's session file is gone (reported once; other threads keep being watched)
//   FOUND     a missing session file is available again; read the thread for anything missed
//   UNPARSED  a complete session line failed to parse; an event may be lost, so read the thread
// --cursor FILE saves offsets and turn state after every poll, so a re-armed watch
// continues exactly where the last one stopped and misses nothing in between.
async function watch(ids, reg, { expect = null, settleMs = 45_000, stallMs = 45 * 60_000, pollMs = 5_000,
  timeoutMs = null, cursorFile = null } = {}) {
  const expectRe = expect ? new RegExp(expect, 'm') : null;
  if (cursorFile) {
    // Two watches sharing a cursor each advance it past events the other then never reports.
    const lock = `${cursorFile}.lock`;
    let holder = null;
    try { holder = Number(fs.readFileSync(lock, 'utf8')); } catch { /* no lock */ }
    if (holder && holder !== process.pid) {
      let alive = false;
      try { process.kill(holder, 0); alive = true; } catch { /* stale lock */ }
      if (alive) throw new Fail('cursor-in-use', `another watch (pid ${holder}) is using ${cursorFile}; stop it first`);
    }
    fs.writeFileSync(lock, String(process.pid));
    const release = () => { try { if (Number(fs.readFileSync(lock, 'utf8')) === process.pid) fs.unlinkSync(lock); } catch { /* gone */ } };
    process.on('exit', release);
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { release(); process.exit(130); });
  }
  const saved = cursorFile && fs.existsSync(cursorFile) ? JSON.parse(fs.readFileSync(cursorFile, 'utf8')) : {};
  const threads = ids.map(id => {
    const file = locate(id).rollout_path;
    const prev = saved[id];
    if (!fs.existsSync(file)) {
      // The session file is gone (seen when Codex dropped a large rollout). Keep watching the
      // other threads; MISSING is reported once and FOUND if the file comes back.
      return { id, file, offset: 0, active: false, lastMessage: null, idleSince: null,
        classified: true, stallWarned: false, missing: true, missingWarned: false };
    }
    if (prev && prev.file === file && prev.offset <= fs.statSync(file).size) return { id, ...prev };
    const s = turnState(file);
    return { id, file, offset: fs.statSync(file).size, active: s.status === 'active', lastMessage: s.lastAgentMessage,
      idleSince: null, classified: true, stallWarned: false };
  });
  const WATCH_RULES = { QUESTION: RULES.questions, STALLED: RULES.stalled, DONE: RULES.done, PAUSED: RULES.done };
  const emit = (t, kind, detail = '') => {
    const ts = new Date().toISOString().slice(11, 19);
    const rule = WATCH_RULES[kind] ? ` | rule: ${WATCH_RULES[kind]}` : '';
    console.log(`${ts} ${kind} ${nameOf(t.id, reg)}${detail ? ` ${String(detail).replace(/\s+/g, ' ').slice(0, 380)}` : ''}${rule}`);
  };
  // Every matching line is a result: one reply can close several pieces of work.
  const emitResults = (t, msg) => {
    const lines = msg.split('\n').filter(l => expectRe.test(l));
    for (const line of lines.length ? lines : [msg.slice(0, 300)]) emit(t, 'RESULT', line);
  };
  const deadline = timeoutMs ? Date.now() + timeoutMs : Infinity;
  for (;;) {
    for (const t of threads) {
      if (!fs.existsSync(t.file)) {
        let relocated = null;
        try { relocated = locate(t.id).rollout_path; } catch { /* index unavailable */ }
        if (relocated && relocated !== t.file && fs.existsSync(relocated)) {
          t.file = relocated;
        } else {
          if (!t.missingWarned) {
            t.missingWarned = true; t.missing = true;
            emit(t, 'MISSING', `session file not found: ${t.file}; check the thread in the app`);
          }
          continue;
        }
      }
      if (t.missing) {
        // Read from the file's current end: replaying a rebuilt history would repeat old events.
        t.missing = false; t.missingWarned = false; t.offset = fs.statSync(t.file).size;
        emit(t, 'FOUND', `session file available again: ${t.file}; read the thread for anything missed`);
      }
      const size = fs.statSync(t.file).size;
      if (size > t.offset) {
        const fd = fs.openSync(t.file, 'r');
        const want = Buffer.alloc(size - t.offset);
        const got = fs.readSync(fd, want, 0, want.length, t.offset);
        fs.closeSync(fd);
        const buf = want.subarray(0, got); // a read can return fewer bytes than the size reported
        // offset always marks the end of the last complete line, so a line still being written
        // is simply read again next poll, as after a restart. Only complete lines are decoded:
        // a read can also end inside a multi-byte character.
        const end = buf.lastIndexOf(0x0a) + 1;
        t.offset += end;
        const lines = buf.subarray(0, end).toString('utf8').split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          let rec;
          try { rec = JSON.parse(line); } catch (e) {
            // A complete line that fails to parse means a lost event: never drop it silently.
            emit(t, 'UNPARSED', `${line.length} chars at offset ${t.offset}: ${e.message}`);
            continue;
          }
          const p = rec.payload || {};
          if (rec.type === 'compacted') emit(t, 'COMPACTED');
          if (rec.type === 'event_msg' && p.type === 'task_started') {
            t.active = true; t.classified = false; t.idleSince = null; t.stallWarned = false; t.reported = [];
            t.turnStartedAt = Date.parse(rec.timestamp) || Date.now();
            emit(t, 'STARTED', `turn=${p.turn_id}`);
          } else if (rec.type === 'event_msg' && (p.type === 'task_complete' || p.type === 'turn_aborted')) {
            // Every completion is classified once, even for a turn that began before this watch.
            t.active = false; t.idleSince = Date.now(); t.classified = false;
            if (p.type === 'task_complete') t.lastMessage = p.last_agent_message ?? t.lastMessage;
            // A reply that matches --expect is reported at once: a maintenance or chained turn
            // starting inside the settle window would otherwise hide it. Settle still applies
            // to replies that don't match, where a following turn may yet finish the work.
            t.lastSeenEnd = p.turn_id ?? t.lastSeenEnd;
            if (expectRe && p.type === 'task_complete' && typeof p.last_agent_message === 'string'
              && expectRe.test(p.last_agent_message)) {
              t.classified = true;
              // Already reported when it was written mid-turn (below): don't repeat it.
              if (!(t.reported || []).includes(p.last_agent_message)) {
                emitResults(t, p.last_agent_message);
                t.reported = [...(t.reported || []), p.last_agent_message];
              }
            }
          } else if (rec.type === 'response_item' && p.type === 'message' && p.role === 'assistant'
            && expectRe && expectRe.test(userText(p))) {
            // A worker can finish one piece of work and carry on in the same turn (for example,
            // queued work steered into it). Its result is reported the moment it is written,
            // not only when the turn ends.
            const text = userText(p);
            t.reported = [...(t.reported || []), text];
            emitResults(t, text);
          } else if (rec.type === 'response_item' && p.type === 'message' && p.role === 'user'
            && automationKind(userText(p))) {
            // A maintenance controller normally resumes after its own pause, but it may decide the work
            // is done and skip the resume. PAUSED then catches a wrong call.
            emit(t, 'MAINTENANCE', automationKind(userText(p)) === 'pause' ? 'pause requested' : 'resume sent');
          } else if (rec.type === 'event_msg' && String(p.type || '').toLowerCase().includes('approval')) {
            emit(t, 'APPROVAL', p.type);
          } else if (rec.type === 'response_item' && p.type === 'function_call' && String(p.name || '').startsWith('request_user_input')) {
            let qs = [];
            try { qs = JSON.parse(p.arguments || '{}').questions || []; } catch { /* malformed */ }
            t.askedIds = [...(t.askedIds || []), p.call_id];
            for (const q of qs) {
              const opts = (q.options || []).map(o => (typeof o === 'string' ? o : o.label ?? JSON.stringify(o)));
              emit(t, 'QUESTION', `${q.title ?? ''}${opts.length ? ` [options: ${opts.join(' | ')}]` : ''}`);
            }
          }
        }
      }
      // Safety net: the incremental read has been seen to pass records without reporting them
      // (a replay of the same file reports them). Whenever the file grows, ask it directly what
      // the current turn is, which questions are pending and how the last turn ended, exactly as
      // the status and questions commands do, and report anything not yet reported.
      if (size !== t.checkedAt) {
        t.checkedAt = size;
        const st = turnState(t.file);
        if (st.status === 'active') {
          t.turnStartedAt = st.startedAt ?? t.turnStartedAt ?? 0;
          for (const q of pendingQuestions(t.file, t.turnStartedAt)) {
            if ((t.askedIds || []).includes(q.callId)) continue;
            t.askedIds = [...(t.askedIds || []), q.callId];
            for (const item of q.questions) {
              emit(t, 'QUESTION', `${item.title}${item.options.length ? ` [options: ${item.options.join(' | ')}]` : ''}`);
            }
          }
        } else if (st.status === 'idle' && st.lastTurnId && st.lastTurnId !== t.lastSeenEnd) {
          t.lastSeenEnd = st.lastTurnId;
          const msg = st.lastAgentMessage || '';
          if (t.active) { t.active = false; t.idleSince = Date.now(); t.classified = false; t.lastMessage = msg; }
          if (expectRe && expectRe.test(msg) && !(t.reported || []).includes(msg)) {
            emitResults(t, msg);
            t.reported = [...(t.reported || []), msg];
            t.classified = true;
          }
        }
      }
      const now = Date.now();
      if (!t.active && t.idleSince && !t.classified && now - t.idleSince >= settleMs) {
        t.classified = true;
        const msg = t.lastMessage || '';
        if (!expectRe) emit(t, 'DONE', msg.slice(0, 300));
        else if (expectRe.test(msg)) { if (!(t.reported || []).includes(msg)) emitResults(t, msg); }
        else emit(t, 'PAUSED', msg.slice(0, 300));
      }
      if (t.active && !t.stallWarned && now - fs.statSync(t.file).mtimeMs >= stallMs) {
        t.stallWarned = true;
        emit(t, 'STALLED', `no session write for ${Math.round((now - fs.statSync(t.file).mtimeMs) / 1000)}s; verify before acting`);
      }
    }
    if (cursorFile) {
      const state = Object.fromEntries(threads.map(({ id, reported, ...rest }) => [id, rest]));
      fs.writeFileSync(cursorFile, JSON.stringify(state));
    }
    if (Date.now() >= deadline) return;
    await sleep(pollMs);
  }
}

// ---------- CLI ----------

function parse(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { opt._rest = argv.slice(i + 1); break; }
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) opt[k] = true; else { opt[k] = v; i++; }
    } else pos.push(a);
  }
  return { pos, opt };
}

function textArg(opt) {
  if (opt.file) return fs.readFileSync(opt.file, 'utf8');
  if (typeof opt.text === 'string') return opt.text;
  if (opt.stdin) return fs.readFileSync(0, 'utf8');
  return null;
}

const USAGE = `codex-thread <command>     (<thread> = a thread ID or a name from "track")
  status  <thread>                         turn state, last reply, whether the app has it loaded
  read    <thread> [--last N]              last N completed turns' final replies (default 1)
  wait    <thread> [--timeout SEC=10800] [--settle SEC=45] [--stall SEC=2700] [--poll SEC=15] [--turn ID]
          [--until-question] [--expect REGEX]
                                           block until the THREAD is idle for --settle seconds; prints
                                           result done|stalled|timeout (exit 0|3|4) plus lastAgentMessage.
                                           --until-question: also return result=question (exit 5) when the
                                           thread asks a new formal question; answer it with send --steer.
                                           --expect: a finish whose last reply doesn't match REGEX is
                                           result=paused (exit 6), meaning it stopped short and needs a resume
  questions <thread> [--all] [--since ISO] formal questions (request_user_input*); unanswered by default.
                                           Exit 5 if any are pending
  result  <thread> [--marker RESULT] [--turns N]
                                           the latest RESULT block in the last N replies (default 10),
                                           parsed into key=value fields. Exit 6 if there is none
  watch   (<thread>... | --tracked) [--expect REGEX] [--settle SEC=45] [--stall SEC=2700] [--poll SEC=5]
          [--cursor FILE] [--timeout SEC] [--pause-pattern RE] [--resume-pattern RE]
                                           one line per event across threads: STARTED QUESTION APPROVAL
                                           COMPACTED MAINTENANCE RESULT PAUSED DONE STALLED. --cursor resumes exactly
                                           where the last watch stopped
  track   add <id> --name NAME [--role ROLE] [--note TEXT] | rm <name> | list   [--registry FILE]
                                           the project's thread registry (<git root>/.codex-app-link.json)
  send    <thread> (--text T | --file F | --stdin) [--steer] [--wait] [--timeout SEC] [--no-open]
  new     --cwd DIR (--text T | --file F) [--no-open] [--timeout SEC] [-- <extra codex exec args>]
  open    <thread>                         make the app load the thread (background deep link)
  access  <thread> full [--no-open]        set the thread's access like the composer's selector (Full access);
                                           applies from the next turn, or to the running turn
  list    [--limit N] [--cwd DIR]          recent threads from the local index
  version                                  plugin version and this script's path`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, opt } = parse(rest);
  const timeoutMs = opt.timeout ? Number(opt.timeout) * 1000 : undefined;
  const regFile = registryPath(opt);
  const reg = loadRegistry(regFile);
  configureAutomation(reg, opt);
  if (['status', 'read', 'wait', 'questions', 'result', 'send', 'open', 'access', 'queue', 'deliver'].includes(cmd)) pos[0] = resolveRef(pos[0], reg);
  let out;
  switch (cmd) {
    case 'status': out = await status(pos[0]); break;
    case 'read': {
      const t = locate(pos[0]);
      out = { threadId: pos[0], turns: completedTurns(t.rollout_path, Number(opt.last || 1)) };
      break;
    }
    case 'wait': {
      const sec = k => (opt[k] !== undefined ? Number(opt[k]) * 1000 : undefined);
      out = await waitIdle(pos[0], { turnId: opt.turn || null, timeoutMs, settleMs: sec('settle'), stallMs: sec('stall'),
        pollMs: sec('poll'), untilQuestion: !!opt['until-question'] });
      if (out.result === 'done' && typeof opt.expect === 'string' && !new RegExp(opt.expect, 'm').test(out.lastAgentMessage || '')) {
        out = { ...out, result: 'paused' };
      }
      // exit codes: 0 done, 3 stalled, 4 timeout, 5 question, 6 paused (output is printed in every case)
      process.exitCode = { stalled: 3, timeout: 4, question: 5, paused: 6 }[out.result] ?? 0;
      out = { ...out, rule: { done: RULES.done, paused: RULES.done, stalled: RULES.stalled, question: RULES.questions }[out.result] ?? null };
      break;
    }
    case 'result': {
      const marker = typeof opt.marker === 'string' ? opt.marker : 'RESULT';
      const r = latestResult(locate(pos[0]).rollout_path, marker, Number(opt.turns || 10));
      if (!r) { out = { result: 'none', marker }; process.exitCode = 6; break; }
      out = opt.json ? r : `${Object.entries(r.fields).map(([k, v]) => `${k}=${v}`).join('\n')}\nrule: ${RULES.done}`;
      break;
    }
    case 'watch': {
      const ids = opt.tracked ? reg.threads.map(t => t.id) : pos.map(r => resolveRef(r, reg));
      if (!ids.length) throw new Fail('nothing-to-watch', 'pass thread IDs or names, or --tracked with a registry');
      const sec = k => (opt[k] !== undefined ? Number(opt[k]) * 1000 : undefined);
      await watch(ids, reg, { expect: typeof opt.expect === 'string' ? opt.expect : null, settleMs: sec('settle'),
        stallMs: sec('stall'), pollMs: sec('poll'), timeoutMs, cursorFile: typeof opt.cursor === 'string' ? path.resolve(opt.cursor) : null });
      return;
    }
    case 'track': out = track(pos[0], pos.slice(1), opt, regFile); break;
    case 'version': {
      const here = path.dirname(new URL(import.meta.url).pathname);
      let version = 'unknown';
      try { version = JSON.parse(fs.readFileSync(path.join(here, '../../../.claude-plugin/plugin.json'), 'utf8')).version; } catch { /* not in a plugin */ }
      out = { version, script: new URL(import.meta.url).pathname, registry: regFile };
      break;
    }
    case 'questions': {
      const t = locate(pos[0]);
      const since = opt.since ? Date.parse(opt.since) : 0;
      if (opt.since && Number.isNaN(since)) throw new Fail('invalid-since', opt.since);
      const all = questionsIn(t.rollout_path, since);
      const shown = opt.all ? all : all.filter(q => !q.answeredAt);
      const pending = all.filter(q => !q.answeredAt).length;
      out = opt.json ? { threadId: pos[0], pending, questions: shown }
        : { pending, asked: all.length, message: shown.length ? formatQuestions(shown) : null, rule: pending ? RULES.questions : null };
      process.exitCode = pending ? 5 : 0;
      break;
    }
    case 'send': {
      if (opt.queue && opt.steer) throw new Fail('queue-or-steer', 'pass --queue (new work) or --steer (input for this turn), not both');
      const text = textArg(opt);
      try { out = await send(pos[0], text, { steer: !!opt.steer, wait: !!opt.wait, timeoutMs, open: !opt['no-open'] }); }
      catch (e) {
        if (!(opt.queue && e.code === 'thread-busy')) throw e;
        out = enqueue(pos[0], text, turnState(locate(pos[0]).rollout_path).turnId);
      }
      out = { ...out, rule: RULES[out.mode === 'start' ? 'start' : out.mode] ?? null };
      break;
    }
    case 'queue': {
      const items = readQueue(pos[0]);
      if (pos[1] === 'rm') { writeQueue(pos[0], items.filter(x => x.id !== pos[2])); out = { removed: pos[2], queued: items.length - 1 }; break; }
      if (pos[1] === 'clear') { writeQueue(pos[0], []); out = { cleared: items.length }; break; }
      if (items.length) startDeliverer(pos[0]);
      out = items.length ? items.map(x => ({ queueId: x.id, queuedAt: x.queuedAt, afterTurn: x.afterTurn,
        message: x.text.replace(/\s+/g, ' ').slice(0, 160) })) : { queued: 0 };
      break;
    }
    case 'deliver': await deliver(pos[0]); return;
    case 'open': out = { threadId: pos[0], ...(await ensureLoaded((locate(pos[0]), pos[0]))) }; break;
    case 'access': out = await access(pos[0], pos[1], { open: !opt['no-open'] }); break;
    case 'new': {
      const created = await create({ cwd: opt.cwd, prompt: textArg(opt), extra: opt._rest || [], timeoutMs });
      let loaded = { ownerId: null, opened: false }, loadError = null;
      if (!opt['no-open']) {
        try { loaded = await ensureLoaded(created.threadId); } catch (e) { loadError = e.code || e.message; }
      }
      out = { ...created, loadedInApp: !!loaded.ownerId, ownerClientId: loaded.ownerId, loadError, rule: RULES.created };
      break;
    }
    case 'list': {
      const sql = `SELECT id, title, cwd, datetime(updated_at,'unixepoch') AS updated FROM threads
        WHERE archived = 0 ${opt.cwd ? 'AND cwd = ?' : ''} ORDER BY updated_at DESC LIMIT ?`;
      out = query(sql, ...(opt.cwd ? [String(opt.cwd)] : []), Number(opt.limit || 10));
      if (!opt.json) out = out.map(r => ({ id: r.id, updated: r.updated, name: JSON.stringify(String(r.title || '').replace(/\s+/g, ' ').slice(0, 70)) }));
      break;
    }
    default: console.error(USAGE); process.exit(2);
  }
  console.log(opt.json ? JSON.stringify(out) : toText(out));
}

// Compact default output (token-cheap for agents): scalar fields as one
// `key=value` line, then any agent message / reply text raw, unescaped.
// Bulky or rarely needed fields are dropped; use --json for everything.
const OMIT = new Set(['rolloutPath', 'title', 'cwd', 'model', 'archived', 'ownerClientId', 'threadId']);
const TEXT_FIELDS = ['lastAgentMessage', 'finalMessage', 'message'];
function toText(out) {
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

main().catch(e => { console.error(JSON.stringify({ error: e.code || 'error', message: e.message })); process.exit(1); });
