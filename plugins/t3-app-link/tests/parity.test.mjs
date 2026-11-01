import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {spawnSync} from 'node:child_process';
import {Reducer,freshState,main} from '../skills/t3-app-link/scripts/t3-thread.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('fixtures/parity-questions.json',import.meta.url)));
const init=(options={})=>{const r=new Reducer(freshState('thread'),options);r.accept({kind:'snapshot',snapshotSequence:0,projection:{thread:{id:'thread'},runs:[],messages:[],runtimeRequests:[],turnItems:[]}},0);r.accept({kind:'synchronized'},0);return r;};
const event=(sequence,type,payload)=>({kind:'event',sequence,event:{type,threadId:'thread',payload}});

test('02.1 Claude request waits for its real question item, then includes both questions',()=>{
 const fixture=fixtures.find(f=>f.provider==='claudeAgent'),frames=fixture.frames.filter(f=>f.frame.event.type!=='message.updated'),r=init();
 r.accept(frames[0].frame,0);assert.equal(r.state.pending.length,0);
 r.accept(frames[1].frame,0);assert.equal(r.state.pending.length,1);assert.equal(r.state.pending[0].questions.length,2);
});

test('02.1 absent question text has a bounded visible fallback',()=>{
 const request=fixtures.find(f=>f.provider==='claudeAgent').frames[0].frame,r=init({questionDelayMs:5000});
 r.accept(request,0);assert.equal(r.state.pending.length,0);r.tick(4999,45000,2700000);assert.equal(r.state.pending.length,0);
 r.tick(5000,45000,2700000);assert.equal(r.state.pending[0].event,'QUESTION');assert.match(r.state.pending[0].message,/questions/);
});

test('02.5 progress excludes a RESULT line from NOTE without dropping other commentary',()=>{
 const r=init({expect:'^RESULT ',progress:true});r.accept(event(1,'message.updated',{id:'m',role:'assistant',text:'A progress note.\nRESULT status=done',streaming:false}),0);
 assert.deepEqual(r.state.pending.map(e=>[e.event,e.message]),[['RESULT','RESULT status=done'],['NOTE','A progress note.']]);
});

test('02.7 progress emits turn end and one silence warning per quiet interval',()=>{
 const r=init({progress:true,silentMs:240000});r.accept(event(1,'run.created',{id:'r',status:'running'}),0);r.state.pending=[];
 r.tick(240000,45000,2700000);r.tick(241000,45000,2700000);assert.deepEqual(r.state.pending.map(e=>e.event),['SILENT']);
 r.accept(event(2,'run.updated',{id:'r',status:'completed'}),242000);assert.equal(r.state.pending.at(-1).event,'TURN_END');
});

test('02.2 compact QUESTION puts every question and options before a stable handle and rule',async()=>{
 const {eventText}=await import('../skills/t3-app-link/scripts/t3-thread.mjs');
 const fixture=fixtures.find(f=>f.provider==='claudeAgent'),item=fixture.frames.find(f=>f.frame.event.payload.type==='user_input_request').frame.event.payload;
 const e={event:'QUESTION',threadId:'thread',at:'2026-11-01T03:45:20.000Z',requestId:item.requestId,questions:item.questions,rule:'run questions worker for full requestId and answer keys; t3_pending_request respond'};
 const text=eventText(e,{threads:[{id:'thread',name:'worker'}]});
 assert.match(text,/^03:45:20 QUESTION worker Continue claude-probe probe\? \[options: Continue \| Pause\]/);
 assert.match(text,/Which marker for claude-probe\? \[options: Alpha \| Beta\]/);assert.ok(!text.includes(item.requestId));assert.ok(!text.includes('\n'));assert.match(text,/request=q:/);
});

test('02.6 default lines keep useful text and cap RESULT/NOTE at the inherited 2000 characters',async()=>{
 const {eventText}=await import('../skills/t3-app-link/scripts/t3-thread.mjs');const raw='Native long id '.repeat(60);
 const text=eventText({event:'RESULT',at:'2026-01-01T01:02:03Z',threadId:'thread',messageId:raw,turnId:raw,message:'x'.repeat(2100)},{threads:[{id:'thread',name:'worker'}]});
 assert.equal(text,'01:02:03 RESULT worker '+'x'.repeat(2000));
});

test('02.4 questions expose readable pending state, full request ID and exact answer keys',async()=>{
 const api=await import('../skills/t3-app-link/scripts/t3-thread.mjs');const fixture=fixtures.find(f=>f.provider==='claudeAgent'),r=init();
 for(const f of fixture.frames.filter(f=>f.frame.event.type!=='message.updated').slice(0,2))r.accept(f.frame,f.at);
 const questions=api.questionRecords(r.state);const text=api.formatQuestions(questions);
 assert.match(text,/\[.* PENDING\]/);assert.match(text,/Q: Continue claude-probe probe\?/);assert.match(text,/options: Continue \| Pause/);
 assert.ok(text.includes(questions[0].id));assert.ok(text.includes('"Continue claude-probe probe?":{"answers":'));
});


test('02.4 real resolved requests retain answer values and timestamps for both providers',async()=>{
 const api=await import('../skills/t3-app-link/scripts/t3-thread.mjs');
 for(const fixture of fixtures){const r=init();for(const f of fixture.frames)r.accept(f.frame,f.at);const q=api.questionRecords(r.state)[0];
  assert.equal(q.status,'resolved');assert.ok(q.answeredAt);assert.equal(q.answerSource,'runtime-request');
  assert.deepEqual(Object.values(q.answers),[['Continue'],['Alpha']]);const text=api.formatQuestions([q]);assert.ok(text.includes(' answered '+q.answeredAt));assert.ok(text.includes('answer: '));
 }
});

test('02.16 latest-state wait does not request history for a bounded snapshot',async()=>{
 const {Monitor}=await import('../skills/t3-app-link/scripts/t3-thread.mjs');const m=new Monitor(['thread'],{threads:{}},{watching:false,history:false},{threads:[]});let pages=0;
 m.rpc={subscribe:async(tag,payload,h)=>{h.onFrame({kind:'snapshot',snapshotSequence:1,historyCursor:'old',hasMoreHistory:true,projection:{thread:{id:'thread'},runs:[],messages:[],turnItems:[],runtimeRequests:[]}});h.onFrame({kind:'synchronized'});return()=>{};},history:async()=>{pages++;return{items:[],hasMoreHistory:false};}};
 await m.subscribe('thread');await m.work;assert.equal(pages,0);
});

const runtime=JSON.parse(fs.readFileSync(new URL('fixtures/parity-runtime.json',import.meta.url)));
test('02.9 a silent running command is identified in the stall signal',()=>{
 const r=init();r.accept(runtime.run,0);r.accept(runtime.command.find(f=>f.event.payload.status==='running'),0);r.state.pending=[];
 r.tick(5000,45000,5000);const stalled=r.state.pending.find(e=>e.event==='STALLED');assert.ok(stalled);assert.match(stalled.message,/command.*running/i);assert.equal(stalled.liveness.runningCommands.length,1);
});

test('02.10 approval event carries the real native prompt instead of generic text',()=>{
 const r=init();for(const f of runtime.approval)r.accept(f,0);
 const approval=r.state.pending.find(e=>e.event==='APPROVAL');assert.ok(approval);assert.match(approval.message,/\/usr\/bin\/true/);assert.match(approval.rule,/user/);
});

test('02.18 an isolated origin can use its own private read token without replacing the default',async()=>{
 const {Monitor}=await import('../skills/t3-app-link/scripts/t3-thread.mjs');const os=await import('node:os'),path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-origin-')),token=path.join(dir,'token'),previous=process.env.T3CODE_HOME;fs.mkdirSync(path.join(dir,'userdata'));fs.writeFileSync(path.join(dir,'userdata/server-runtime.json'),JSON.stringify({origin:'http://127.0.0.1:1'}));fs.writeFileSync(token,'fixture-isolated-token',{mode:0o600});process.env.T3CODE_HOME=dir;
 let options;const rpcFactory=o=>{options=o;return{request:async()=>({environment:{environmentId:'isolated'}}),subscribe:async(tag,p,h)=>{h.onFrame({kind:'snapshot',snapshot:{threads:[]}});h.onFrame({kind:'synchronized'});return()=>{};},close(){}};};
 const m=new Monitor([],{threads:{}},{'token-file':token,rpcFactory},{threads:[]});
 try{await m.open();assert.equal(options.token,'fixture-isolated-token');assert.equal(options.origin,'http://127.0.0.1:1');}finally{m.close();if(previous===undefined)delete process.env.T3CODE_HOME;else process.env.T3CODE_HOME=previous;fs.rmSync(dir,{recursive:true});}
});

test('02.12 a formal question answered during an outage is recoverable from its real completed item',()=>{
 const closed=fixtures.find(f=>f.provider==='claudeAgent').frames.find(f=>f.frame.event.payload.type==='user_input_request'&&f.frame.event.payload.status==='completed');assert.ok(closed);
 const r=init();r.historyItem({position:0,item:closed.frame.event.payload});
 const q=r.state.pending.find(e=>e.event==='QUESTION');assert.ok(q);assert.equal(q.status,'resolved');assert.ok(q.answeredAt);assert.equal(q.questions.length,2);
});

test('02.9 silence after a real completed command does not claim an active run',()=>{
 const r=init({progress:true,silentMs:5000});r.accept(runtime.run,0);for(const f of runtime.command)r.accept(f,0);
 const run={...runtime.run.event.payload,status:'completed'};r.accept(event(99999,'run.updated',run),0);r.state.pending=[];r.tick(5000,45000,5000);
 const silent=r.state.pending.find(e=>e.event==='SILENT');assert.ok(silent);assert.match(silent.message,/idle/i);assert.ok(!r.state.pending.some(e=>e.event==='STALLED'));
});

test('02.17 real Claude native compaction emits once after completion',()=>{
 const frames=JSON.parse(fs.readFileSync(new URL('fixtures/parity-compaction.json',import.meta.url))),r=init();assert.ok(frames.some(f=>f.event.payload.status==='running'));
 for(const f of frames)r.accept(f,0);assert.equal(r.state.pending.filter(e=>e.event==='COMPACTED').length,1);
});
