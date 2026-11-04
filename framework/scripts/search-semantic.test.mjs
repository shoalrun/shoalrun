import assert from 'node:assert/strict';
import {test} from 'node:test';
const variant='production|7.1|en';
const context={variant,language:'en',indexUrl:'/manual/search-index.json',limit:5,readerSelection:{product:['windows']}};
const index={schemaVersion:1,documents:[
  {url:'/manual/7.1/connection',title:'Connection',summary:'Fix missing events.',variant,headings:[],text:'An endpoint stopped sending events.',readerFilters:{product:['windows']}},
  {url:'/manual/6.5/connection',title:'Connection',summary:'Old instructions.',variant:'production|6.5|en',headings:[],text:'An endpoint stopped sending events.'},
  {url:'/manual/7.1/mac',title:'Connection',summary:'Another product.',variant,headings:[],text:'An endpoint stopped sending events.',readerFilters:{product:['mac']}}
]};
let counter=0;
const provider=()=>import(new URL(`../assets/search-semantic.js?test=${++counter}`,import.meta.url));
function mock(t,handler){const old=globalThis.fetch;globalThis.fetch=handler;t.after(()=>{globalThis.fetch=old;});}
const fallback=()=>Response.json(index);

test('built-in semantic search sends publication and reader scope to its sibling endpoint',async t=>{
  const calls=[];
  mock(t,async(url,options)=>{calls.push({url,options});return Response.json({mode:'vector',results:[{url:'/manual/7.1/connection',title:'Connection'}]});});
  const module=await provider();
  assert.deepEqual(await module.search('missing events',context),[{url:'/manual/7.1/connection',title:'Connection'}]);
  assert.equal(calls.length,1);
  assert.ok(calls[0].url.endsWith('/framework/__shoalrun/search'));
  assert.deepEqual(JSON.parse(calls[0].options.body),{query:'missing events',variant,limit:5,readerSelection:{product:['windows']}});
  assert.equal(calls[0].options.headers['Content-Type'],'application/json');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
});

test('a missing endpoint falls back within scope and is not repeatedly requested',async t=>{
  let endpoints=0;
  mock(t,async url=>{if(url===context.indexUrl)return fallback();endpoints++;return new Response('',{status:404});});
  const module=await provider();
  for(let at=0;at<2;at++)assert.deepEqual((await module.search('events',context)).map(hit=>hit.url),['/manual/7.1/connection']);
  assert.equal(endpoints,1);
});

test('temporary errors and invalid responses retain keyword fallback without disabling future semantic requests',async t=>{
  for(const response of [()=>new Response('',{status:503}),()=>new Response('not JSON'),()=>Response.json({results:null}),()=>{throw new Error('network offline');}]){
    let endpoints=0;
    const previous=globalThis.fetch;
    globalThis.fetch=async url=>{if(url===context.indexUrl)return fallback();endpoints++;if(endpoints===1)return response();return Response.json({results:[{url:'/semantic',title:'Recovered'}]});};
    const module=await provider();
    assert.deepEqual((await module.search('events',context)).map(hit=>hit.url),['/manual/7.1/connection']);
    assert.equal((await module.search('events',context))[0].url,'/semantic');
    globalThis.fetch=previous;
  }
});

test('short queries do not spend query embeddings',async t=>{
  let endpoints=0;
  mock(t,async url=>{if(url===context.indexUrl)return fallback();endpoints++;throw new Error('unnecessary endpoint call');});
  const module=await provider();await module.search('ev',context);assert.equal(endpoints,0);
});

test('cancelled typing aborts debounce instead of sending a request or running fallback',async t=>{
  let calls=0;mock(t,async()=>{calls++;return fallback();});
  const module=await provider();const controller=new AbortController();
  const pending=module.search('events',{...context,signal:controller.signal});
  controller.abort(new DOMException('New query','AbortError'));
  await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,0);
});

test('cancellation during an endpoint request does not start a fallback fetch',async t=>{
  let calls=0;const controller=new AbortController();
  mock(t,async(url,options)=>{calls++;controller.abort(new DOMException('New query','AbortError'));options.signal.throwIfAborted();});
  const module=await provider();
  await assert.rejects(module.search('events',{...context,signal:controller.signal}),{name:'AbortError'});
  assert.equal(calls,1);
});
