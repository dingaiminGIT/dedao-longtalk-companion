importScripts('core.js');
const C=LongtalkCore, HOST='com.baiyalab.dedao_longtalk', TTL=7*86400000;
chrome.action.onClicked.addListener(tab=>{if(C.articleUrl(tab.url))chrome.tabs.sendMessage(tab.id,{type:'longtalk-toggle'}).catch(()=>{});else chrome.tabs.create({url:'https://www.dedao.cn/'});});
// One job per tab. Native ports keep the MV3 worker alive while a job runs.
const tabs=new Map();
chrome.runtime.onConnect.addListener(ui=>{
 const sender=ui.sender;
 if(ui.name!=='longtalk-ui'||!sender?.tab?.id||sender.frameId!==0||!C.officialPage(sender.url)){ui.disconnect();return;}
 // sender.url may remain the initial document URL after the site navigates with pushState.
 // Trust only our top-frame content script on the official origin; validate each article payload below.
 const tabId=sender.tab.id;tabs.get(tabId)?.();
 let native=null,job=null,closed=false,operation=0;
 const post=m=>{if(!closed)try{ui.postMessage(m);}catch{}};
 const stop=()=>{operation++;job=null;if(native){const current=native;native=null;try{current.postMessage({type:'cancel'});current.disconnect();}catch{}}};
 const cleanup=()=>{closed=true;stop();if(tabs.get(tabId)===cleanup)tabs.delete(tabId);};tabs.set(tabId,cleanup);ui.onDisconnect.addListener(cleanup);
 function connect(){
  if(native)return native;
  const port=chrome.runtime.connectNative(HOST);native=port;
  port.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError;if(native!==port)return;native=null;const interrupted=!!job;job=null;post({type:'connection',ready:false,message:interrupted?'本机连接中断，生成已停止。请重新连接后重试。':error?'尚未连接本机程序，请检查安装后重新连接。':'本机连接已断开，请重新连接。'});});
  port.onMessage.addListener(async m=>{
   if(native!==port||closed)return;
   if(m.type==='hello'){post({type:'connection',ready:m.ready===true,message:m.ready?'本机 Codex 已连接':'未找到 Codex，请先安装并登录'});return;}
   const task=job;if(!task||m.id!==task.id)return;
   if(m.type==='progress'){post({type:'progress',message:'Codex 正在阅读全文并整理重点…'});return;}
   if(m.type==='error'||m.type==='cancelled'){job=null;post(m);return;}
   if(m.type==='result'){
    try{
     const result=C.validateResult(m.result,task.source.paragraphs);
     const record={result,createdAt:Date.now(),seconds:m.seconds,group:task.group,version:C.VERSION};
     // Cache summaries only: original paragraphs are retained in memory during the job.
     await chrome.storage.local.set({[task.key]:record});
     const all=await chrome.storage.local.get(null), entries=Object.entries(all).filter(([k])=>k.startsWith('summary:')).sort((a,b)=>b[1].createdAt-a[1].createdAt);
     await chrome.storage.local.remove(entries.filter(([,v],i)=>i>=30||Date.now()-v.createdAt>TTL).map(([k])=>k));
     if(job===task){job=null;post({type:'result',result,cached:false,createdAt:record.createdAt,seconds:record.seconds});}
    }catch(e){if(job===task){job=null;post({type:'error',message:e.message});}}
   }
  });return port;
 }
 ui.onMessage.addListener(async m=>{
  try{
   if(m.type==='cancel'){stop();post({type:'cancelled'});return;}
   if(m.type==='hello'){connect().postMessage({type:'hello'});return;}
   if(!['lookup','generate','clear'].includes(m.type))throw Error('不支持的操作');
   if(job){post({type:'error',message:'正在生成，请先取消当前任务'});return;}
   const op=++operation,source=C.source(m.source),{key,group}=await C.keys(m.account,source);
   // A route change is allowed only inside this tab's official article origin.
   if(closed||op!==operation)return;
   if(m.type==='clear'){await chrome.storage.local.remove(key);post({type:'cleared'});return;}
   const saved=(await chrome.storage.local.get(key))[key];
   if(closed||op!==operation)return;
   if(m.type==='lookup'||!m.force){
    if(saved?.version===C.VERSION&&saved.createdAt<=Date.now()&&Date.now()-saved.createdAt<TTL){try{const result=C.validateResult(saved.result,source.paragraphs);post({type:'result',result,cached:true,createdAt:saved.createdAt,seconds:saved.seconds});return;}catch{await chrome.storage.local.remove(key);}}
    if(m.type==='lookup'){post({type:'empty'});return;}
   }
   job={id:crypto.randomUUID(),source,key,group};post({type:'progress',message:'已发送给本机 Codex，正在准备分析…'});
   connect().postMessage({type:'generate',id:job.id,source});
  }catch(e){job=null;post({type:'error',message:e.message||'请求失败，请重试'});}
 });
});
