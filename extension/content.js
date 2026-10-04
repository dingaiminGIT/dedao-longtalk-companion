(()=>{
'use strict';const C=LongtalkCore;
if(document.getElementById('dd-longtalk-companion'))return;
const grip='<svg viewBox="0 0 18 14" fill="currentColor" aria-hidden="true"><circle cx="5" cy="3" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="5" cy="7" r="1.5"/><circle cx="12" cy="7" r="1.5"/><circle cx="5" cy="11" r="1.5"/><circle cx="12" cy="11" r="1.5"/></svg>';
const arrow=direction=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction==='left'?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}"/></svg>`;
const handle=`<button class="drag-handle" aria-label="移动长谈速览位置" title="拖动移动 · 方向键微调 · Home 恢复位置">${grip}</button>`;
const host=document.createElement('div');host.id='dd-longtalk-companion';const root=host.attachShadow({mode:'open'});
root.innerHTML=`<style>
:host{all:initial;color-scheme:light;font:13px/1.65 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;color:#29231f}*{box-sizing:border-box}button,textarea{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible,textarea:focus-visible{outline:2px solid #ff6b00;outline-offset:2px}[hidden]{display:none!important}.dock{position:fixed;right:84px;top:84px;z-index:2147483644;width:52px;border:1px solid #f0d9cc;border-radius:22px;background:#fffaf6;box-shadow:0 4px 20px #38221418;overflow:hidden;text-align:center}.launch{display:flex;flex-direction:column;align-items:center;gap:9px;width:100%;padding:13px 6px 8px;border:0;background:none;color:#a84316;font-size:13px;font-weight:600;line-height:1.5}.launch svg,.close svg{width:20px;height:20px}.drag-handle{border:0;background:none;color:#bda394;cursor:grab;touch-action:none;user-select:none;padding:6px;line-height:1}.drag-handle svg{width:18px;height:14px;display:block}.dock .drag-handle{display:flex;justify-content:center;width:100%;padding:7px 0 11px}.heading{display:flex;align-items:center;gap:8px;min-width:0}.drag-handle:hover{color:#a84316}header{touch-action:none;cursor:grab}.dragging,.dragging *{cursor:grabbing!important;user-select:none!important}.dock-state{font-size:10px;color:#ad7958;padding:0 2px 3px}.panel{position:fixed;right:84px;top:84px;z-index:2147483646;width:min(420px,calc(100vw - 24px));height:min(740px,calc(100dvh - 40px));border:1px solid #ecd8cb;border-radius:18px;background:#fffdfa;box-shadow:0 8px 35px #35211529;display:flex;flex-direction:column;overflow:hidden}header{padding:16px 18px 12px;border-bottom:1px solid #f0e5dc;display:flex;justify-content:space-between;align-items:center;gap:12px}h1{font-size:18px;margin:0;font-weight:650}.muted{color:#8b7d72;font-size:11px}.close{display:flex;align-items:center;justify-content:center;background:none;color:#a84316;border:0;font-size:22px;border-radius:8px;padding:2px 9px}.body{overflow:auto;min-height:0;flex:1;padding:16px 18px;overscroll-behavior:contain}.source{font-size:13px;line-height:1.55;margin-bottom:7px;font-weight:550}.meta{font-size:11px;color:#8b7d72}.connection{font-size:11px;color:#8b7d72;margin:8px 0}details{margin:12px 0}summary{cursor:pointer;font-size:12px;color:#8b634d}textarea{width:100%;min-height:70px;resize:vertical;border:1px solid #e7dbd1;border-radius:8px;padding:8px;margin-top:8px;background:#fff;color:#38302b}.buttons{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0}.primary{border:1px solid #ff6b00;background:#ff6b00;color:#fff;border-radius:9px;padding:7px 14px}.secondary{border:1px solid #efcfb9;background:#fff7f0;color:#a84316;border-radius:9px;padding:6px 11px}.quiet{border:0;background:none;color:#986e56;text-decoration:underline;text-underline-offset:3px;padding:5px}.status{color:#82756a;font-size:12px;white-space:pre-wrap}.status.error{color:#ae3c27}.intro{color:#8b7d72;padding:24px 8px;text-align:center;font-size:13px}.intro strong{display:block;color:#3e3027;font-size:16px;margin-bottom:7px}.recommendation{background:#fff0e4;padding:13px;border-radius:12px;margin:14px 0;color:#784128}.verdict{font-weight:650;font-size:15px}.recommendation p{margin:6px 0 0}.dimensions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:12px 0}.dimension{background:#f7f3ed;border-radius:9px;padding:9px 5px;text-align:center;font-size:11px;color:#8a7a6d}.dimension b{display:block;color:#705039;font-size:14px}.point{border:1px solid #f0e5dc;background:#fff;border-radius:12px;margin:12px 0;padding:13px}.point h2{font-size:14px;line-height:1.6;margin:0 0 8px}.point p{font-size:12px;margin:7px 0;color:#6e6157;overflow-wrap:anywhere}.label{color:#a35a30;font-size:11px}.refs{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.refs button{border:1px solid #efdacb;background:#fffaf5;color:#a4481b;border-radius:6px;font-size:11px;padding:4px 7px}.limitations{color:#8b7d72;font-size:11px;padding-left:18px}.footer{padding:10px 18px;border-top:1px solid #f0e5dc;font-size:11px;color:#8b7d72;display:flex;justify-content:space-between;align-items:center;gap:10px}.point details{border-top:1px solid #f0e5dc;padding-top:9px;margin:12px 0 0}.point details summary{color:#a84316}.point .reasoning{font-size:13px;color:#4e423a;line-height:1.8}.point h3{font-size:11px;font-weight:600;color:#a35a30;margin:14px 0 4px}.point p{white-space:pre-line}.detail-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0 8px}.detail-toolbar h2{margin:0;font-size:14px}.dimension-reasons{margin:8px 0 16px}.dimension-reasons p{font-size:12px;color:#7c6d60;line-height:1.7}.cache-stamp{font-size:11px;color:#8b7d72;margin:10px 0}.confirm{font-size:12px;color:#9c5437}.setup{font-size:11px;color:#8b7d72;background:#f7f3ed;padding:9px;border-radius:8px}.confirm .quiet{font-size:11px}@media(max-width:460px){.panel{height:calc(100dvh - 24px)}}
</style>
<div class="dock" hidden><button class="launch" aria-label="展开长谈速览" title="展开长谈速览" aria-haspopup="dialog" aria-controls="dd-longtalk-panel" aria-expanded="false">${arrow("left")}<span>长谈<br>速览</span></button><div class="dock-state" hidden></div>${handle}</div>
<section id="dd-longtalk-panel" class="panel" role="dialog" aria-label="长谈速览" hidden>
<header><div class="heading">${handle}<div><h1>长谈速览</h1><div class="muted">先看重点，再决定是否完整观看</div></div></div><button class="close" aria-label="收起长谈速览" title="收起为浮条">${arrow("right")}</button></header>
<div class="body"><div class="source"></div><div class="meta"></div><div class="connection" hidden></div><div class="setup" hidden>打开「模型设置」配置 API，或选择已安装并登录的本机工具。<button class="quiet check">重新连接</button></div>
<details class="preferences"><summary>筛选偏好</summary><textarea aria-label="筛选偏好" maxlength="400"></textarea><div class="muted">偏好改变后生成新摘要，最多 400 字。</div></details>
<div class="buttons"><button class="primary generate">生成速览</button><button class="secondary cancel" hidden>取消生成</button></div><div class="status" role="status" aria-live="polite"></div><button class="quiet retry-source" hidden>重试读取</button>
<div class="intro"><strong>观点 · 论证 · 案例 · 行动</strong>先看判断，再展开案例与适用边界。<br>仅在你点击生成后调用所选模型。</div><div class="result"></div></div>
<div class="footer"><button class="quiet model-settings">模型设置</button><button class="quiet clear" hidden>清除此篇摘要</button></div>
</section>`;document.documentElement.append(host);
const $=s=>root.querySelector(s);$('textarea').value=C.DEFAULT_PROFILE;
let port=null,account='',source=null,nodes=[],running=false,ready=false,shown=false,route=location.href,epoch=0,start=0,timer=null,hasResult=false,connectionState='idle',available=false,phase='正在分析全文';
function supported(){return C.supportedPage(location.href,document.querySelector('.article-body .editor-show'));}
function dropPort(){const previous=port;port=null;previous?.disconnect();}
function disconnected(message,canReconnect=true){ready=false;connectionState='failed';$('.connection').hidden=true;$('.setup').hidden=!canReconnect;busy(false);status(message,true);}
function idleStatus(){if(connectionState==='failed')return;if(ready)status(hasResult?'摘要已载入，可点击原文核对。':'文字稿已准备好，可以生成速览。');else status('文字稿已准备好，正在检查模型设置…');}
function showError(error){const text=String(error?.message||error);if(/Extension context invalidated/i.test(text)){disconnected('扩展已更新，请刷新网页后再打开速览。',false);return;}status(error?.name==='TimeoutError'?'读取超时，请稍后重试。':text,true);}
function status(text,error=false){$('.status').textContent=text;$('.status').classList.toggle('error',error);}
function busy(value){running=value;$('.dock-state').hidden=!value;$('.dock-state').textContent=value?'分析中':'';$('.generate').disabled=value||!source||!ready;$('.cancel').hidden=!value;$('textarea').disabled=value;$('.clear').disabled=value;$('.retry-source').disabled=value;$('.intro').hidden=value||hasResult;clearInterval(timer);if(value){start=Date.now();timer=setInterval(()=>{if(running)status(`${phase} · ${Math.floor((Date.now()-start)/1000)} 秒\n长稿可能需要几分钟，可随时取消。`);},1000);} }
async function context(){const response=await fetch('https://www.dedao.cn/api/pc/user/info',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('请先登录得到账号');const data=await response.json();if(data.h?.c!==0||typeof data.c?.uid_hazy!=='string'||!data.c.uid_hazy)throw Error('请先登录得到账号');return data.c.uid_hazy;}
function connect(){if(port)return;connectionState='checking';$('.connection').hidden=true;$('.setup').hidden=true;idleStatus();port=chrome.runtime.connect({name:'longtalk-ui'});const current=port;port.onMessage.addListener(async m=>{if(port!==current)return;
 if(m.type==='connection'){if(m.ready!==true){disconnected(m.message);return;}ready=true;connectionState='ready';$('.connection').textContent=m.message;$('.connection').hidden=false;$('.setup').hidden=true;busy(running);if(!running&&!hasResult)idleStatus();return;}
 if(m.type==='settings-changed'){epoch++;dropPort();busy(false);ready=false;if(shown)await prepare();else{source=null;hasResult=false;}return;}
 if(m.type==='progress'){phase=m.message;if(!running)busy(true);status(m.message);return;}
 if(['result','empty','cleared','cancelled','error'].includes(m.type))busy(false);
 if(m.type==='error'){status(m.message||'生成失败，请重试',true);return;}
 if(m.type==='cancelled'){status('已取消，本期内容仍可正常阅读。');return;}
 if(m.type==='empty'){idleStatus();return;}
 if(m.type==='cleared'){hasResult=false;$('.result').replaceChildren();$('.clear').hidden=true;$('.generate').textContent='生成速览';$('.intro').hidden=false;status('已清除此篇摘要。');return;}
 if(m.type==='result'){
  if(!source||source.profile!==($('textarea').value.trim()||C.DEFAULT_PROFILE))return;
  const mark=epoch;
  try{if((await context())!==account)throw Error('账号已切换，请重新打开速览');if(mark!==epoch||C.articleUrl(location.href)!==source?.url)return;C.validateResult(m.result,source.paragraphs);render(m);}
  catch(e){hasResult=false;$('.result').replaceChildren();showError(e);}
 }
});port.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError;if(port!==current)return;epoch++;port=null;disconnected(chrome.runtime.id?'连接已断开，点击「重新连接」重试。':'扩展已更新，请刷新网页后再打开速览。',!!chrome.runtime.id);});port.postMessage({type:'hello'});}
async function readTitle(mark){
 const deadline=Date.now()+8000;
 while(mark===epoch){const title=C.articleTitle(document.title);if(title)return title;if(Date.now()>=deadline)throw Error('文章信息尚未加载完成，请稍后重试读取。');await new Promise(resolve=>setTimeout(resolve,100));}
 return '';
}
async function prepare(){$('.retry-source').hidden=true;const mark=++epoch;dropPort();ready=false;connectionState='idle';$('.connection').hidden=true;$('.setup').hidden=true;$('.source').textContent='';$('.meta').textContent='';source=null;hasResult=false;$('.result').replaceChildren();$('.clear').hidden=true;$('.generate').textContent='生成速览';busy(false);status('正在读取本期文字稿…');
 try{const id=await context();if(mark!==epoch)return;account=id;const {paragraphs,nodes:elements,size}=C.extract(document.querySelector('.article-body .editor-show'));nodes=elements;
 const pref=(await chrome.storage.local.get(`preference:${await C.digest(account)}`));if(mark!==epoch)return;$('textarea').value=pref[Object.keys(pref)[0]]||C.DEFAULT_PROFILE;
 const title=await readTitle(mark);if(mark!==epoch)return;source=C.source({url:location.href,title,profile:$('textarea').value.trim()||C.DEFAULT_PROFILE,paragraphs});$('.source').textContent=source.title;const seconds=document.querySelector('video')?.duration;$('.meta').textContent=`${paragraphs.length} 段 · 约 ${(size/10000).toFixed(1)} 万字${Number.isFinite(seconds)?` · 视频约 ${Math.round(seconds/60)} 分钟`:''}`;connect();busy(false);port.postMessage({type:'lookup',account,source});
 }catch(e){if(mark!==epoch)return;$('.source').textContent='当前页面';$('.meta').textContent='';showError(e);$('.retry-source').hidden=/Extension context invalidated/i.test(e.message||'');busy(false);}
}
async function open(){if(!supported())return;shown=true;$('.panel').hidden=false;$('.dock').hidden=true;placeWidget();$('.launch').setAttribute('aria-expanded','true');if(running)return;await prepare();}
function close(){$('.panel').hidden=true;$('.dock').hidden=!supported();$('.launch').setAttribute('aria-expanded','false');shown=false;placeWidget();}
function add(parent,tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;}
function render(m){
 hasResult=true;const r=m.result,box=$('.result');box.replaceChildren();$('.intro').hidden=true;$('.clear').hidden=false;$('.generate').textContent='重新生成';
 add(box,'p',r.summary);
 const recommendation=add(box,'div','','recommendation');add(recommendation,'div',r.verdict==='精选段落'?'建议先读精选段落':r.verdict==='完整观看'?'适合完整观看':'可以暂时跳过','verdict');add(recommendation,'p',r.reason);
 const dimensions=add(box,'div','','dimensions');for(const x of r.dimensions){const cell=add(dimensions,'div',x.name,'dimension');add(cell,'b',x.level);}
 const reasons=add(box,'details','','dimension-reasons');add(reasons,'summary','为什么这样判断');for(const x of r.dimensions)add(reasons,'p',`${x.name}：${x.reason}`);
 const toolbar=add(box,'div','','detail-toolbar');add(toolbar,'h2',`${r.points.length} 个重点详解`);const expand=add(toolbar,'button','全部展开','quiet');
 const sections=[];const update=()=>expand.textContent=sections.every(e=>e.open)?'收起细节':'全部展开';
 expand.addEventListener('click',()=>{const open=!sections.every(e=>e.open);for(const section of sections)section.open=open;update();});
 for(const [index,p] of r.points.entries()){
  const card=add(box,'article','','point');add(card,'h2',`${index+1}. ${p.insight}`);add(card,'span',p.speaker,'label');add(card,'p',p.reasoning,'reasoning');
  const details=add(card,'details','','point-detail');details.open=index===0;sections.push(details);add(details,'summary','展开案例、行动与适用边界');details.addEventListener('toggle',()=>{details.querySelector('summary').textContent=details.open?'收起案例与行动':'展开案例、行动与适用边界';update();});
  for(const [label,text] of [['具体案例',p.example],[p.actionOrigin==='无明确行动'?'行动启发':p.actionOrigin,p.action],['适用边界',p.boundary]]){add(details,'h3',label);add(details,'p',text);}
  const refs=add(card,'div','','refs');for(const [n,id] of p.evidence.entries()){const button=add(refs,'button',`原文 ${n+1}`);button.title=`查看段落 ${id}`;button.addEventListener('click',()=>jump(id));}
 }
 const list=add(box,'ul','','limitations');for(const text of r.limitations)add(list,'li',text);
 add(box,'div',`${m.cached?'已载入缓存':'生成完成'}${m.provider?` · ${m.provider}`:''} · ${new Date(m.createdAt).toLocaleString('zh-CN')}${Number.isFinite(m.seconds)?` · 耗时 ${m.seconds} 秒`:''}`,'cache-stamp');
 if(connectionState!=='failed')status('先看判断与论证，展开查看案例、行动和适用边界。');busy(false);
}
function jump(id){try{const fresh=C.extract(document.querySelector('.article-body .editor-show'));const index=source.paragraphs.findIndex(p=>p.id===id),item=fresh.paragraphs[index];if(index<0||item?.text!==source.paragraphs[index].text)throw Error('正文已更新，请重新生成摘要');const node=fresh.nodes[index];close();node.scrollIntoView({block:'center',behavior:'smooth'});const outline=node.style.outline;node.style.outline='2px solid #ff8b3d';setTimeout(()=>node.style.outline=outline,2200);}catch(e){showError(e);}}
$('.model-settings').onclick=()=>{try{if(!port)connect();port.postMessage({type:'open-settings'});}catch(e){showError(e);}};
$('.retry-source').onclick=prepare;$('.launch').onclick=open;$('.close').onclick=close;$('.check').onclick=prepare;$('.cancel').onclick=()=>{epoch++;port?.postMessage({type:'cancel'});busy(false);status('正在取消…');};$('.clear').onclick=()=>{if(!running&&source)port?.postMessage({type:'clear',account,source});};
$('.generate').onclick=async()=>{if(running||!source||!ready)return;phase='正在准备分析';const mark=epoch;busy(true);try{if((await context())!==account)throw Error('账号已切换，请重新打开速览');if(C.articleUrl(location.href)!==source.url)throw Error('文章已改变，请重新打开速览');const fresh=C.extract(document.querySelector('.article-body .editor-show'));source=C.source({...source,paragraphs:fresh.paragraphs,profile:$('textarea').value.trim()||C.DEFAULT_PROFILE});nodes=fresh.nodes;if(mark!==epoch||!running)return;await chrome.storage.local.set({[`preference:${await C.digest(account)}`]:source.profile});if(mark!==epoch||!running)return;status('正在提交分析…');port.postMessage({type:'generate',account,source,force:hasResult});}catch(e){busy(false);showError(e);}};
$('textarea').addEventListener('input',()=>{if(!running){hasResult=false;$('.result').replaceChildren();$('.clear').hidden=true;$('.generate').textContent='按新偏好生成';$('.intro').hidden=false;status('将按当前偏好生成新的筛选结果。');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shown)close();});chrome.runtime.onMessage.addListener(m=>{if(m.type==='longtalk-toggle')shown?close():open();});
function syncPage(){
 const changed=location.href!==route,eligible=supported();
 if(changed||(available&&!eligible)){route=location.href;epoch++;dropPort();source=null;ready=false;connectionState='idle';hasResult=false;busy(false);$('.result').replaceChildren();close();}
 available=eligible;$('.dock').hidden=!eligible||shown;if(!eligible)$('.panel').hidden=true;placeWidget();
}
setInterval(syncPage,700);
window.addEventListener('pagehide',()=>{epoch++;dropPort();});
const positionKey='longtalk:widget-position',defaultPosition={right:84,top:84};
let position={...defaultPosition},positionChanged=false;
function placeWidget(){const el=shown?$('.panel'):$('.dock'),rect=el.getBoundingClientRect();const point=C.widgetPosition(position,{width:innerWidth,height:innerHeight},{width:rect.width,height:rect.height});el.style.right=`${point.right}px`;el.style.top=`${point.top}px`;return point;}
function persistPosition(){positionChanged=true;chrome.storage.local.set({[positionKey]:position}).catch(()=>{});}
chrome.storage.local.get(positionKey).then(saved=>{if(!positionChanged&&saved[positionKey])position=saved[positionKey];placeWidget();}).catch(()=>{});
window.addEventListener('resize',placeWidget);
function makeDraggable(surface){
 let drag=null;
 surface.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.isPrimary||e.target.closest('button:not(.drag-handle),input,select,a'))return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:placeWidget(),original:position,moved:false};positionChanged=true;surface.setPointerCapture(e.pointerId);e.preventDefault();e.target.closest('.drag-handle')?.focus({preventScroll:true});
 });
 surface.addEventListener('dragstart',e=>e.preventDefault());
 surface.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;surface.classList.add('dragging');e.preventDefault();position={right:drag.start.right-dx,top:drag.start.top+dy};position=placeWidget();});
 const finish=e=>{if(!drag||drag.id!==e.pointerId)return;const current=drag;drag=null;surface.classList.remove('dragging');if(e.type==='pointercancel'){position=current.original;placeWidget();}else if(current.moved)persistPosition();if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(name,finish);
}
makeDraggable($('header'));makeDraggable($('.dock .drag-handle'));
for(const handle of root.querySelectorAll('.drag-handle')){
 handle.addEventListener('keydown',e=>{const directions={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(e.key==='Home')position={...defaultPosition};else if(directions[e.key]){const p=placeWidget(),[x,y]=directions[e.key],step=e.shiftKey?40:10;position={right:p.right+x*step,top:p.top+y*step};}else return;e.preventDefault();position=placeWidget();persistPosition();});
 handle.addEventListener('dblclick',()=>{position={...defaultPosition};placeWidget();persistPosition();});
}
syncPage();
})();
