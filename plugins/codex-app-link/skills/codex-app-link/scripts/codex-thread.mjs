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
// Prefer the CLI bundled with the desktop app: it matches the app's version and
// supports the same models. An older `codex` on PATH may reject the configured model.
const APP_CODEX = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';
const CODEX_BIN = process.env.CODEX_BIN || (fs.existsSync(APP_CODEX) ? APP_CODEX : 'codex');
const PROTOCOL = {
  initialize: 0,
  'thread-owner-discovery': 1,
  'thread-follower-start-turn': 2,
  'thread-follower-steer-turn': 1,
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

// Turn state from the rollout: task_started => busy; task_complete/turn_aborted => idle.
function turnState(rolloutPath) {
  const state = { status: 'unknown', turnId: null, lastTurnId: null, lastTurnStatus: null, lastAgentMessage: null, completedTurns: 0 };
  const lines = fs.readFileSync(rolloutPath, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; } // a partially written last line
    if (rec.type !== 'event_msg') continue;
    const p = rec.payload || {};
    if (p.type === 'task_started') {
      state.status = 'active'; state.turnId = p.turn_id; state.lastTurnId = p.turn_id; state.lastTurnStatus = 'inProgress';
    } else if (p.type === 'task_complete' || p.type === 'turn_aborted') {
      if (state.turnId && p.turn_id && p.turn_id !== state.turnId) continue;
      state.status = 'idle'; state.lastTurnId = p.turn_id ?? state.turnId; state.turnId = null;
      state.lastTurnStatus = p.type === 'task_complete' ? 'completed' : 'aborted';
      if (p.type === 'task_complete') { state.completedTurns++; state.lastAgentMessage = p.last_agent_message ?? null; }
    }
  }
  return state;
}

function completedTurns(rolloutPath) {
  const turns = [];
  for (const line of fs.readFileSync(rolloutPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const p = rec.payload || {};
    if (rec.type === 'event_msg' && (p.type === 'task_complete' || p.type === 'turn_aborted')) {
      turns.push({ turnId: p.turn_id, status: p.type === 'task_complete' ? 'completed' : 'aborted', completedAt: p.completed_at ?? rec.timestamp, message: p.last_agent_message ?? null });
    }
  }
  return turns;
}

async function status(threadId, { needOwner = true } = {}) {
  const t = locate(threadId);
  const s = turnState(t.rollout_path);
  let ownerClientId = null, ownerError = null;
  if (needOwner) {
    try { ownerClientId = await withIpc(ipc => owner(ipc, threadId)); }
    catch (e) { ownerError = e.code || e.message; }
  }
  return { threadId, title: t.title, cwd: t.cwd, model: t.model, archived: !!t.archived, rolloutPath: t.rollout_path,
    ...s, loadedInApp: !!ownerClientId, ownerClientId, ownerError };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Wait until the THREAD is done, not a particular turn. Codex often chains turns
// (compaction, auto-continue), and a turn can end without a normal completion
// event, so pinning to a turn ID can hang forever. Rules:
// - done   = thread idle continuously for `settleMs` (absorbs chained turns);
//            if `turnId` is given, any later turn also counts as that turn done.
// - stalled = thread claims active but its rollout file has not been written
//            for `stallMs` (dead or wedged turn): return instead of hanging.
// - timeout = overall deadline reached.
// Always returns a result object (never throws on timeout) so callers see state.
async function waitIdle(threadId, { turnId = null, timeoutMs = 3 * 3600_000, pollMs = 15_000,
  settleMs = 45_000, stallMs = 45 * 60_000 } = {}) {
  const t = locate(threadId);
  const started = Date.now();
  const deadline = started + timeoutMs;
  let idleSince = null;
  for (;;) {
    const s = turnState(t.rollout_path);
    const now = Date.now();
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
async function ensureLoaded(threadId, { open = true } = {}) {
  const probe = () => withIpc(ipc => owner(ipc, threadId), 3000);
  try { return { ownerId: await probe(), opened: false }; }
  catch (e) { if (!open || !['request-timeout', 'no-client-found'].includes(e.code)) throw e; }
  const r = spawnSync('open', ['-g', `codex://threads/${threadId}`]);
  if (r.status !== 0) throw new Fail('open-failed', String(r.stderr || '').trim());
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    try { return { ownerId: await probe(), opened: true }; } catch { /* still loading */ }
  }
  throw new Fail('not-loaded-in-app', 'opened the thread link but the app did not take ownership within 30s');
}

// ---------- Commands ----------

async function send(threadId, text, { steer = false, wait = false, timeoutMs, open = true } = {}) {
  if (!text || !text.trim()) throw new Fail('empty-message');
  const t = locate(threadId);
  const { ownerId, opened } = await ensureLoaded(threadId, { open });
  // Read state only after loading: opening can start a turn for queued messages.
  const s = turnState(t.rollout_path);
  return withIpc(async ipc => {
    let result;
    if (s.status === 'active') {
      if (!steer) throw new Fail('thread-busy', `turn ${s.turnId} is running; pass --steer to inject into it, or run "wait" first`);
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

const USAGE = `codex-thread <command>
  status  <threadId>                       turn state, last reply, whether the app has it loaded
  read    <threadId> [--last N]            last N completed turns' final replies (default 1)
  wait    <threadId> [--timeout SEC=10800] [--settle SEC=45] [--stall SEC=2700] [--poll SEC=15] [--turn ID]
                                           block until the THREAD is idle for --settle seconds; prints
                                           result done|stalled|timeout (exit 0|3|4) plus lastAgentMessage
  send    <threadId> (--text T | --file F | --stdin) [--steer] [--wait] [--timeout SEC] [--no-open]
  new     --cwd DIR (--text T | --file F) [--no-open] [--timeout SEC] [-- <extra codex exec args>]
  open    <threadId>                       make the app load the thread (background deep link)
  list    [--limit N] [--cwd DIR]          recent threads from the local index`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, opt } = parse(rest);
  const timeoutMs = opt.timeout ? Number(opt.timeout) * 1000 : undefined;
  let out;
  switch (cmd) {
    case 'status': out = await status(pos[0]); break;
    case 'read': {
      const t = locate(pos[0]);
      out = { threadId: pos[0], turns: completedTurns(t.rollout_path).slice(-Number(opt.last || 1)) };
      break;
    }
    case 'wait': {
      const sec = k => (opt[k] !== undefined ? Number(opt[k]) * 1000 : undefined);
      out = await waitIdle(pos[0], { turnId: opt.turn || null, timeoutMs, settleMs: sec('settle'), stallMs: sec('stall'), pollMs: sec('poll') });
      // exit codes: 0 done, 3 stalled, 4 timeout (output is printed in every case)
      process.exitCode = out.result === 'stalled' ? 3 : out.result === 'timeout' ? 4 : 0;
      break;
    }
    case 'send': out = await send(pos[0], textArg(opt), { steer: !!opt.steer, wait: !!opt.wait, timeoutMs, open: !opt['no-open'] }); break;
    case 'open': out = { threadId: pos[0], ...(await ensureLoaded((locate(pos[0]), pos[0]))) }; break;
    case 'new': {
      const created = await create({ cwd: opt.cwd, prompt: textArg(opt), extra: opt._rest || [], timeoutMs });
      let loaded = { ownerId: null, opened: false }, loadError = null;
      if (!opt['no-open']) {
        try { loaded = await ensureLoaded(created.threadId); } catch (e) { loadError = e.code || e.message; }
      }
      out = { ...created, loadedInApp: !!loaded.ownerId, ownerClientId: loaded.ownerId, loadError };
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
    if (OMIT.has(k) || v === null || v === undefined || v === '') continue;
    if (TEXT_FIELDS.includes(k)) { texts.push(String(v)); continue; }
    if (Array.isArray(v)) { texts.push(v.map(x => (typeof x === 'object' ? toText(x) : String(x))).join('\n---\n')); continue; }
    kv.push(`${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  return [kv.join(' '), ...texts].filter(Boolean).join('\n');
}

main().catch(e => { console.error(JSON.stringify({ error: e.code || 'error', message: e.message })); process.exit(1); });
