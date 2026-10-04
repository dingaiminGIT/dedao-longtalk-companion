const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto').webcrypto;
const C=require('../extension/core.js'),P=require('../extension/providers.js');
const source=()=>({url:'https://www.dedao.cn/course/article?id=ExampleArticle1234',title:'测试',profile:'观点案例行动',paragraphs:Array.from({length:5},(_,i)=>({id:`P000${i+1}`,text:'正文'.repeat(100)}))});
const result=()=>({summary:'摘要',verdict:'精选段落',reason:'理由',dimensions:['观点启发','具体案例','行动指导'].map(name=>({name,level:'一般',reason:'依据'})),points:Array.from({length:5},()=>({insight:'观点',speaker:'嘉宾',reasoning:'问题背景与论证过程',boundary:'适用范围与局限',example:'案例',action:'尝试',actionOrigin:'由观点延伸',evidence:['P0001']})),limitations:['文字稿']});
const event=()=>({fn:null,addListener(fn){this.fn=fn;}});
function fixture(overrides={},persisted={}){const received=[],nativeSent=[],data=persisted,session={};const access=[];let accept;const context=vm.createContext({fetch:async()=>({json:async()=>require('../extension/analysis-spec.json')}),console,URL,TextEncoder,crypto,Date,AbortController,AbortSignal,setTimeout,clearTimeout,setInterval,clearInterval});const native={onDisconnect:event(),onMessage:event(),postMessage:m=>nativeSent.push(m),disconnect(){this.onDisconnect.fn?.();}};
context.importScripts=()=>{context.LongtalkCore=C;context.LongtalkProviders={...P,...overrides};};const storage=record=>({async setAccessLevel(value){access.push(value.accessLevel);},async get(k){return k===null?{...record}:{[k]:record[k]};},async set(o){Object.assign(record,o);},async remove(keys){for(const k of Array.isArray(keys)?keys:[keys])delete record[k];}});context.chrome={action:{onClicked:event()},tabs:{},permissions:{contains:async()=>true},runtime:{id:'test-extension',getURL:path=>'chrome-extension://test-extension/'+path,onMessage:event(),onInstalled:event(),onConnect:{addListener(fn){accept=fn;}},connectNative:()=>native,getPlatformInfo:async()=>({os:'mac'})},storage:{local:storage(data),session:storage(session)}};vm.runInContext(fs.readFileSync('extension/background.js','utf8'),context);
const ui={name:'longtalk-ui',sender:{url:source().url,frameId:0,tab:{id:1}},onMessage:event(),onDisconnect:event(),postMessage:m=>received.push(m),disconnect(){this.disconnected=true;}};return{access,session,runtime:context.chrome.runtime,data,received,nativeSent,native,ui,accept,send:async m=>ui.onMessage.fn(m)};}
test('untrusted origin and subframes cannot reach native host',()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.ui.sender.url='https://evil.test';f.accept(f.ui);assert.ok(f.ui.disconnected);assert.equal(f.nativeSent.length,0);});
test('cache hit skips Codex and separates account and preference keys',async()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);const s=source(),{key}=await C.keys('A',s);f.data[key]={version:C.VERSION,createdAt:Date.now(),result:result()};await f.send({type:'lookup',source:s,account:'A'});assert.equal(f.received.at(-1).type,'result');assert.equal(f.received.at(-1).cached,true);assert.equal(f.nativeSent.length,0);await f.send({type:'lookup',source:s,account:'B'});assert.equal(f.received.at(-1).type,'empty');});
test('generating forwards only sanitized source and caches no transcript',async()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);await f.send({type:'generate',source:{...source(),cookie:'SECRET'},account:'A'});const sent=f.nativeSent[0];assert.equal(sent.type,'generate');assert.equal(sent.source.cookie,undefined);await f.native.onMessage.fn({type:'result',id:sent.id,result:result(),seconds:1});assert.equal(f.received.at(-1).type,'result');assert.ok(!JSON.stringify(f.data).includes('正文'));});
test('cancelled results cannot overwrite UI or persist a summary',async()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);await f.send({type:'generate',source:source(),account:'A'});const id=f.nativeSent[0].id;await f.send({type:'cancel'});await f.native.onMessage.fn({type:'result',id,result:result()});assert.equal(f.received.at(-1).type,'cancelled');assert.equal(Object.keys(f.data).filter(k=>k.startsWith('summary:')).length,0);});
test('invalid citations are not cached and a busy request cannot orphan the job',async()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);await f.send({type:'generate',source:source(),account:'A'});const id=f.nativeSent[0].id;await f.send({type:'generate',source:source(),account:'A'});assert.equal(f.nativeSent.length,1);const r=result();r.points[0].evidence=['P9999'];await f.native.onMessage.fn({type:'result',id,result:r});assert.equal(f.received.at(-1).type,'error');assert.equal(Object.keys(f.data).filter(k=>k.startsWith('summary:')).length,0);});
test('expired and future-dated caches cannot suppress a fresh generation',async()=>{for(const timestamp of [Date.now()-8*86400000,Date.now()+86400000]){const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);const s=source(),{key}=await C.keys('A',s);f.data[key]={version:C.VERSION,createdAt:timestamp,result:result()};await f.send({type:'lookup',source:s,account:'A'});assert.equal(f.received.at(-1).type,'empty');await f.send({type:'generate',source:s,account:'A'});assert.equal(f.nativeSent[0].type,'generate');}});
test('an official homepage document can connect after SPA article navigation',async()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.ui.sender.url='https://www.dedao.cn/';f.accept(f.ui);assert.ok(!f.ui.disconnected);await f.send({type:'lookup',source:source(),account:'A'});assert.equal(f.received.at(-1).type,'empty');await f.send({type:'generate',source:{...source(),url:'https://evil.test/course/article?id=ExampleArticle1234'},account:'A'});assert.equal(f.received.at(-1).type,'error');assert.equal(f.nativeSent.length,0);});
test('subframes and lookalike hosts remain blocked',()=>{for(const sender of [{url:source().url,frameId:1,tab:{id:1}},{url:'https://www.dedao.cn.evil.test/',frameId:0,tab:{id:1}}]){const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.ui.sender=sender;f.accept(f.ui);assert.ok(f.ui.disconnected);}});
test('native disconnect is reported even without a runtime error, including during a job',async()=>{for(const generating of [false,true]){const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);await f.send(generating?{type:'generate',source:source(),account:'A'}:{type:'hello'});f.native.onDisconnect.fn();assert.equal(f.received.at(-1).type,'connection');assert.equal(f.received.at(-1).ready,false);if(generating)assert.match(f.received.at(-1).message,/生成已停止/);}});
test('old native host gets an update instruction instead of accepting incompatible summaries',async()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);await f.send({type:'hello'});await f.native.onMessage.fn({type:'hello',ready:true,version:'1.0'});assert.equal(f.received.at(-1).ready,false);assert.match(f.received.at(-1).message,/需要更新/);await f.native.onMessage.fn({type:'hello',ready:true,resultVersion:C.VERSION,protocolVersion:3});assert.equal(f.received.at(-1).ready,true);});
test('old brief cache cannot be returned as the new detailed format',async()=>{const f=fixture();f.data['longtalk:provider']={mode:'codex',model:''};f.accept(f.ui);const s=source(),{key}=await C.keys('A',s);f.data[key]={version:'1',createdAt:Date.now(),result:result()};await f.send({type:'lookup',source:s,account:'A'});assert.equal(f.received.at(-1).type,'empty');});

function settingsCall(f,m,sender={url:'chrome-extension://test-extension/options.html',id:'test-extension'}){return new Promise(resolve=>{const accepted=f.runtime.onMessage.fn(m,sender,resolve);if(!accepted)resolve(undefined);});}
test('settings secret persists locally and is inaccessible to content callers',async()=>{
 const f=fixture(),s=P.config({model:'test-model'});
 assert.equal(await settingsCall(f,{type:'save-settings',config:s,key:'secret'},{url:source().url,id:'test-extension'}),undefined);
 assert.deepEqual(f.session,{});
 const r=await settingsCall(f,{type:'save-settings',config:s,key:'secret'});assert.ok(r.value.ok);assert.equal(f.data['longtalk:api-key:'+s.baseUrl],'secret');assert.deepEqual(f.access,['TRUSTED_CONTEXTS']);assert.deepEqual(f.session,{});
 const loaded=await settingsCall(f,{type:'get-settings'});assert.ok(loaded.value.hasKey);assert.ok(!JSON.stringify(loaded).includes('secret'));
 await settingsCall(f,{type:'save-settings',config:{...s,baseUrl:'https://other.example/v1'}});assert.equal((await settingsCall(f,{type:'get-settings'})).value.hasKey,false);
});
test('fresh install defaults to API while upgrading preserves Codex',async()=>{
 const f=fixture();assert.equal((await settingsCall(f,{type:'get-settings'})).value.config.mode,'api');
 await f.runtime.onInstalled.fn({reason:'update',previousVersion:'0.2.0'});assert.equal(f.data['longtalk:provider'].mode,'codex');
});
test('provider and model changes isolate cached summaries',async()=>{
 const s=source(),base=await C.keys('A',s),api=await C.keys('A',s,P.config({model:'model-one'})),api2=await C.keys('A',s,P.config({model:'model-two'})),wb=await C.keys('A',s,{mode:'workbuddy',model:''});
 assert.equal(new Set([base.key,api.key,api2.key,wb.key]).size,4);
});

const settle=async condition=>{for(let i=0;i<50&&!condition();i++)await new Promise(r=>setImmediate(r));assert.ok(condition());};
test('API generation runs without native host and stores only validated result',async()=>{
 let captured;const f=fixture({analyze:async(s,key,src,spec,signal,progress)=>{captured={s,key,src};progress('分段测试');return result();}}),s=P.config({model:'api-test'});
 await settingsCall(f,{type:'save-settings',config:s,key:'secret-key'});f.accept(f.ui);await f.send({type:'hello'});assert.equal(f.received.at(-1).ready,true);
 await f.send({type:'generate',account:'A',source:source()});await settle(()=>f.received.at(-1)?.type==='result');
 assert.equal(captured.key,'secret-key');assert.equal(f.nativeSent.length,0);assert.ok(!JSON.stringify(f.received).includes('secret-key'));assert.ok(!JSON.stringify(Object.entries(f.data).filter(([k])=>k.startsWith('summary:'))).includes('secret-key'));assert.ok(!JSON.stringify(f.data).includes('正文'));
});
test('cancelling an API job aborts it and discards late output',async()=>{
 let finish,signal;const f=fixture({analyze:async(s,k,src,spec,abort)=>{signal=abort;return await new Promise(r=>finish=r);}}),s=P.config({model:'api-test'});
 await settingsCall(f,{type:'save-settings',config:s,key:'key'});f.accept(f.ui);await f.send({type:'generate',account:'A',source:source()});await settle(()=>!!finish);
 await f.send({type:'cancel'});assert.equal(signal.aborted,true);finish(result());await new Promise(r=>setImmediate(r));assert.equal(f.received.at(-1).type,'cancelled');assert.equal(Object.keys(f.data).filter(k=>k.startsWith('summary:')).length,0);
});

test('saved API keys survive worker restart and provider switching; clearing is scoped',async()=>{
 const f=fixture(),a=P.config({model:'one'}),b=P.config({baseUrl:'https://other.example/v1',model:'two'});
 await settingsCall(f,{type:'save-settings',config:a,key:'key-a'});await settingsCall(f,{type:'save-settings',config:b,key:'key-b'});
 const restarted=fixture({},f.data);
 assert.equal((await settingsCall(restarted,{type:'get-settings'})).value.hasKey,true);
 await settingsCall(restarted,{type:'save-settings',config:a});assert.equal((await settingsCall(restarted,{type:'get-settings'})).value.hasKey,true);
 await settingsCall(restarted,{type:'save-settings',config:a,forgetKey:true});assert.equal((await settingsCall(restarted,{type:'get-settings'})).value.hasKey,false);
 await settingsCall(restarted,{type:'save-settings',config:b});assert.equal((await settingsCall(restarted,{type:'get-settings'})).value.hasKey,true);
});
test('content storage proxy permits only display preferences and positions',async()=>{
 const f=fixture(),sender={id:'test-extension',url:source().url,tab:{id:1},frameId:0},k='preference:'+'a'.repeat(64);
 for(const key of ['longtalk:api-key:https://api.openai.com/v1','longtalk:provider','summary:any',null]){
  const r=await settingsCall(f,{type:'public-storage',operation:'get',key},sender);assert.match(r.error,/不支持/);
 }
 await settingsCall(f,{type:'public-storage',operation:'set',key:k,value:'案例优先'},sender);
 assert.equal((await settingsCall(f,{type:'public-storage',operation:'get',key:k},sender)).value,'案例优先');
 await settingsCall(f,{type:'public-storage',operation:'set',key:'longtalk:widget-position',value:{right:10,top:20}},sender);
 assert.equal((await settingsCall(f,{type:'public-storage',operation:'get',key:'longtalk:widget-position'},sender)).value.top,20);
 assert.ok((await settingsCall(f,{type:'public-storage',operation:'set',key:k,value:'x'.repeat(401)},sender)).error);
 assert.equal(await settingsCall(f,{type:'public-storage',operation:'get',key:k},{...sender,url:'https://evil.test'}),undefined);
});
test('Codex and CodeBuddy choices persist without an API key',async()=>{
 for(const mode of ['codex','workbuddy']){const f=fixture(),config={mode,model:'chosen-model'};await settingsCall(f,{type:'save-settings',config});const restarted=fixture({},f.data);const r=await settingsCall(restarted,{type:'get-settings'});assert.equal(r.value.config.mode,mode);assert.equal(r.value.config.model,'chosen-model');assert.equal(r.value.hasKey,false);}
});
test('an existing session key migrates once without replacing a newer saved key',async()=>{
 for(const existing of [undefined,'new-key']){
  const s=P.config({model:'test'}),slot='longtalk:api-key:'+s.baseUrl,f=fixture();f.session['longtalk:api-key']={baseUrl:s.baseUrl,key:'old-key'};if(existing)f.data[slot]=existing;
  await settingsCall(f,{type:'save-settings',config:s});assert.equal(f.data[slot],existing||'old-key');assert.equal(f.session['longtalk:api-key'],undefined);
  await settingsCall(f,{type:'save-settings',config:s,forgetKey:true});assert.equal((await settingsCall(f,{type:'get-settings'})).value.hasKey,false);
 }
});
