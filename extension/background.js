importScripts('core.js','providers.js');
const C=LongtalkCore,P=LongtalkProviders,HOST='com.baiyalab.dedao_longtalk',TTL=7*86400000,CONFIG='longtalk:provider',SECRET='longtalk:api-key';
const tabs=new Map();
const keySlot=s=>`${SECRET}:${s.baseUrl}`;
// Deny content scripts direct access before persisting any credentials.
const storageReady=chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}).then(async()=>{
 const legacy=(await chrome.storage.session.get(SECRET))[SECRET];
 if(legacy?.baseUrl&&typeof legacy.key==='string'){
  const slot=keySlot(legacy);
  if(!(await chrome.storage.local.get(slot))[slot])await chrome.storage.local.set({[slot]:legacy.key});
  await chrome.storage.session.remove(SECRET);
 }
});
storageReady.catch(()=>{});
function publicKey(k){return k==='longtalk:widget-position'||typeof k==='string'&&/^preference:[a-f0-9]{64}$/.test(k);}
function publicValue(k,v){return k==='longtalk:widget-position'?v&&typeof v==='object'&&Object.keys(v).every(x=>['right','top'].includes(x))&&Number.isFinite(v.right)&&Number.isFinite(v.top):typeof v==='string'&&v.length<=400;}

async function settings(){return P.config((await chrome.storage.local.get(CONFIG))[CONFIG]);}
async function apiKey(s){await storageReady;return (await chrome.storage.local.get(keySlot(s)))[keySlot(s)]||'';}
async function apiReady(s){if(!s.model)throw Error('请打开模型设置，填写模型名称');if(!await apiKey(s))throw Error('请打开模型设置，填写并保存 API Key');if(!await chrome.permissions.contains({origins:[P.origin(s)]}))throw Error('尚未授权访问模型服务，请在模型设置中保存并授权');}
function nativeStatus(m,s){
 if(m.resultVersion!==C.VERSION||m.protocolVersion!==3)return {type:'connection',ready:false,message:'本机连接程序需要更新，请运行新版安装器。',mode:s.mode};
 const ready=m.providers?m.providers[s.mode]===true:s.mode==='codex'&&m.ready===true;
 return {type:'connection',ready,message:ready?`${P.label(s)} 程序已就绪（使用本机登录）`:`未找到 ${P.label(s)}，请安装对应程序并运行连接安装器。`,mode:s.mode};
}
function inspectNative(s){return new Promise((resolve,reject)=>{let port;const timer=setTimeout(()=>{port?.disconnect();reject(Error('本机程序响应超时，请检查安装'));},12000);let settled=false;try{port=chrome.runtime.connectNative(HOST);port.onMessage.addListener(m=>{if(m.type!=='hello'||settled)return;settled=true;clearTimeout(timer);const info=nativeStatus(m,s);resolve(info);port.disconnect();});port.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError;if(settled)return;settled=true;clearTimeout(timer);reject(Error('未连接本机程序，请运行与你的系统对应的连接安装器'));});port.postMessage({type:'hello'});}catch{clearTimeout(timer);reject(Error('本机连接失败，请检查安装'));}});}
chrome.runtime.onInstalled.addListener(async details=>{if(details.reason==='update'&&details.previousVersion&&!((await chrome.storage.local.get(CONFIG))[CONFIG]))await chrome.storage.local.set({[CONFIG]:{mode:'codex',model:''}});});
chrome.action.onClicked.addListener(tab=>{if(C.articleUrl(tab.url))chrome.tabs.sendMessage(tab.id,{type:'longtalk-toggle'}).catch(()=>{});else chrome.runtime.openOptionsPage();});
// Content scripts can access only display preferences; settings never return raw keys.
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
 if(m.type==='public-storage'){
  if(sender.id!==chrome.runtime.id||!sender.tab?.id||sender.frameId!==0||!C.officialPage(sender.url))return;
  (async()=>{
   await storageReady;
   if(!publicKey(m.key)||!['get','set'].includes(m.operation))throw Error('不支持的界面设置');
   if(m.operation==='set'){if(!publicValue(m.key,m.value))throw Error('界面设置无效');await chrome.storage.local.set({[m.key]:m.value});return {ok:true};}
   return {value:(await chrome.storage.local.get(m.key))[m.key]};
  })().then(respond,e=>respond({error:e.message}));return true;
 }

 if(sender.url!==chrome.runtime.getURL('options.html')||sender.id!==chrome.runtime.id||sender.tab&&sender.frameId!==0)return;
 (async()=>{
  if(m.type==='get-settings'){const s=await settings();return {config:s,hasKey:s.mode==='api'&&!!await apiKey(s)};}
  if(m.type==='save-settings'){
   await storageReady;
   const s=P.config(m.config);if(s.mode==='api'&&!await chrome.permissions.contains({origins:[P.origin(s)]}))throw Error('请先允许访问所选 API 网站');
   if(s.mode==='api'&&m.key){if(typeof m.key!=='string'||m.key.length>4096||/[\r\n]/.test(m.key))throw Error('API Key 格式错误');await chrome.storage.local.set({[keySlot(s)]:m.key.trim()});}
   if(m.forgetKey&&s.mode==='api')await chrome.storage.local.remove(keySlot(s));
   await chrome.storage.local.set({[CONFIG]:s});
   for(const entry of tabs.values()){entry.stop();entry.post({type:'settings-changed'});}
   return {ok:true,hasKey:s.mode==='api'&&!!await apiKey(s)};
  }
  if(m.type==='test-provider'){
   const s=P.config(m.config);if(s.mode!=='api')return await inspectNative(s);
   if(!await chrome.permissions.contains({origins:[P.origin(s)]}))throw Error('请先保存设置并授权模型服务地址');
   const value=await P.completion(s,m.key||await apiKey(s),[{role:'user',content:'连接测试。请只输出 JSON：{"ok":true}'}],AbortSignal.timeout(30000),{maxTokens:256});
   if(value.ok!==true)throw Error('接口可访问，但模型未按要求输出 JSON');return {ok:true,message:'API 与模型测试通过'};
  }
  throw Error('不支持的设置操作');
 })().then(value=>respond({value}),e=>respond({error:e.name==='TimeoutError'?'连接测试超时，请稍后重试':e.message}));return true;
});
chrome.runtime.onConnect.addListener(ui=>{
 const sender=ui.sender;
 if(ui.name!=='longtalk-ui'||!sender?.tab?.id||sender.frameId!==0||!C.officialPage(sender.url)){ui.disconnect();return;}
 const tabId=sender.tab.id;tabs.get(tabId)?.cleanup();
 let native=null,job=null,closed=false,operation=0,selected=null;
 const post=m=>{if(!closed)try{ui.postMessage(m);}catch{}};
 const stop=()=>{operation++;job?.controller?.abort();job=null;if(native){const current=native;native=null;try{current.postMessage({type:'cancel'});current.disconnect();}catch{}}};
 const entry={post,stop,cleanup:()=>{closed=true;stop();if(tabs.get(tabId)===entry)tabs.delete(tabId);}};tabs.set(tabId,entry);ui.onDisconnect.addListener(entry.cleanup);
 async function completed(task,result,seconds){
  if(closed||job!==task)return;
  C.validateResult(result,task.source.paragraphs);
  const record={result,createdAt:Date.now(),seconds,group:task.group,version:C.VERSION,provider:P.label(task.config)};
  await chrome.storage.local.set({[task.key]:record});
  const all=await chrome.storage.local.get(null),entries=Object.entries(all).filter(([k])=>k.startsWith('summary:')).sort((a,b)=>b[1].createdAt-a[1].createdAt);
  await chrome.storage.local.remove(entries.filter(([,v],i)=>i>=30||Date.now()-v.createdAt>TTL).map(([k])=>k));
  if(job===task){job=null;post({type:'result',result,cached:false,createdAt:record.createdAt,seconds,provider:record.provider});}
 }
 function connect(){
  if(native)return native;
  const port=chrome.runtime.connectNative(HOST);native=port;
  port.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError;if(native!==port)return;native=null;const interrupted=!!job;job=null;post({type:'connection',ready:false,mode:selected?.mode,message:interrupted?'本机连接中断，生成已停止。请重新连接后重试。':error?'尚未连接本机程序，请检查安装后重新连接。':'本机连接已断开，请重新连接。'});});
  port.onMessage.addListener(async m=>{
   if(native!==port||closed)return;
   if(m.type==='hello'){post(nativeStatus(m,selected||{mode:'codex',model:''}));return;}
   const task=job;if(!task||m.id!==task.id)return;
   if(m.type==='progress'){post({type:'progress',message:`${P.label(task.config)} 正在阅读全文并整理重点…`});return;}
   if(m.type==='error'||m.type==='cancelled'){job=null;post(m);return;}
   if(m.type==='result'){try{await completed(task,m.result,m.seconds);}catch(e){if(job===task){job=null;post({type:'error',message:e.message});}}}
  });return port;
 }
 async function generateAPI(task){
  const deadline=setTimeout(()=>task.controller.abort(),600000),start=Date.now();
  // Keep only active model work alive; never run a permanent service-worker heartbeat.
  const heartbeat=setInterval(()=>chrome.runtime.getPlatformInfo().catch(()=>{}),20000);
  try{
   await apiReady(task.config);const secret=await apiKey(task.config);
   const spec=await (await fetch(chrome.runtime.getURL('analysis-spec.json'))).json();
   const result=await P.analyze(task.config,secret,task.source,spec,task.controller.signal,message=>{if(job===task)post({type:'progress',message});},{validateResult:C.validateResult});
   await completed(task,result,Math.round((Date.now()-start)/100)/10);
  }catch(e){if(job===task){job=null;post({type:'error',message:task.controller.signal.aborted?'生成超过 10 分钟，已停止。可调整分段大小或更换模型。':e.message});}}
  finally{clearTimeout(deadline);clearInterval(heartbeat);}
 }
 ui.onMessage.addListener(async m=>{
  try{
   if(m.type==='ping')return;
   if(m.type==='open-settings'){await chrome.runtime.openOptionsPage();return;}
   if(m.type==='cancel'){stop();post({type:'cancelled'});return;}
   if(m.type==='hello'){
    selected=await settings();if(closed)return;
    if(selected.mode==='api'){try{await apiReady(selected);post({type:'connection',ready:true,mode:'api',message:`${P.label(selected)} 已配置`});}catch(e){post({type:'connection',ready:false,mode:'api',message:e.message});}}
    else connect().postMessage({type:'hello'});return;
   }
   if(!['lookup','generate','clear'].includes(m.type))throw Error('不支持的操作');
   if(job){post({type:'error',message:'正在生成，请先取消当前任务'});return;}
   const op=++operation,s=await settings(),source=C.source(m.source),{key,group}=await C.keys(m.account,source,P.identity(s));
   if(closed||op!==operation)return;
   if(m.type==='clear'){await chrome.storage.local.remove(key);post({type:'cleared'});return;}
   const saved=(await chrome.storage.local.get(key))[key];
   if(closed||op!==operation)return;
   if(m.type==='lookup'||!m.force){
    if(saved?.version===C.VERSION&&saved.createdAt<=Date.now()&&Date.now()-saved.createdAt<TTL){try{const result=C.validateResult(saved.result,source.paragraphs);post({type:'result',result,cached:true,createdAt:saved.createdAt,seconds:saved.seconds,provider:saved.provider||P.label(s)});return;}catch{await chrome.storage.local.remove(key);}}
    if(m.type==='lookup'){post({type:'empty'});return;}
   }
   selected=s;job={id:crypto.randomUUID(),source,key,group,config:s,controller:new AbortController()};post({type:'progress',message:`已提交给 ${P.label(s)}，正在准备分析…`});
   if(s.mode==='api')void generateAPI(job);else connect().postMessage({type:'generate',id:job.id,source,provider:s.mode,model:s.model});
  }catch(e){job=null;post({type:'error',message:e.message||'请求失败，请重试'});}
 });
});
