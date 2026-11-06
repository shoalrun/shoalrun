import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const entry = async () => (await readFile(new URL('../assets/print.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');

test('native print fallback expands details and restores the original page', async () => {
  const events=new Map<string,()=>void>(),details={open:false};
  vm.runInNewContext(await entry(),{document:{querySelectorAll:(selector:string)=>selector==='[data-print-page]'?[]:[details],querySelector:()=>null},window:{addEventListener:(name:string,fn:()=>void)=>events.set(name,fn)}});
  events.get('beforeprint')!();assert.equal(details.open,true);
  events.get('afterprint')!();assert.equal(details.open,false);
});

test('branded printing opens synchronously and fetches only shared static settings', async () => {
  let click!:()=>Promise<void>,opened=0,populated=0,printed=0;
  const requested:string[]=[];
  const view={closed:false,document:{title:'',body:{textContent:'',append(){}},createTextNode:(text:string)=>text}};
  const button={hidden:true,disabled:false,dataset:{printSettings:'/help/assets/print/settings.json'},addEventListener(_name:string,fn:()=>Promise<void>){click=fn;}};
  const status={textContent:''},metadata={title:'Current page',publication:{version:'v2'}};
  const source={location:{href:'https://docs.example/help/page',origin:'https://docs.example'},querySelectorAll:()=>[button],querySelector:(selector:string)=>selector==='[data-print-status]'?status:{textContent:JSON.stringify(metadata)}};
  vm.runInNewContext(await entry(),{URL,AbortController,setTimeout,clearTimeout,document:source,window:{open:()=>{opened++;return view;},addEventListener(){}},fetch:async(url:string)=>{requested.push(url);return{ok:true,text:async()=>JSON.stringify({schemaVersion:1,stylesheet:'/help/assets/print/theme.css'})};},populatePrintView:async(target:unknown,original:unknown,page:any)=>{assert.equal(target,view);assert.equal(original,source);assert.equal(page.title,metadata.title);populated++;return()=>{printed++;};}});
  assert.equal(button.hidden,false);
  const job=click();assert.equal(opened,1);await job;
  assert.deepEqual(requested,['https://docs.example/help/assets/print/settings.json']);
  assert.equal(populated,1);assert.equal(printed,1);assert.equal(status.textContent,'');assert.equal(button.disabled,false);
});

test('popup refusal leaves the page usable and offers native printing', async () => {
  let click!:()=>Promise<void>;
  const status={textContent:''},button={hidden:true,disabled:false,addEventListener(_name:string,fn:()=>Promise<void>){click=fn;}};
  for (const open of [()=>null,()=>{throw Error('browser policy');}]) {
    vm.runInNewContext(await entry(),{document:{querySelectorAll:()=>[button],querySelector:()=>status},window:{open,addEventListener(){}}});
    await click();assert.equal(button.disabled,false);assert.match(status.textContent,/Allow the print view/);
  }
});

test('copying Markdown targets the Markdown link when a PDF action precedes it', async () => {
  const source=await readFile(new URL('../assets/copy-markdown.js',import.meta.url),'utf8');
  let click!:()=>Promise<void>, fetched='', copied='';
  const attributes=new Map<string,string>();
  const button={hidden:true,addEventListener(_type:string,fn:()=>Promise<void>){click=fn;},getAttribute:(key:string)=>attributes.get(key),setAttribute:(key:string,value:string)=>attributes.set(key,value),removeAttribute:(key:string)=>attributes.delete(key)};
  const status={textContent:''};
  const markdown={href:'https://docs.example/guide.md'},pdf={href:'https://docs.example/__shoalrun/pdf?key=example'};
  vm.runInNewContext(source,{
    document:{querySelector:(selector:string)=>selector==='[data-copy-markdown]'?button:selector==='[data-copy-markdown-status]'?status:selector==='[data-markdown-link]'?markdown:pdf},
    navigator:{clipboard:{writeText:async(value:string)=>{copied=value;}}},
    fetch:async(url:string)=>{fetched=url;return {ok:true,text:async()=>'# Guide\n'};}
  });
  await click();
  assert.equal(fetched,markdown.href);
  assert.equal(copied,'# Guide\n');
  assert.equal(status.textContent,'Markdown copied.');
});
