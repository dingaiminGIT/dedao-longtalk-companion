const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const P=require('../extension/providers.js'),C=require('../extension/core.js'),spec=require('../extension/analysis-spec.json');
const settings=()=>P.config({provider:'custom',baseUrl:'http://127.0.0.1:1234/v1',model:'test'});
const summary=()=>({summary:'摘要',verdict:'精选段落',reason:'理由',dimensions:['观点启发','具体案例','行动指导'].map(name=>({name,level:'一般',reason:'原文依据'})),points:Array.from({length:5},()=>({insight:'观点',speaker:'嘉宾',reasoning:'论证',example:'案例',action:'行动',boundary:'局限',actionOrigin:'由观点延伸',evidence:['P0001']})),limitations:['原文局限']});
const transcript=()=>({url:'https://www.dedao.cn/course/article?id=ExampleArticle1234',title:'测试',profile:'观点案例行动',paragraphs:Array.from({length:5},(_,i)=>({id:`P000${i+1}`,text:'正文'.repeat(600)}))});
function response(value){return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});}
test('API configuration restricts destinations and rejects full endpoint URLs',()=>{
 for(const baseUrl of ['http://evil.test','file:///tmp/model','https://user:secret@api.test','https://api.test/?key=secret','https://api.test/v1/chat/completions'])assert.throws(()=>P.config({baseUrl}));
 assert.equal(settings().baseUrl,'http://127.0.0.1:1234/v1');assert.equal(P.config({mode:'workbuddy'}).model,'');
});
test('oversized paragraphs are split without inventing reference IDs',()=>{const chunks=P.split([{id:'P0001',text:'文'.repeat(9500)},{id:'P0002',text:'尾'}],4000);assert.equal(chunks.length,3);assert.equal(chunks.flat().map(x=>x.text).join(''),'文'.repeat(9500)+'尾');assert.deepEqual([...new Set(chunks.flat().map(x=>x.id))],['P0001','P0002']);});
test('real HTTP streaming request preserves UTF-8 across chunks and omits cookies',async()=>{
 let observed;const server=http.createServer(async(req,res)=>{let raw='';for await(const x of req)raw+=x;observed={headers:req.headers,body:JSON.parse(raw),url:req.url};res.writeHead(200,{'Content-Type':'text/event-stream'});const body=Buffer.from('data: '+JSON.stringify({choices:[{delta:{content:'{"text":"中文"}'}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');for(let i=0;i<body.length;i+=3)res.write(body.subarray(i,i+3));res.end();});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const s={...settings(),baseUrl:`http://127.0.0.1:${server.address().port}/v1`};assert.deepEqual(await P.completion(s,'test-key',[{role:'user',content:'JSON test'}],new AbortController().signal),{text:'中文'});assert.equal(observed.url,'/v1/chat/completions');assert.equal(observed.headers.authorization,'Bearer test-key');assert.equal(observed.headers.cookie,undefined);assert.equal(observed.body.stream,true);}finally{await new Promise(r=>server.close(r));}
});
test('requests prohibit redirects and never expose error response bodies',async()=>{
 await assert.rejects(P.completion(settings(),'key',[],null,{fetcher:async(_,init)=>{assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');return new Response('SECRET',{status:401});}}),e=>/API Key/.test(e.message)&&!e.message.includes('SECRET'));
});
test('truncation, tool calls and broken streams are rejected',async()=>{
 for(const value of [{message:{content:'{"ok":true}'},finish_reason:'length'},{message:{content:'{"ok":true}',tool_calls:[{}]},finish_reason:'tool_calls'}])await assert.rejects(P.completion(settings(),'key',[],null,{fetcher:async()=>new Response(JSON.stringify({choices:[value]}))}));
 await assert.rejects(P.completion(settings(),'key',[],null,{fetcher:async()=>new Response('data: {"choices":[{"delta":{"content":"{}"}}]}\n',{headers:{'content-type':'text/event-stream'}})}),/断开/);
 const abort=new AbortController();abort.abort();await assert.rejects(P.completion(settings(),'key',[],abort.signal),{name:'AbortError'});
});
test('long input passes through chunk notes and final schema validation',async()=>{
 let calls=0;const progress=[],s={...settings(),chunkChars:4000};const output=await P.analyze(s,'key',transcript(),spec,new AbortController().signal,m=>progress.push(m),{fetcher:async(_,init)=>{calls++;const payload=JSON.parse(init.body),input=JSON.parse(payload.messages[1].content);if(input.paragraphs)return response({notes:[{insight:'观点',reasoning:'论证',example:'具体案例',action:'行动',boundary:'边界',evidence:[input.paragraphs[0].id]}]});assert.equal(input.notes.length,2);assert.equal(input.paragraphs,undefined);return response(summary());}});
 assert.equal(calls,3);C.validateResult(output,transcript().paragraphs);assert.match(progress[0],/1\/2/);assert.match(progress.at(-1),/合并/);
});
test('hallucinated chunk references stop analysis before final synthesis',async()=>{let calls=0;await assert.rejects(P.analyze({...settings(),chunkChars:4000},'key',transcript(),spec,null,()=>{},{fetcher:async()=>{calls++;return response({notes:[{insight:'观点',reasoning:'论证',example:'案例',action:'行动',boundary:'边界',evidence:['P9999']}]});}}),/本段之外的引用/);assert.equal(calls,2);});
test('DeepSeek reserves the short test response for JSON rather than default thinking',async()=>{
 const s=P.config({provider:'deepseek',baseUrl:'https://api.deepseek.com/v1',model:'deepseek-flash'});
 const value=await P.completion(s,'test-key',[{role:'user',content:'只输出 JSON'}],null,{maxTokens:256,fetcher:async(_,init)=>{const body=JSON.parse(init.body);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.max_tokens,256);assert.equal(body.response_format.type,'json_object');return response({ok:true});}});assert.equal(value.ok,true);
});
test('missing note fields are retried once and normalized without accepting invented references',async()=>{
 let calls=0;const s={...settings(),chunkChars:4000};const r=await P.analyze(s,'key',transcript(),spec,null,()=>{},{fetcher:async(_,init)=>{calls++;const messages=JSON.parse(init.body).messages,input=JSON.parse(messages[1].content);if(input.notes)return response(summary());return response({notes:[{insight:'观点',reasoning:'论证',example:calls===1?'':'案例',action:'行动',boundary:'边界',evidence:[input.paragraphs[0].id],extra:'not retained'}]});}});assert.equal(calls,4);C.validateResult(r,transcript().paragraphs);
});

test('SSE envelope overhead may exceed 2 MB without allowing oversized model content',async()=>{
 const frame=x=>'data: '+JSON.stringify(x)+'\n\n';
 const overhead=frame({id:'x'.repeat(300),choices:[{delta:{}}]}).repeat(6500);
 const end=frame({choices:[{delta:{content:'{"ok":true}'},finish_reason:'stop'}]})+'data: [DONE]\n\n';
 assert.ok(Buffer.byteLength(overhead+end)>2_000_000);
 assert.deepEqual(await P.completion(settings(),'key',[],null,{fetcher:async()=>new Response(overhead+end,{headers:{'content-type':'text/event-stream'}})}),{ok:true});
 const huge=frame({choices:[{delta:{content:'x'.repeat(256001)}}]});
 await assert.rejects(P.completion(settings(),'key',[],null,{fetcher:async()=>new Response(huge,{headers:{'content-type':'text/event-stream'}})}),/正文过大/);
});

test('intermediate notes preserve additional valid evidence without weakening citation checks',()=>{
 const paragraphs=Array.from({length:8},(_,i)=>({id:`P${String(i+1).padStart(4,'0')}`,text:'原文'}));
 const note={insight:'观点',reasoning:'论证',example:'案例',action:'行动',boundary:'边界',evidence:paragraphs.map(p=>p.id)};
 const notes=Array.from({length:7},()=>({...note}));assert.equal(P.validateNotes({notes},paragraphs).length,7);assert.equal(P.validateNotes({notes},paragraphs)[0].evidence.length,8);
 assert.throws(()=>P.validateNotes({notes:[{...note,evidence:['P9999']}]},paragraphs),/本段之外/);
 assert.throws(()=>P.validateNotes({notes:Array(13).fill(note)},paragraphs),/1～12/);
});

test('final schema is corrected once without repeating successful transcript chunks',async()=>{
 let chunks=0,finals=0;
 const r=await P.analyze({...settings(),chunkChars:4000},'key',transcript(),spec,null,()=>{},{validateResult:C.validateResult,fetcher:async(_,init)=>{
  const input=JSON.parse(JSON.parse(init.body).messages[1].content);
  if(input.paragraphs){chunks++;return response({notes:[{insight:'观点',reasoning:'论证',example:'案例',action:'行动',boundary:'边界',evidence:[input.paragraphs[0].id]}]});}
  finals++;const r=summary();if(finals===1)r.verdict='建议阅读';return response(r);
 }});assert.equal(chunks,2);assert.equal(finals,2);C.validateResult(r,transcript().paragraphs);
});
test('overlong summaries select whole existing points using validated indices',async()=>{
 let calls=0;const r=await P.analyze(settings(),'key',transcript(),spec,null,()=>{},{validateResult:C.validateResult,fetcher:async(_,init)=>{calls++;const input=JSON.parse(JSON.parse(init.body).messages[1].content);if(input.candidates)return response({indices:[0,2,4,6,8,10,12,14]});const r=summary();r.points=Array.from({length:15},(_,i)=>({...r.points[0],insight:'观点'+i}));return response(r);}});
 assert.equal(calls,2);assert.equal(r.points.length,8);assert.equal(r.points.at(-1).insight,'观点14');C.validateResult(r,transcript().paragraphs);
});
test('official DeepSeek 1M models send the entire long transcript without chunk notes',async()=>{
 const s=P.config({provider:'deepseek',baseUrl:'https://api.deepseek.com/v1',model:'deepseek-flash',chunkChars:16000});
 const source={...transcript(),paragraphs:Array.from({length:67},(_,i)=>({id:`P${String(i+1).padStart(4,'0')}`,text:'文'.repeat(1000)}))};
 let calls=0;const progress=[];
 const r=await P.analyze(s,'key',source,spec,null,m=>progress.push(m),{validateResult:C.validateResult,fetcher:async(_,init)=>{calls++;const input=JSON.parse(JSON.parse(init.body).messages[1].content);assert.equal(input.paragraphs.length,67);assert.equal(input.paragraphs.at(-1).id,'P0067');assert.equal(input.notes,undefined);return response(summary());}});
 assert.equal(calls,1);assert.ok(progress[0].includes('阅读全文'));C.validateResult(r,source.paragraphs);
});
test('full-text selection respects explicit overrides and does not assume unknown endpoints support 1M',()=>{
 const base={provider:'deepseek',baseUrl:'https://api.deepseek.com/v1',model:'deepseek-flash'};
 assert.equal(P.usesFullText(P.config(base)),true);
 assert.equal(P.usesFullText(P.config({...base,model:'deepseek-v4-pro'})),true);
 for(const change of [{model:'unknown'},{provider:'custom'},{baseUrl:'https://other.example/v1'},{baseUrl:'https://api.deepseek.com/proxy'},{inputMode:'chunks'}])assert.equal(P.usesFullText(P.config({...base,...change})),false);
 assert.equal(P.usesFullText(P.config({...base,provider:'custom',inputMode:'full'})),true);
 assert.throws(()=>P.config({...base,inputMode:'invalid'}),/处理方式/);
});
