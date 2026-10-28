import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer';

test('repeated content mounts scope anchors, ARIA and self links independently and unmount only owned nodes', async t => {
  const framework = process.env.SHOALRUN_TEST_PACKAGE ?? fileURLToPath(new URL('..', import.meta.url));
  const allowed = new Set(['content-delivery.js','content-delivery-contract.js','content-mount.js','content-delivery-validation.js','content-delivery-transport.js','content-rest-client.js','content-rest-contract.js']);
  const server = createServer(async (request,response)=>{
    const pathname=new URL(request.url!,'http://localhost').pathname;
    if(pathname==='/') {response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><html><body><div id="first"></div><div id="second"></div><script type="module">import {mountContent,openManifestContentSource,openRestContentSource} from "/content-delivery.js";window.mountContent=mountContent;window.openContentSource=openManifestContentSource;window.openRestContentSource=openRestContentSource;</script></body></html>');return;}
    const name=pathname.slice(1);if(!allowed.has(name)){response.writeHead(404);response.end();return;}
    response.writeHead(200,{'Content-Type':'text/javascript'});response.end(await readFile(path.join(framework,'dist',name)));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());}));
  const browser=await puppeteer.launch();t.after(()=>browser.close());const page=await browser.newPage();
  const errors:string[]=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${(server.address() as any).port}/`);await page.waitForFunction(()=>typeof (window as any).mountContent==='function');
  const state=await page.evaluate(()=>{
    const mount=(window as any).mountContent;const first=document.querySelector('#first')!;const second=document.querySelector('#second')!;
    const ref={kind:'section',documentId:'guide.billing',sectionId:'refunds'};
    const representation={anchors:[{id:'refunds',exportedId:'sr-refunds'},{id:'details',exportedId:'sr-details'}],links:[{key:'self',kind:'resource',href:'/help/content/refunds.html#sr-refunds',ref,fragment:'refunds'}]};
    const result={format:'html',revision:'revision',resource:{ref},representation,content:'<h2 id="sr-refunds">Refunds</h2><p id="sr-details">Ask support.</p><section aria-labelledby="sr-refunds" aria-describedby="sr-details"><a href="#sr-details">Details</a><a data-export-link="self" href="/help/content/refunds.html#sr-refunds">Refunds</a></section>'};
    const a=mount(first,result,{instanceId:'first-help'});const b=mount(second,result,{instanceId:'second-help'});
    const ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
    const view={ids,firstAnchor:a.anchors[0].exportedId,secondAnchor:b.anchors[0].exportedId,firstAria:first.querySelector('section')!.getAttribute('aria-labelledby'),secondAria:second.querySelector('section')!.getAttribute('aria-describedby'),firstLocal:first.querySelector('a')!.getAttribute('href'),secondSelf:second.querySelector('[data-export-link]')!.getAttribute('href'),selfMetadata:b.links[0].href};
    let collision=false;try{mount(second,result,{instanceId:'first-help'});}catch(error){collision=(error as any).code==='invalid_content';}
    const collisionContainer=document.createElement('div');collisionContainer.id='conflict-sr-refunds';document.body.append(collisionContainer);let containerCollision=false;try{mount(collisionContainer,result,{instanceId:'conflict'});}catch(error){containerCollision=(error as any).code==='invalid_content';}
    const before=second.innerHTML;const controller=new AbortController();controller.abort();let aborted=false;try{mount(second,result,{signal:controller.signal});}catch(error){aborted=(error as any).name==='AbortError';}
    const newer=mount(first,result,{instanceId:'new-help'});a.unmount();const newerSurvives=!!first.querySelector('#new-help-sr-refunds');newer.unmount();
    return {...view,collision,containerCollision,aborted,abortUnchanged:second.innerHTML===before,newerSurvives,ownedUnmount:first.childNodes.length===0};
  });
  assert.equal(new Set(state.ids).size,state.ids.length);
  assert.equal(state.firstAnchor,'first-help-sr-refunds');assert.equal(state.secondAnchor,'second-help-sr-refunds');
  assert.equal(state.firstAria,'first-help-sr-refunds');assert.equal(state.secondAria,'second-help-sr-details');
  assert.equal(state.firstLocal,'#first-help-sr-details');assert.equal(state.secondSelf,'#second-help-sr-refunds');assert.equal(state.selfMetadata,'#second-help-sr-refunds');
  assert.ok(state.collision&&state.containerCollision&&state.aborted&&state.abortUnchanged&&state.newerSurvives&&state.ownedUnmount);
  assert.equal(await page.evaluate(async () => { try { await (window as any).openContentSource({manifestUrl:'https://different-origin.example/help/manifest.json'}); return false; } catch (error) { return (error as any).code === 'invalid_manifest'; } }), true);
  assert.equal(await page.evaluate(async () => { try { await (window as any).openRestContentSource({baseUrl:'https://different-origin.example/content/v1',publication:{channel:'production',version:'current',language:'en'}}); return false; } catch (error) { return (error as any).code === 'invalid_manifest'; } }), true);
  assert.deepEqual(errors,[]);
});

test('content example preserves cached pages and ignores stale success or failure after teardown', async t => {
  const framework = process.env.SHOALRUN_TEST_PACKAGE ?? fileURLToPath(new URL('..', import.meta.url));
  const app = await readFile(path.join(framework, 'examples/content-delivery/app.js'), 'utf8');
  // Deliberately ignore abort in this fake transport: UI generation guards must
  // also protect against providers which finish after cancellation.
  const transport = `
    let completeOpen;
    const requests=[];
    const source={dispose(){window.harness.disposals++;},get(ref){return new Promise((resolve,reject)=>requests.push({ref,resolve,reject}));}};
    window.harness={requests,disposals:0,mounts:0,openReady:false,
      completeOpen(){completeOpen(source);},
      resolve(index,label){requests[index].resolve({content:'<h2>'+label+'</h2>'});},
      fulfill(index,result){requests[index].resolve(result);},
      reject(index){requests[index].reject(new Error('Delayed failure'));}};
    export function openManifestContentSource(){window.harness.openReady=true;return new Promise(resolve=>{completeOpen=resolve;});}
    export const openRestContentSource = openManifestContentSource;
    export function mountContent(container,result){window.harness.mounts++;container.innerHTML=result.content;const nodes=[...container.childNodes];return {anchors:result.anchors??[],links:result.links??[],unmount(){nodes.forEach(node=>{if(node.parentNode===container)node.remove();});}};}
  `;
  const server = createServer((request,response)=>{
    const route=new URL(request.url!,'http://localhost').pathname;
    if(route==='/app.js'||route==='/shoalrun/content-delivery.js'){response.writeHead(200,{'Content-Type':'text/javascript'});response.end(route==='/app.js'?app:transport);return;}
    response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><html><body><button id="page-help">Page</button><button id="section-help">Section</button><p id="status"></p><div id="plan-note"></div><div id="invoice-note"></div><aside id="drawer" hidden><button id="close">Close</button><div id="help-content"></div></aside><script type="module" src="/app.js"></script></body></html>');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());}));
  const browser=await puppeteer.launch();t.after(()=>browser.close());
  const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const errors:string[]=[];
  const open = async () => { const page=await browser.newPage(); page.on('pageerror',error=>errors.push(String(error))); await page.goto(origin); await page.waitForFunction(()=>(window as any).harness?.openReady); return page; };
  const first=await open();
  await first.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));(window as any).harness.completeOpen();});
  await first.waitForFunction(()=>(window as any).harness.disposals===1);
  assert.deepEqual(await first.evaluate(()=>({requests:(window as any).harness.requests.length,mounts:(window as any).harness.mounts,status:document.querySelector('#status')!.textContent})),{requests:0,mounts:0,status:''});

  for(const failure of [false,true]) {
    const page=await open(); await page.evaluate(()=>(window as any).harness.completeOpen()); await page.waitForFunction(()=>(window as any).harness.requests.length===1);
    await page.evaluate(failure=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));const h=(window as any).harness;failure?h.reject(0):h.resolve(0,'Late note');},failure);
    await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
    assert.deepEqual(await page.evaluate(()=>({disposals:(window as any).harness.disposals,mounts:(window as any).harness.mounts,status:document.querySelector('#status')!.textContent})),{disposals:1,mounts:0,status:''});
  }
  const page=await open(); await page.evaluate(()=>(window as any).harness.completeOpen()); await page.waitForFunction(()=>(window as any).harness.requests.length===1);
  await page.evaluate(()=>(window as any).harness.resolve(0,'Refund window'));await page.waitForFunction(()=>(window as any).harness.mounts===2);
  await page.click('#page-help'); await page.waitForFunction(()=>(window as any).harness.requests.length===2);
  await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  await page.click('#section-help');await page.waitForFunction(()=>(window as any).harness.requests.length===3);
  await page.evaluate(()=>{const h=(window as any).harness;h.resolve(2,'Newer section');h.reject(1);});
  await page.waitForFunction(()=>document.querySelector('#help-content h2')?.textContent==='Newer section');
  assert.equal(await page.evaluate(()=>(window as any).harness.disposals),0);
  assert.equal(await page.$eval('#plan-note',node=>node.textContent),'Refund window');
  await page.click('#page-help');await page.waitForFunction(()=>(window as any).harness.requests.length===4);
  await page.click('#close');await page.evaluate(()=>(window as any).harness.reject(3));await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
  assert.equal(await page.$eval('#drawer',node=>(node as HTMLElement).hidden),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'page-help');
  await page.click('#page-help');await page.waitForFunction(()=>(window as any).harness.requests.length===5);
  await page.evaluate(()=>(window as any).harness.fulfill(4,{content:'<h2>Links</h2><a data-export-link="alias" href="#refunds">Jump</a>',links:[{key:'alias',kind:'resource',ref:{kind:'section',documentId:'guide.billing',sectionId:'refunds'},fragment:'refunds'}]}));
  await page.waitForSelector('#help-content a');await page.click('#help-content a');await page.waitForFunction(()=>(window as any).harness.requests.length===6);
  await page.evaluate(()=>(window as any).harness.fulfill(5,{content:'<span id="stable-alias" aria-hidden="true"></span><h2 id="visible-heading">Refund rules</h2>',anchors:[{id:'refunds',exportedId:'stable-alias'}]}));
  await page.waitForFunction(()=>document.activeElement?.id==='visible-heading');
  assert.deepEqual(errors,[]);
});
