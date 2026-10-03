(function(root){
'use strict';
const VERSION='1', DEFAULT_PROFILE='有新观点、有具体案例，能指导行动';
function articleUrl(raw){try{const u=new URL(raw),id=u.searchParams.get('id');return u.origin==='https://www.dedao.cn'&&u.pathname==='/course/article'&&/^[A-Za-z0-9]{8,100}$/.test(id||'')?`${u.origin}${u.pathname}?id=${id}`:'';}catch{return '';}}
function articleTitle(title){return typeof title==='string'&&title.endsWith(' - 得到APP')?title.slice(0,-' - 得到APP'.length).trim():'';}
function extract(editor){
 if(!editor)throw Error('尚未找到文字稿，请等正文加载后重试。');
 const blocks=[...editor.children], text=e=>(e.innerText||e.textContent||'').trim();
 const start=blocks.findIndex(e=>e.classList.contains('tag')&&['全文稿','文字稿'].includes(text(e)));
 if(start<0)throw Error('此页没有可识别的全文稿，暂不生成摘要。');
 const end=blocks.findIndex((e,i)=>i>start&&e.classList.contains('elite-module'));
 const nodes=blocks.slice(start+1,end<0?undefined:end).filter(e=>e.tagName==='P'&&text(e));
 const paragraphs=nodes.map((e,i)=>({id:`P${String(i+1).padStart(4,'0')}`,text:text(e)}));
 const size=paragraphs.reduce((n,p)=>n+p.text.length,0);
 if(paragraphs.length<5||size<500)throw Error('文字稿还不完整，请等待加载或确认当前账号有全文权限。');
 if(size>180000||paragraphs.length>5000||paragraphs.some(p=>p.text.length>20000))throw Error('本期正文超过处理上限，暂不生成。');
 return {paragraphs,nodes,size};
}
function source(value){
 if(!value||!articleUrl(value.url)||typeof value.title!=='string'||!value.title.trim()||value.title.length>300||typeof value.profile!=='string'||!value.profile.trim()||value.profile.length>400||!Array.isArray(value.paragraphs)||value.paragraphs.length<5||value.paragraphs.length>5000)throw Error('文字稿参数无效');
 const seen=new Set();let size=0;
 const paragraphs=value.paragraphs.map(p=>{if(!p||!/^P\d{4}$/.test(p.id)||seen.has(p.id)||typeof p.text!=='string'||!p.text.trim()||p.text.length>20000)throw Error('正文段落格式无效');seen.add(p.id);size+=p.text.length;return {id:p.id,text:p.text};});
 if(size<500||size>180000)throw Error('正文长度超出处理范围');
 return {url:articleUrl(value.url),title:value.title,profile:value.profile,paragraphs};
}
function validateResult(r,paragraphs){
 const text=x=>typeof x==='string'&&x.length>0&&x.length<=1000;
 if(!r||!text(r.summary)||!text(r.reason)||!['精选段落','完整观看','暂时跳过'].includes(r.verdict)||!Array.isArray(r.dimensions)||r.dimensions.length!==3||!Array.isArray(r.points)||r.points.length!==5||!Array.isArray(r.limitations)||r.limitations.length>8||!r.limitations.every(text))throw Error('摘要结构不完整，请重新生成');
 const names=['观点启发','具体案例','行动指导'];
 if(new Set(r.dimensions.map(x=>x.name)).size!==3||r.dimensions.some(x=>!names.includes(x.name)||!['较强','一般','较弱'].includes(x.level)||!text(x.reason)))throw Error('摘要维度异常');
 const ids=new Set(paragraphs.map(p=>p.id));
 if(r.points.some(x=>![x.insight,x.speaker,x.example,x.action].every(text)||!['嘉宾建议','由观点延伸','无明确行动'].includes(x.actionOrigin)||!Array.isArray(x.evidence)||x.evidence.length<1||x.evidence.length>3||x.evidence.some(id=>!ids.has(id))))throw Error('原文引用无效，请重新生成');
 return r;
}
async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function keys(account,s){if(typeof account!=='string'||!account||account.length>160)throw Error('请先登录得到账号');const group=await digest(account);return {group,key:`summary:${group}:${await digest(JSON.stringify([VERSION,s]))}`};}
const api={VERSION,DEFAULT_PROFILE,articleUrl,articleTitle,extract,source,validateResult,digest,keys};
if(typeof module!=='undefined')module.exports=api;else root.LongtalkCore=Object.freeze(api);
})(globalThis);
