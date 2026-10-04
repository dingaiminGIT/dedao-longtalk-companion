const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../extension/core.js');
function fixture(){
 const elements=new Map(),ports=[],sent=[],intervals=new Set();
 class Element{
  constructor(){this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.children=[];this.style={};this.events={};const classes=new Set();this.classList={contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(){}addEventListener(type,fn){this.events[type]=fn;}getBoundingClientRect(){return {width:420,height:740};}
  querySelector(selector){if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);}
  querySelectorAll(){return [];}attachShadow(){return root;}
 }
 const root=new Element(),document={title:'66｜测试长谈 - 得到APP',documentElement:new Element(),getElementById:()=>null,createElement:()=>new Element(),querySelector:()=>null,addEventListener(){}};
 const event=()=>{const listeners=[];return {addListener:f=>listeners.push(f),emit:async m=>{for(const f of listeners)await f(m);}};};
 const paragraphs=Array.from({length:5},(_,i)=>({id:`P000${i+1}`,text:'长谈测试正文'.repeat(50)}));
 const runtime={id:'extension-id',onMessage:event(),sendMessage:async()=>({value:undefined}),connect(){
  if(!this.id)throw Error('Extension context invalidated.');
  const p={onMessage:event(),onDisconnect:event(),disconnect(){void this.onDisconnect.emit();},postMessage(m){sent.push(m);if(m.type==='hello')queueMicrotask(()=>p.onMessage.emit({type:'connection',ready:true,message:'DeepSeek 已配置'}));if(m.type==='lookup')queueMicrotask(()=>p.onMessage.emit({type:'empty'}));}};ports.push(p);return p;
 }};
 vm.runInNewContext(fs.readFileSync('extension/content.js','utf8'),{LongtalkCore:{...C,supportedPage:()=>true,extract:()=>({paragraphs,nodes:[],size:1500})},document,chrome:{runtime},location:{href:'https://www.dedao.cn/course/article?id=ExampleArticle1234'},window:{addEventListener(){}},innerWidth:1400,innerHeight:1000,fetch:async()=>({ok:true,json:async()=>({h:{c:0},c:{uid_hazy:'account'}})}),AbortSignal,setTimeout,clearTimeout,setInterval:fn=>{intervals.add(fn);return fn;},clearInterval:fn=>intervals.delete(fn),queueMicrotask,console});
 const result={summary:'长谈摘要',verdict:'精选段落',reason:'理由',dimensions:['观点启发','具体案例','行动指导'].map(name=>({name,level:'一般',reason:'依据'})),points:Array.from({length:5},()=>({insight:'观点',speaker:'嘉宾',reasoning:'论证过程',example:'具体案例',action:'行动',actionOrigin:'由观点延伸',boundary:'边界',evidence:['P0001']})),limitations:['文字稿']};
 return {$:s=>root.querySelector(s),ports,sent,runtime,result,intervals};
}
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
test('idle worker disconnect preserves a completed summary and permits generation; reconnects before sending',async()=>{
 const f=fixture();await f.$('.launch').onclick();await settle();
 await f.ports[0].onMessage.emit({type:'result',result:f.result,createdAt:Date.now()});
 const children=f.$('.result').children.length,status=f.$('.status').textContent;
 await f.ports[0].onDisconnect.emit();
 assert.ok(children>0);assert.equal(f.$('.result').children.length,children);assert.equal(f.$('.status').textContent,status);assert.equal(f.$('.status').classList.contains('error'),false);assert.equal(f.$('.setup').hidden,true);assert.equal(f.$('.generate').disabled,false);
 await f.$('.generate').onclick();
 assert.equal(f.ports.length,2);assert.equal(f.sent.filter(m=>m.type==='generate').length,1);assert.equal(f.$('.cancel').hidden,false);
});
test('disconnect during generation stops progress and never silently resubmits the task',async()=>{
 const f=fixture();await f.$('.launch').onclick();await settle();await f.$('.generate').onclick();
 await f.ports[0].onDisconnect.emit();
 assert.match(f.$('.status').textContent,/本次任务已停止/);assert.equal(f.$('.status').classList.contains('error'),true);assert.equal(f.$('.cancel').hidden,true);assert.equal(f.$('.generate').disabled,true);
 await f.$('.check').onclick();assert.equal(f.ports.length,2);assert.equal(f.sent.filter(m=>m.type==='generate').length,1);assert.equal(f.$('.generate').disabled,false);
});
test('extension invalidation asks for page refresh, not API reconfiguration',async()=>{
 const f=fixture();await f.$('.launch').onclick();await settle();f.runtime.id=undefined;await f.ports[0].onDisconnect.emit();
 assert.match(f.$('.status').textContent,/扩展已更新，请刷新网页/);assert.equal(f.$('.setup').hidden,true);assert.equal(f.$('.generate').disabled,true);
});
test('clearing an existing summary wakes an idle worker and sends the clear request',async()=>{
 const f=fixture();await f.$('.launch').onclick();await settle();await f.ports[0].onDisconnect.emit();f.$('.clear').onclick();await settle();
 assert.equal(f.ports.length,2);assert.equal(f.sent.at(-1).type,'clear');
});
