import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { extractResult, Reducer, freshState, recoverHistory, lockCursor, resolveRef, T3Rpc, setup, Monitor, completedReplies } from '../skills/t3-app-link/scripts/t3-thread.mjs';

const source = fs.readFileSync(new URL('../../codex-app-link/skills/codex-app-link/scripts/codex-thread.mjs', import.meta.url), 'utf8');
const upstream = vm.runInNewContext(source.slice(source.indexOf('const KEY_START'), source.indexOf('function latestResult')) + '\nextractResult;');
const cases = [null, '', 'No result here', 'RESULT', 'RESULT status=done branch=x head=y',
  '```text\nRESULT status=done\nproof=tests pass\n  and live probe\n```\nother',
  'RESULT status=old\n\nRESULT status=new', 'RESULT status=done\n\nproof=ok\n\nOutside',
  'RESULT path=a=b reason=two words\nproof=first\nproof=second',
  'prefix RESULT status=wrong', '  RESULT status=done\n  detail=ok',
  'RESULT status=done\ncontinuation\n  extra continuation', 'END status=done'];
for (const [index, value] of cases.entries()) test(`extractResult matches codex-app-link case ${index}`, () => {
  assert.equal(JSON.stringify(extractResult(value)), JSON.stringify(upstream(value)));
  assert.equal(JSON.stringify(extractResult(value, 'END')), JSON.stringify(upstream(value, 'END')));
});
const fixtures = JSON.parse(fs.readFileSync(new URL('fixtures/recorded-stream.json', import.meta.url)));
const eventKinds = reducer => reducer.state.pending.map(e => e.event);
const frame = (sequence, type, payload) => ({kind:'event',sequence,event:{threadId:'thread',type,payload}});
const snapshot = (projection = {}, sequence = 0) => ({kind:'snapshot',snapshotSequence:sequence,projection:{thread:{id:'thread'},runs:[],messages:[],runtimeRequests:[],turnItems:[],...projection}});
function initialized(options = {}) { const r=new Reducer(freshState('thread'), options);r.accept(snapshot(),0);r.accept({kind:'synchronized'},0);return r; }

test('recorded Codex and Claude streams report runs, real questions, and result without duplicate replay', () => {
  const reducers=new Map();
  for(const {id,frame} of fixtures){if(!reducers.has(id))reducers.set(id,new Reducer(freshState(id),{expect:'^RESULT '}));reducers.get(id).accept(frame);}
  assert.equal(reducers.size,2);
  for(const r of reducers.values()) {
    assert.ok(eventKinds(r).includes('STARTED'));assert.ok(eventKinds(r).includes('QUESTION'));
    const before=r.state.pending.length;
    for(const entry of fixtures.filter(e=>e.id===r.state.id&&e.frame.kind==='event'))r.accept(entry.frame);
    assert.equal(r.state.pending.length,before);
    assert.ok(!eventKinds(r).includes('UNPARSED'));
  }
  assert.ok([...reducers.values()].some(r=>eventKinds(r).includes('RESULT')));
});

test('cursor round trip retains pending actionable events across until-event re-arm',()=>{
  const r=initialized({expect:'^RESULT '});
  r.accept(frame(1,'message.updated',{id:'m',role:'assistant',runId:'r',text:'RESULT status=done',streaming:false}));
  r.accept(frame(2,'runtime-request.updated',{id:'q',kind:'user_input',status:'pending'}));
  assert.equal(r.state.pending.shift().event,'RESULT');
  const restored=new Reducer(JSON.parse(JSON.stringify(r.state)),{expect:'^RESULT '});
  assert.deepEqual(eventKinds(restored),['QUESTION']);
  restored.state.pending=[];
  restored.accept(frame(3,'message.updated',{id:'m',role:'assistant',runId:'r',text:'RESULT status=done',streaming:false}));
  assert.deepEqual(eventKinds(restored),[]);
});

test('snapshot fallback pages back to saved timeline position and stops there',async()=>{
  const r=initialized({expect:'^RESULT '});r.state.position=10;
  const row=(position,text)=>({position,visibility:'local',item:{id:'i'+position,messageId:'m'+position,type:'assistant_message',runId:'run',text,streaming:false}});
  const pages={a:{items:[row(30,'RESULT page=30')],hasMoreHistory:true,nextCursor:'b'},b:{items:[row(20,'RESULT page=20')],hasMoreHistory:true,nextCursor:'c'},c:{items:[row(10,'RESULT page=10')],hasMoreHistory:true,nextCursor:'unneeded'}};
  const calls=[];const rpc={history:async(id,cursor)=>{calls.push(cursor);return pages[cursor];}};
  await recoverHistory(rpc,r,{historyCursor:'a',hasMoreHistory:true});
  assert.deepEqual(calls,['a','b','c']);
  assert.deepEqual(r.state.pending.filter(e=>e.event==='RESULT').map(e=>e.message),['RESULT page=20','RESULT page=30']);
  const restored=new Reducer(JSON.parse(JSON.stringify(r.state)),{expect:'^RESULT '});restored.state.pending=[];
  await recoverHistory(rpc,restored,{historyCursor:'a',hasMoreHistory:true},10);
  assert.deepEqual(restored.state.pending,[]);
});

test('history failure does not advance the stream cursor',async()=>{
  const r=initialized();r.state.sequence=9;
  await assert.rejects(recoverHistory({history:async()=>{throw Error('offline');}},r,{historyCursor:'x',hasMoreHistory:true}));
  assert.equal(r.state.sequence,9);
});

test('settle restarts across chained runs and pauses only for the final run without a match',()=>{
  const r=initialized({expect:'^RESULT '});
  r.accept(frame(1,'run.created',{id:'r1',ordinal:1,status:'running'}),0);
  r.accept(frame(2,'message.updated',{id:'m1',runId:'r1',role:'assistant',text:'RESULT status=done'}),10);
  r.accept(frame(3,'run.updated',{id:'r1',ordinal:1,status:'completed'}),20);
  r.tick(64,45,2700);assert.ok(!eventKinds(r).includes('DONE'));
  r.accept(frame(4,'run.created',{id:'r2',ordinal:2,status:'running'}),64);
  r.tick(90,45,2700);assert.ok(!eventKinds(r).includes('DONE'));
  r.accept(frame(5,'run.updated',{id:'r2',ordinal:2,status:'completed'}),100);
  r.tick(144,45,2700);assert.ok(!eventKinds(r).includes('PAUSED'));
  r.tick(145,45,2700);assert.equal(eventKinds(r).at(-1),'PAUSED');
  r.tick(200,45,2700);assert.equal(eventKinds(r).filter(e=>e==='PAUSED').length,1);
});

test('COMPACTED, MAINTENANCE, APPROVAL, STALLED, and unknown events',()=>{
  const r=initialized();
  r.accept(frame(1,'run.created',{id:'r',status:'running'}),0);
  r.accept(frame(2,'turn-item.updated',{id:'compact',type:'compaction',status:'completed'}),1);
  r.accept(frame(3,'message.updated',{id:'maintenance',role:'user',maintenance:{kind:'pause'}}),2);
  r.accept(frame(4,'runtime-request.updated',{id:'approval',kind:'command',status:'pending'}),3);
  r.accept(frame(5,'future.event',{id:'future'}),4);
  r.accept(frame(6,'turn-item.updated',{id:'compact',type:'compaction',status:'completed'}),5);
  r.tick(2705,45,2700);
  assert.deepEqual(eventKinds(r),['STARTED','COMPACTED','MAINTENANCE','APPROVAL','UNPARSED','STALLED']);
});

test('answered formal requests remain answered when their turn item arrives',()=>{
  const r=initialized();r.accept(frame(1,'runtime-request.updated',{id:'q',status:'resolved',kind:'user_input'}));
  r.accept(frame(2,'turn-item.updated',{id:'i',type:'user_input_request',requestId:'q'}));
  assert.ok(!eventKinds(r).includes('QUESTION'));
});

test('cursor lock rejects concurrent users and releases cleanly',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-link-test-'));const file=path.join(dir,'cursor');
  try{const release=lockCursor(file);assert.throws(()=>lockCursor(file),{code:'cursor-in-use'});release();lockCursor(file)();}finally{fs.rmSync(dir,{recursive:true});}
});

test('native redirects exit 2 without network or credentials and resolve names',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-link-test-'));const registry=path.join(dir,'registry.json');
  fs.writeFileSync(registry,JSON.stringify({threads:[{id:'thread-id',name:'worker'}]}));
  try{for(const [cmd,tool]of Object.entries({send:'t3_thread_send',new:'t3_thread_launch',queue:'t3_queue',interrupt:'t3_thread_interrupt',access:'t3_thread_configure'})){
    const result=spawnSync(process.execPath,[new URL('../skills/t3-app-link/scripts/t3-thread.mjs',import.meta.url).pathname,cmd,'worker','--registry',registry],{encoding:'utf8'});
    assert.equal(result.status,2);assert.ok(result.stderr.includes(tool));if(cmd!=='new')assert.ok(result.stderr.includes('thread-id'));
  }}finally{fs.rmSync(dir,{recursive:true});}
  assert.equal(resolveRef('WORKER',{threads:[{id:'thread-id',name:'worker'}]}),'thread-id');
});

test('transport rejects write RPCs before opening a socket',async()=>{
  const rpc=new T3Rpc({origin:'http://localhost',token:'fixture'});
  await assert.rejects(rpc.request('orchestration.dispatchCommand',{}),{code:'t3-read-only'});
  await assert.rejects(rpc.subscribe('write',{},{}),{code:'t3-read-only'});
});

test('setup issues only read scope, stores 0600, and reuses without spawning',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-link-auth-')),tokenFile=path.join(dir,'token'),calls=[];
  const issued={token:'fixture-private-token',sessionId:'fixture-session',scopes:['orchestration:read'],expiresAt:'2099-01-01T00:00:00Z'};
  const run=(command,args,options)=>{calls.push({command,args,options});return calls.length===1?{status:0,stdout:'T3\n'}:{status:0,stdout:JSON.stringify(issued)};};
  try {
    const out=await setup({tokenFile,app:'/fixture/T3.app',run});
    assert.equal(out.reused,false);assert.equal(fs.statSync(tokenFile).mode&0o777,0o600);
    assert.equal(fs.readFileSync(tokenFile,'utf8').trim(),issued.token);
    assert.ok(!JSON.stringify(out).includes(issued.token));assert.ok(!JSON.stringify(calls).includes(issued.token));
    assert.deepEqual(calls[1].args.slice(calls[1].args.indexOf('--scope'),calls[1].args.indexOf('--scope')+2),['--scope','orchestration:read']);
    assert.equal(calls[1].options.env.ELECTRON_RUN_AS_NODE,'1');
    const fetch=async(url,options)=>{assert.equal(options.headers.Authorization,`Bearer ${issued.token}`);return{ok:true,json:async()=>({authenticated:true,scopes:issued.scopes,expiresAt:issued.expiresAt})};};
    const reuse=await setup({tokenFile,run:()=>assert.fail('must reuse'),origin:'http://fixture',fetch});assert.equal(reuse.reused,true);
    assert.equal(calls.length,2);
  } finally {fs.rmSync(dir,{recursive:true});}
});

test('setup renews an expired session and withholds issuer error output',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-link-auth-')),tokenFile=path.join(dir,'token');
  fs.writeFileSync(tokenFile,'fixture-expired',{mode:0o600});
  const fetch=async()=>({ok:false,status:401,json:async()=>({authenticated:false})});
  let calls=0;
  try {
    await assert.rejects(setup({tokenFile,origin:'http://fixture',fetch,run:()=>++calls===1?{status:0,stdout:'T3'}:{status:1,stderr:'fixture-secret',stdout:'fixture-secret'}}),error=>error.code==='token-issue-failed'&&!error.message.includes('fixture-secret'));
    assert.equal(calls,2);
    await assert.rejects(setup({tokenFile,origin:'http://fixture',fetch:async()=>({ok:true,json:async()=>({authenticated:true,expiresAt:'2099-01-01',scopes:['orchestration:read','orchestration:write']})})}),{code:'token-scope-mismatch'});
  } finally {fs.rmSync(dir,{recursive:true});}
});

test('shell identity supplement does not erase roster; disappearance and return are reported once',()=>{
  const monitor=new Monitor(['thread'],{threads:{}},{},{threads:[]});
  monitor.shell({kind:'snapshot',snapshot:{threads:[{id:'thread'}]}});
  monitor.shell({kind:'snapshot',snapshot:{threads:[]},resolvedRepositoryIdentityRoots:{}});
  const r=monitor.reducers.get('thread');assert.ok(!r.state.missing);
  monitor.shell({kind:'thread.removed',threadId:'thread'});
  monitor.shell({kind:'thread.removed',threadId:'thread'});
  monitor.shell({kind:'thread.updated',thread:{id:'thread'}});
  assert.deepEqual(eventKinds(r),['MISSING','FOUND']);
});

test('self-tracking is refused using the host T3 identity',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-link-test-'));const registry=path.join(dir,'registry.json');
  try {
    const result=spawnSync(process.execPath,[new URL('../skills/t3-app-link/scripts/t3-thread.mjs',import.meta.url).pathname,'track','add','own-thread','--name','self','--registry',registry],{encoding:'utf8',env:{...process.env,T3CODE_THREAD_ID:'own-thread'}});
    assert.equal(result.status,1);assert.ok(result.stderr.includes('self-tracking'));assert.equal(fs.existsSync(registry),false);
  }finally{fs.rmSync(dir,{recursive:true});}
});

test('history recovery can stop at an item held from streamed events without a timeline position',async()=>{
  const r=initialized({expect:'^RESULT '});
  r.accept(frame(1,'message.updated',{id:'old',role:'assistant',text:'Before gap'}));r.state.pending=[];
  let calls=0;
  await recoverHistory({history:async()=>{calls++;return{items:[{position:2,item:{id:'new-item',messageId:'new',type:'assistant_message',text:'RESULT status=done'}},{position:1,item:{id:'old-item',messageId:'old',type:'assistant_message',text:'Before gap'}}],hasMoreHistory:true,nextCursor:'not-needed'};}},r,{historyCursor:'first',hasMoreHistory:true});
  assert.equal(calls,1);assert.deepEqual(eventKinds(r),['RESULT']);
});

test('bounded fallback evicts stale active runs and pending requests before settling',()=>{
  const r=initialized({expect:'^RESULT '});
  r.accept(frame(1,'run.created',{id:'old',status:'running'}),0);
  r.accept(frame(2,'runtime-request.updated',{id:'old-question',kind:'user_input',status:'pending'}),1);
  r.state.pending=[];
  r.accept(snapshot({runs:[{id:'new',ordinal:5,status:'completed',completedAt:'1970-01-01T00:00:00.100Z'}]},100),100);
  assert.equal(r.active(),false);assert.equal(r.status().pending,0);
  r.tick(145,45,2700);assert.equal(eventKinds(r).at(-1),'PAUSED');
});


test('read/result count final replies by turns and omit commentary from active turns',()=>{
  const state=freshState('thread');
  state.records={runs:{active:{id:'active',status:'running'}},messages:{a:{id:'a',runId:'r1',role:'assistant',createdAt:'2026-01-01T00:00:00Z',text:'Commentary'},b:{id:'b',runId:'r1',role:'assistant',createdAt:'2026-01-01T00:00:01Z',text:'RESULT status=done'},c:{id:'c',runId:'r2',role:'assistant',createdAt:'2026-01-01T00:00:02Z',text:'Paused'},d:{id:'d',runId:'active',role:'assistant',createdAt:'2026-01-01T00:00:03Z',text:'Still working'}}};
  assert.deepEqual(completedReplies(state).map(m=>m.text),['RESULT status=done','Paused']);
});
