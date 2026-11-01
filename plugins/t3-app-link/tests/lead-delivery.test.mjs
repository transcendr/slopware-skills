import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as api from '../skills/t3-app-link/scripts/t3-thread.mjs';
const stale=JSON.parse(fs.readFileSync(new URL('fixtures/stale-approval.json',import.meta.url)));
test('03 stale real approval is not re-reported or counted pending and is visible in all questions',()=>{
 const r=new api.Reducer(api.freshState('thread'));r.baseline(stale);r.accept({kind:'synchronized'});r.flushQuestions(Date.now()+5000);
 assert.equal(r.status().pending,0);assert.ok(!r.state.pending.some(e=>['QUESTION','APPROVAL'].includes(e.event)));
 const q=api.questionRecords(r.state).find(q=>q.kind==='command');assert.ok(q);assert.equal(q.status,'stale');assert.match(api.formatQuestions([q]),/STALE/);
 r.tick(Date.now()+45000,45000,2700000);assert.ok(!r.active());
});

test('03 explicit archived inspection still subscribes to its retained detail',async()=>{
 const os=await import('node:os'),path=await import('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-inspect-')),prev=process.env.T3CODE_HOME;fs.mkdirSync(path.join(dir,'userdata'));fs.writeFileSync(path.join(dir,'userdata/server-runtime.json'),JSON.stringify({origin:'http://127.0.0.1:1'}));const token=path.join(dir,'token');fs.writeFileSync(token,'test-token',{mode:0o600});process.env.T3CODE_HOME=dir;let detail=0;
 const rpcFactory=()=>({request:async()=>({environment:{environmentId:'env'}}),subscribe:async(tag,p,h)=>{if(tag.endsWith('Shell'))h.onFrame({kind:'snapshot',snapshot:{threads:[]}});else{detail++;h.onFrame(stale);}h.onFrame({kind:'synchronized'});return()=>{};},close(){}});
 const m=new api.Monitor(['thread'],{threads:{}},{inspecting:true,'token-file':token,rpcFactory},{threads:[]});try{await m.open();assert.equal(detail,1);assert.equal(m.reducers.get('thread').state.missing,false);assert.equal(api.questionRecords(m.reducers.get('thread').state)[0].status,'stale');}finally{m.close();if(prev===undefined)delete process.env.T3CODE_HOME;else process.env.T3CODE_HOME=prev;fs.rmSync(dir,{recursive:true});}
});

test('03 until-event keeps its real actionable question until the launching lead run ends',async()=>{
 const os=await import('node:os'),path=await import('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'t3-hold-')),prev=process.env.T3CODE_HOME,self=process.env.T3_APP_LINK_SELF,own=process.env.T3CODE_THREAD_ID;
 const shell=JSON.parse(fs.readFileSync(new URL('fixtures/lead-shell.json',import.meta.url))),questions=JSON.parse(fs.readFileSync(new URL('fixtures/parity-questions.json',import.meta.url))),question=questions[0].frames.find(f=>f.frame.event.payload.type==='user_input_request').frame;
 fs.mkdirSync(path.join(dir,'userdata'));fs.writeFileSync(path.join(dir,'userdata/server-runtime.json'),JSON.stringify({origin:'http://127.0.0.1:1'}));const token=path.join(dir,'token');fs.writeFileSync(token,'test-token',{mode:0o600});process.env.T3CODE_HOME=dir;process.env.T3_APP_LINK_SELF='lead';delete process.env.T3CODE_THREAD_ID;
 let shellHandler,closed=false,settled=false;const output=[],warnings=[],log=console.log,error=console.error;console.log=x=>output.push(x);console.error=x=>warnings.push(x);
 const rpcFactory=()=>({request:async()=>({environment:{environmentId:'env'},providers:[{instanceId:'codex',driver:'codex'}]}),subscribe:async(tag,p,h)=>{if(tag.endsWith('Shell')){shellHandler=h;h.onFrame({kind:'snapshot',snapshot:{threads:[shell.active]}});}else{h.onFrame(stale);h.onFrame({...question,sequence:stale.snapshotSequence+1});}h.onFrame({kind:'synchronized'});return()=>{};},close(){closed=true;}});
 try{const running=api.runMonitor(['thread'],{'until-event':true,inspecting:true,json:true,'token-file':token,rpcFactory},{threads:[]}).then(()=>{settled=true;});await new Promise(setImmediate);await new Promise(setImmediate);
  assert.equal(settled,false,'watch exited while its launching run was still active');assert.equal(closed,false);assert.ok(!output.some(x=>JSON.parse(x).event==='QUESTION'));
  shellHandler.onFrame({kind:'thread.updated',thread:shell.idle});await running;assert.ok(output.some(x=>JSON.parse(x).event==='QUESTION'));assert.equal(process.exitCode,5);assert.equal(warnings.length,0);
  delete process.env.T3_APP_LINK_SELF;await api.runMonitor(['thread'],{'until-event':true,inspecting:true,json:true,'token-file':token,rpcFactory},{threads:[]});assert.equal(warnings.length,1);assert.match(warnings[0],/no T3CODE_THREAD_ID or T3_APP_LINK_SELF/);assert.equal(process.exitCode,5);
 }finally{console.log=log;console.error=error;process.exitCode=0;for(const [k,v] of [['T3CODE_HOME',prev],['T3_APP_LINK_SELF',self],['T3CODE_THREAD_ID',own]])if(v===undefined)delete process.env[k];else process.env[k]=v;fs.rmSync(dir,{recursive:true});}
});
