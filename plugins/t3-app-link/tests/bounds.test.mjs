import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../skills/t3-app-link/scripts/t3-thread.mjs';
const { Reducer, freshState, recoverHistory, Monitor, requestStatus } = api;

const frame = (sequence, type, payload) => ({ kind: 'event', sequence, event: { threadId: 'thread', type, payload } });
const iso = n => new Date(Date.UTC(2026, 0, 1) + n * 1000).toISOString();
const snapshot = (projection = {}, sequence = 0) => ({ kind: 'snapshot', snapshotSequence: sequence, projection: { thread: { id: 'thread' }, runs: [], messages: [], runtimeRequests: [], turnItems: [], ...projection } });
const size = state => JSON.stringify(state).length;
const results = state => state.pending.filter(e => e.event === 'RESULT').map(e => e.message);
const reducer = (options = {}, state = freshState('thread')) => { const r = new Reducer(state, { expect: '^RESULT ', ...options }); r.accept(snapshot(), 0); r.accept({ kind: 'synchronized' }, 0); return r; };
const item = (n, run) => ({ id: `item-${n}`, runId: run, nodeId: `node-${n}`, ordinal: n, status: 'completed', type: 'command_execution', title: 'x'.repeat(1000), startedAt: iso(n), completedAt: iso(n), updatedAt: iso(n) });
const message = (n, run, text) => ({ id: `message-${n}`, runId: run, role: 'assistant', ordinal: n, text, streaming: false, createdAt: iso(n), updatedAt: iso(n) });
const runRecord = (n, status) => ({ id: `run-${n}`, ordinal: n, status, requestedAt: iso(n), startedAt: iso(n), ...(status === 'completed' ? { completedAt: iso(n) } : {}) });

/** Plays turns of real-shaped events; a drained cursor is what each save writes. */
function play(r, turns, start = 0, itemsPerTurn = 10) {
  let sequence = r.state.sequence ?? 0, n = start * 1000;
  const samples = [];
  for (let turn = start; turn < start + turns; turn++) {
    const run = `run-${turn}`;
    r.accept(frame(++sequence, 'run.created', runRecord(n, 'running')), n);
    r.accept(frame(++sequence, 'run.updated', { ...runRecord(n, 'running'), id: run }), n);
    for (let i = 0; i < itemsPerTurn; i++, n++) {
      r.accept(frame(++sequence, 'node.updated', { id: `node-${n}`, runId: run, title: 'y'.repeat(1000) }), n);
      r.accept(frame(++sequence, 'plan.updated', { id: `plan-${n}`, steps: 'z'.repeat(1000) }), n);
      r.accept(frame(++sequence, 'turn-item.updated', item(n, run)), n);
    }
    r.accept(frame(++sequence, 'message.updated', message(n, run, `RESULT turn=${turn}`)), n);
    r.accept(frame(++sequence, 'run.updated', { ...runRecord(n, 'completed'), id: run }), n);
    samples.push(size({ ...r.state, pending: [] }));
    r.delivered = (r.delivered ?? []).concat(results(r.state));
    r.state.pending = [];
    n += 1;
  }
  return samples;
}

test('cursor size stops growing across tens of thousands of items', () => {
  const r = reducer(), samples = play(r, 3000);
  const early = samples[299], late = samples.at(-1);
  assert.ok(late <= early * 1.05, `grew from ${early} to ${late}`);
  assert.ok(late < 64 * 1024, `settled at ${late} bytes`);
  assert.equal(new Set(r.delivered).size, 3000);
  assert.equal(r.delivered.length, 3000);
});

test('worst-case records stay inside the stated bound', () => {
  const r = reducer(), huge = 'w'.repeat(200000);
  let sequence = 0;
  r.accept(frame(++sequence, 'run.created', { id: 'active', ordinal: 1, status: 'running', startedAt: iso(1) }), 0);
  for (let n = 0; n < 500; n++) {
    r.accept(frame(++sequence, 'turn-item.updated', { ...item(n, 'active'), status: 'running', prompt: huge }), 0);
    r.accept(frame(++sequence, 'runtime-request.updated', { id: `q-${n}`, kind: 'user_input', status: 'pending', nodeId: 'n', answers: { a: huge }, createdAt: iso(n) }), 0);
    r.accept(frame(++sequence, 'message.updated', message(n, 'active', huge)), 0);
  }
  const counted = Object.values(api.LIMITS).reduce((a, b) => a + b, 0);
  assert.ok(size({ ...r.state, pending: [] }) < counted * 8192, 'hard limit');
  for (const collection of ['turnItems', 'runtimeRequests', 'messages']) assert.ok(Object.keys(r.state.records[collection]).length <= api.LIMITS[collection], collection);
});

test('events are neither repeated nor lost across a re-arm with a replayed snapshot', () => {
  const r = reducer(); play(r, 400);
  const restored = new Reducer(JSON.parse(JSON.stringify(r.state)), { expect: '^RESULT ' });
  const oldRows = [...Array(300).keys()].map(turn => message(turn * 11 + 10, `run-${turn}`, `RESULT turn=${turn}`));
  const fresh = message(9000000, 'run-new', 'RESULT turn=new');
  restored.accept(snapshot({ runs: [runRecord(5, 'completed'), { ...runRecord(9000000, 'running'), id: 'run-new' }], messages: [...oldRows, fresh] }, restored.state.sequence + 1), 1);
  assert.deepEqual(results(restored.state), ['RESULT turn=new']);
  assert.deepEqual(restored.state.pending.filter(e => e.event === 'STARTED').map(e => e.turnId), ['run-new']);
});

test('small-gap replay ignores events already applied after a long history', () => {
  const r = reducer(); play(r, 400);
  const before = r.state.sequence, restored = new Reducer(JSON.parse(JSON.stringify(r.state)), { expect: '^RESULT ' });
  restored.accept(frame(before, 'message.updated', message(1, 'run-1', 'RESULT repeat')), 1);
  restored.accept(frame(before + 1, 'message.updated', message(9000000, 'run-x', 'RESULT next')), 1);
  assert.deepEqual(results(restored.state), ['RESULT next']);
});

const row = (n, text) => ({ position: n, visibility: 'local', item: { ...message(n, 'run-new', text), id: `row-${n}`, messageId: `message-${n}`, type: 'assistant_message' } });

test('large-gap recovery resumes from a held anchor after a long history', async () => {
  const r = reducer(); play(r, 400);
  const anchor = { position: 0, visibility: 'local', item: item(399 * 11 + 9, 'run-399') };
  const pages = { older: { items: [anchor, row(9000001, 'RESULT gap=1')], hasMoreHistory: true, nextCursor: 'never' } };
  let fetched = 0;
  const frameBack = snapshot({ visibleTurnItems: [row(9000002, 'RESULT gap=2')] }, r.state.sequence + 50);
  frameBack.historyCursor = 'older'; frameBack.hasMoreHistory = true;
  await recoverHistory({ history: async (_, cursor) => { fetched++; return pages[cursor]; } }, r, frameBack);
  r.accept(frameBack, 1);
  assert.equal(fetched, 1);
  assert.deepEqual(results(r.state), ['RESULT gap=1', 'RESULT gap=2']);
  assert.ok(!r.state.pending.some(e => e.event === 'HISTORY_START'));
});

test('recovery with no surviving anchor reports HISTORY_START', async () => {
  const r = reducer(); play(r, 40);
  const frameBack = snapshot({ visibleTurnItems: [] }, r.state.sequence + 50);
  frameBack.historyCursor = 'a'; frameBack.hasMoreHistory = true;
  await recoverHistory({ history: async () => ({ items: [row(9000001, 'RESULT only=1')], hasMoreHistory: false }) }, r, frameBack);
  r.accept(frameBack, 1);
  assert.deepEqual(r.state.pending.filter(e => ['HISTORY_START', 'RESULT'].includes(e.event)).map(e => e.event).sort(), ['HISTORY_START', 'RESULT']);
});

test('a gap larger than the limits reports every event before pruning', async () => {
  const r = reducer(); play(r, 40);
  const rows = [...Array(1000).keys()].map(n => row(9000000 + n, `RESULT gap=${n}`));
  const held = { position: 0, visibility: 'local', item: { id: r.state.anchors.at(-1), type: 'command_execution' } };
  const frameBack = snapshot({ visibleTurnItems: [] }, r.state.sequence + 50);
  frameBack.historyCursor = 'a'; frameBack.hasMoreHistory = true;
  await recoverHistory({ history: async () => ({ items: [held, ...rows], hasMoreHistory: false }) }, r, frameBack);
  r.accept(frameBack, 1);
  assert.equal(results(r.state).length, 1000);
  assert.ok(Object.keys(r.state.reported).length <= api.LIMITS.reported);
});

test('a pending question is reported once, stays pending through a long turn, then goes stale', () => {
  const r = reducer(); let sequence = 0;
  r.accept(frame(++sequence, 'run.created', { id: 'run', ordinal: 1, status: 'running', startedAt: iso(0) }), 0);
  r.accept(frame(++sequence, 'node.updated', { id: 'node', runId: 'run' }), 0);
  const request = { id: 'q', kind: 'user_input', status: 'pending', nodeId: 'node', createdAt: iso(1) };
  r.accept(frame(++sequence, 'runtime-request.updated', request), 0);
  r.accept(frame(++sequence, 'turn-item.updated', { id: 'q-item', type: 'user_input_request', requestId: 'q', runId: 'run', status: 'waiting', questions: [{ id: 'k', question: 'Which?' }], updatedAt: iso(1) }), 0);
  assert.equal(r.state.pending.filter(e => e.event === 'QUESTION').length, 1);
  r.state.pending = [];
  for (let n = 2; n < 5000; n++) {
    r.accept(frame(++sequence, 'turn-item.updated', item(n, 'run')), 0);
    r.accept(frame(++sequence, 'message.updated', message(n, 'run', `note ${n}`)), 0);
  }
  for (let n = 0; n < 400; n++) r.emit('NOTE', `filler:${n}`, {}, Date.parse(iso(4000)));
  r.prune();
  assert.equal(r.status().pending, 1);
  assert.equal(r.liveness().pendingRequests.length, 1);
  r.accept(snapshot({ runs: [{ id: 'run', ordinal: 1, status: 'running', startedAt: iso(0) }], runtimeRequests: [request] }, sequence + 1), 0);
  assert.ok(!r.state.pending.some(e => e.event === 'QUESTION'), 'question repeated');
  r.accept(frame(sequence + 2, 'run.updated', { id: 'run', ordinal: 1, status: 'completed', startedAt: iso(0), completedAt: iso(9000) }), 0);
  assert.equal(r.status().pending, 0);
  assert.equal(requestStatus(r.state, r.state.records.runtimeRequests.q), 'stale');
});

test('a resolved request stays resolved when its item arrives after eviction', () => {
  const r = reducer();
  r.accept(frame(1, 'runtime-request.updated', { id: 'q', kind: 'user_input', status: 'resolved', createdAt: iso(1), resolvedAt: iso(2) }), 0);
  for (let n = 0; n < 40; n++) r.accept(frame(2 + n, 'runtime-request.updated', { id: `other-${n}`, kind: 'user_input', status: 'resolved', createdAt: iso(3), resolvedAt: iso(3) }), 0);
  r.state.pending = [];
  r.accept(frame(100, 'turn-item.updated', { id: 'i', type: 'user_input_request', requestId: 'q', status: 'completed', questionAnswer: { answers: {} }, questions: [{ question: 'Q' }], completedAt: iso(2), updatedAt: iso(2) }), 0);
  assert.ok(r.state.pending.length <= 1);
  assert.equal(r.status().pending, 0);
});

test('a trailing RESULT in a long final reply still settles as DONE after clipping', () => {
  const r = reducer();
  r.accept(frame(1, 'run.created', { id: 'run', ordinal: 1, status: 'running', startedAt: iso(0) }), 0);
  r.accept(frame(2, 'message.updated', message(1, 'run', `${'long\n'.repeat(5000)}RESULT status=done`)), 0);
  r.accept(frame(3, 'run.updated', { id: 'run', ordinal: 1, status: 'completed', startedAt: iso(0), completedAt: iso(1) }), 0);
  r.state.pending = [];
  r.tick(Date.parse(iso(1)) + 60000, 45000, 2700000);
  assert.deepEqual(r.state.pending.map(e => e.event), ['DONE']);
});

function versionOne() {
  const records = { runs: {}, turnItems: {}, messages: {}, nodes: {}, plans: {}, checkpoints: {}, runtimeRequests: {} }, reported = {};
  for (let n = 0; n < 2000; n++) {
    records.turnItems[`item-${n}`] = item(n, 'run-old'); records.nodes[`node-${n}`] = { id: `node-${n}`, runId: 'run-old', blob: 'n'.repeat(500) };
    records.plans[`plan-${n}`] = { id: `plan-${n}`, blob: 'p'.repeat(500) };
    records.messages[`message-${n}`] = message(n, 'run-old', `RESULT old=${n}`);
    reported[`result:message-${n}:h`] = true;
  }
  records.runs['run-old'] = { ...runRecord(0, 'completed'), id: 'run-old' }; reported['run:run-old'] = true;
  records.runs['run-live'] = { ...runRecord(1999, 'running'), id: 'run-live' }; records.nodes['node-1999'].runId = 'run-live'; reported['run:run-live'] = true;
  records.runtimeRequests.held = { id: 'held', kind: 'user_input', status: 'pending', nodeId: 'node-1999', createdAt: iso(1999) };
  return { id: 'thread', sequence: 5000, records, reported, pending: [{ event: 'RESULT', threadId: 'thread', message: 'RESULT unread=1' }], deferredRequests: { held: { record: records.runtimeRequests.held, at: 0 } },
    idleSince: 1, lastEventAt: 1, initialized: true, missing: false, lastAgentMessage: 'x'.repeat(100000) };
}

test('a version 1 cursor migrates without repeats or loss and shrinks', async () => {
  const old = versionOne(), before = size(old);
  const r = new Reducer(JSON.parse(JSON.stringify(old)), { expect: '^RESULT ' });
  assert.ok(size(r.state) < before / 20 && size(r.state) < 64 * 1024, `from ${before} to ${size(r.state)}`);
  assert.equal(r.state.version, api.CURSOR_VERSION);
  assert.deepEqual(results(r.state), ['RESULT unread=1'], 'held events survive');
  r.flushQuestions(10000);
  assert.equal(r.state.pending.filter(e => e.event === 'QUESTION').length, 1, 'deferred question survives');
  r.state.pending = [];
  const frameBack = snapshot({ runs: [{ ...runRecord(0, 'completed'), id: 'run-old' }], messages: [message(5, 'run-old', 'RESULT old=5'), message(9000000, 'run-new', 'RESULT new=1')] }, 6000);
  await recoverHistory({ history: async () => { throw new Error('anchor must be in the snapshot'); } }, r, { ...frameBack, projection: { ...frameBack.projection, visibleTurnItems: [{ item: item(1999, 'run-old') }] }, historyCursor: 'x', hasMoreHistory: true });
  r.accept(frameBack, 1);
  assert.deepEqual(results(r.state), ['RESULT new=1']);
});

test('held events beyond the limit keep actionable ones and report the overflow', () => {
  const r = reducer();
  for (let n = 0; n < 300; n++) r.emit('NOTE', `note:${n}`, { message: `n${n}` });
  r.emit('RESULT', 'result:one', { message: 'RESULT keep=1' });
  r.capPending(); r.capPending();
  assert.ok(r.state.pending.length <= api.LIMITS.pending + 1);
  assert.equal(r.state.pending[0].event, 'OVERFLOW');
  assert.equal(r.state.pending[0].dropped, 301 - api.LIMITS.pending);
  assert.ok(r.state.pending.some(e => e.message === 'RESULT keep=1'));
});

test('a cursor keeps a limited number of threads it no longer watches', () => {
  const saved = { threads: {} };
  for (let n = 0; n < 100; n++) saved.threads[`t${n}`] = { ...freshState(`t${n}`), lastEventAt: n };
  api.compactCursor(saved, ['t0']);
  assert.ok(saved.threads.t0);
  assert.ok(saved.threads.t99);
  assert.equal(Object.keys(saved.threads).length, api.LIMITS.idleThreads + 1);
});

test('a monitor keeps roster detail only for its own threads', () => {
  const m = new Monitor(['thread'], { threads: {} }, {}, { threads: [] });
  m.shell({ kind: 'snapshot', snapshot: { threads: [...Array(500).keys()].map(n => ({ id: `other-${n}` })).concat({ id: 'thread' }) } });
  m.shell({ kind: 'thread.updated', thread: { id: 'another' } });
  assert.deepEqual([...m.shells.keys()], ['thread']);
});

test('one-shot read stops paging once it has the replies it needs', async () => {
  const r = new Reducer(freshState('thread'), { complete: true });
  let fetched = 0;
  const rows = n => [{ item: { id: `i${n}`, messageId: `m${n}`, type: 'assistant_message', runId: `r${n}`, text: 'done', streaming: false } }];
  const start = snapshot({ visibleTurnItems: [] }, 1); start.historyCursor = 'a'; start.hasMoreHistory = true;
  await recoverHistory({ history: async (_, c) => { fetched++; return { items: rows(fetched), hasMoreHistory: true, nextCursor: `c${fetched}` }; } }, r, start, { replies: 2 });
  assert.equal(fetched, 3);
  assert.equal(r.state.pending.length, 0);
});

test('recovery does not retain rows that cannot produce an event', async () => {
  const r = reducer(); play(r, 2);
  const rows = [...Array(5000).keys()].map(n => ({ item: { id: `quiet-${n}`, type: 'command_execution', runId: 'same', status: 'completed' } }));
  const start = snapshot({ visibleTurnItems: [] }, r.state.sequence + 1); start.historyCursor = 'a'; start.hasMoreHistory = true;
  let stored = 0; const original = r.historyItem.bind(r); r.historyItem = row => { stored++; original(row); };
  await recoverHistory({ history: async () => ({ items: rows, hasMoreHistory: false }) }, r, start);
  assert.equal(stored, 1);
});
