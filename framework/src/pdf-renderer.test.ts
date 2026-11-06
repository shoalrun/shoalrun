import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { preparePdfDocument, renderPreparedPdf, pdfRequestResponse, type PdfRenderInput } from './pdf-renderer.js';
import { mergePdfConfig, validatePdfConfig } from './pdf-config.js';

const fixture = (base: string): PdfRenderInput => ({ documents: [{id:'first',title:'First & second',html:'<h1>First</h1><p>Readable text.</p>'},{id:'last',title:'Last',html:'<h1>Last</h1>'}], title:'Guide <script>',publication:{product:'sample',language:'en'},assets:new Map(),publicBase:'/',config:{cover:true,toc:true},configFile:path.join(base,'docs.config.yaml') });
async function temporary(t: any) { const dir = await mkdtemp(path.join(os.tmpdir(),'shoalrun-pdf-')); t.after(()=>rm(dir,{recursive:true,force:true})); return dir; }

test('PDF configuration validates local typography, bounded rendering, and style inheritance', () => {
  assert.deepEqual(mergePdfConfig({size:'Letter',margins:{left:'20mm'},cover:true},{margins:{top:'12mm'},cover:false}),{size:'Letter',margins:{left:'20mm',top:'12mm'},cover:false});
  for (const config of [{stylesheet:'https://example.org/style.css'},{timeout:0},{timeout:120001},{margins:{left:'auto'}},{fonts:[{family:'Test',source:'file:///etc/passwd'}]},{footer:'{unknown}'},{javascript:true}]) assert.throws(()=>validatePdfConfig(config));
  assert.equal(validatePdfConfig({footer:'{title} — {page}/{pages}'}).footer,'{title} — {page}/{pages}');
});

test('print document escapes metadata, builds linked contents, and retains chapter anchors', async t => {
  const base=await temporary(t), input=fixture(base);
  input.config.stylesheet='./print.css'; await writeFile(path.join(base,'print.css'),':root{--pdf-accent:#a23456}h1{break-before:avoid}');
  const result=await preparePdfDocument(input);
  assert.match(result.html, /Guide &lt;script&gt;/);
  assert.match(result.html, /href="#pdf-document-2">Last/);
  assert.match(result.html, /id="pdf-document-1"/);
  assert.match(result.html, /--pdf-accent:#a23456/);
  assert.match(result.html, /script-src 'none'/);
  const changed=await preparePdfDocument({...input,config:{...input.config,stylesheet:undefined}});
  assert.notEqual(result.styleDigest, changed.styleDigest);
});

test('PDF preparation rejects remote, missing, active and escaping resources', async t => {
  const base=await temporary(t), input=fixture(base);
  for (const html of ['<img src="https://example.org/x.png">','<img src="/missing.png">','<script>alert(1)</script>','<p onclick="alert(1)">x</p>']) await assert.rejects(preparePdfDocument({...input,documents:[{id:'x',title:'X',html}]}),/PDF/);
  const outside=await temporary(t);await writeFile(path.join(outside,'print.css'),'h1{color:red}');
  await assert.rejects(preparePdfDocument({...input,config:{stylesheet:path.join(outside,'print.css')}}),/escapes asset roots/);
  for(const css of ['@import "https://example.org/x";','body{background:url(https://example.org/x)}','h1{color:r\\65 d}', 'body{background-image:image-set("https://example.invalid/print-pixel.png" 1x)}', 'body{background-image:-webkit-image-set("https://example.invalid/pixel.png" 1x)}']) {
    await writeFile(path.join(base,'print.css'),css);
    await assert.rejects(preparePdfDocument({...input,config:{stylesheet:'print.css'}}),/must not/);
  }
});

test('PDF preparation registers fonts and images by content without browser filesystem access', async t => {
  const base=await temporary(t), input=fixture(base);
  await writeFile(path.join(base,'font.woff2'),Buffer.from('font-fixture'));
  input.config.fonts=[{family:'Sample font',source:'font.woff2',weight:'400'}];
  input.assets.set('assets/icon.svg','<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  input.documents[0].html+='<img src="/assets/icon.svg" alt="Icon">';
  const result=await preparePdfDocument(input);
  assert.equal(result.assets.size,2);
  assert.match(result.html,/@font-face/);
  assert.match(result.html,/\/__pdf_fonts\/[a-f0-9]{64}\.woff2/);
  assert.doesNotMatch(result.html,/file:\/\//);
});

test('PDF rendering fails clearly without an explicitly configured browser', async t => {
  const previous=process.env.SHOALRUN_PDF_BROWSER, old=process.env.PUPPETEER_EXECUTABLE_PATH;
  delete process.env.SHOALRUN_PDF_BROWSER;delete process.env.PUPPETEER_EXECUTABLE_PATH;
  t.after(()=>{if(previous!==undefined)process.env.SHOALRUN_PDF_BROWSER=previous;if(old!==undefined)process.env.PUPPETEER_EXECUTABLE_PATH=old;});
  await assert.rejects(renderPreparedPdf({html:'',assets:new Map(),styleDigest:'x'},{}),/needs Chrome\/Chromium/);
});

test('PDF cover embeds a validated local logo and escapes subtitle text', async t => {
  const base=await temporary(t),input=fixture(base);
  await writeFile(path.join(base,'logo.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><rect width="100" height="20"/></svg>');
  input.config.logo='logo.svg';input.config.subtitle='Read <carefully> & share';
  const prepared=await preparePdfDocument(input);
  assert.match(prepared.html,/class="pdf-logo" src="\/__pdf_logo\/[a-f0-9]{64}\.svg"/);
  assert.match(prepared.html,/Read &lt;carefully&gt; &amp; share/);
  assert.equal(prepared.assets.size,1);
  await writeFile(path.join(base,'unsafe.svg'),'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
  await assert.rejects(preparePdfDocument({...input,config:{logo:'unsafe.svg'}}),/event handlers/);
});

test('configured Chromium renders cover, linked chapters, bookmarks, tags, and embedded fonts', {skip: !(process.env.SHOALRUN_PDF_BROWSER || process.env.PUPPETEER_EXECUTABLE_PATH)}, async t => {
  const base=await temporary(t), input=fixture(base);
  input.config={...input.config,executablePath:process.env.SHOALRUN_PDF_BROWSER ?? process.env.PUPPETEER_EXECUTABLE_PATH,footer:'{page} / {pages}',bookmarks:true,timeout:30000};
  input.documents[0].html='<h1 id="first-heading">First chapter</h1><p><a href="#last-heading">Read the last chapter</a></p><p><a href="https://example.org/">External reference</a></p><pre><code>const answer = 42;</code></pre>';
  input.documents[1].html='<h1 id="last-heading">Last chapter</h1><p>Final chapter body.</p>';
  const result=await renderPreparedPdf(await preparePdfDocument(input),input.config);
  assert.equal(result.bytes.subarray(0,5).toString(),'%PDF-');
  assert.ok(result.bytes.length>5000);
  const serialized=result.bytes.toString('latin1');
  assert.match(serialized,/\/Outlines\b/);
  assert.match(serialized,/\/StructTreeRoot\b/);
  assert.match(serialized,/\/FontFile[23]?\b/);
  assert.match(serialized,/\/URI\b/);
  assert.equal(result.metadata.engine,'chromium');
  assert.match(result.metadata.browserVersion,/Chrome|Chromium/);
  assert.match(result.metadata.styleDigest,/^[a-f0-9]{64}$/);
});


test('single-page PDF payload excludes unrelated publication assets', async t => {
  const base=await temporary(t), input=fixture(base);
  input.documents=[input.documents[0]];
  input.documents[0].html+='<img src="/assets/selected.svg" alt="Selected">';
  const selected='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
  input.assets.set('assets/selected.svg',selected);
  input.assets.set('assets/other-page.svg','<svg xmlns="http://www.w3.org/2000/svg"><text>Other page private illustration</text></svg>');
  input.assets.set('assets/unused.png',Buffer.from('not decoded or retained'));
  const prepared=await preparePdfDocument(input);
  assert.deepEqual([...prepared.assets.keys()],['/assets/selected.svg']);
  assert.equal(prepared.assets.get('/assets/selected.svg')!.bytes.toString(),selected);
  assert.doesNotMatch(prepared.html,/Other page private illustration|other-page\.svg|unused\.png/);
});


test('print request resolver grants only exact offline resources and an empty favicon', () => {
  const prepared={html:'<p>Print</p>',assets:new Map([['/assets/icon.svg',{bytes:Buffer.from('<svg/>'),mediaType:'image/svg+xml'}]]),styleDigest:'x'};
  assert.deepEqual(pdfRequestResponse(prepared,'https://pdf.shoalrun.invalid/favicon.ico','other',false),{status:204,body:''});
  assert.equal(pdfRequestResponse(prepared,'https://pdf.shoalrun.invalid/__print','document',true)?.status,200);
  assert.equal(pdfRequestResponse(prepared,'https://pdf.shoalrun.invalid/assets/icon.svg','image',false)?.status,200);
  for(const url of ['https://example.org/favicon.ico','https://pdf.shoalrun.invalid/favicon.ico?x=1','https://pdf.shoalrun.invalid/favicon.ico#x','https://pdf.shoalrun.invalid/unknown','file:///favicon.ico','https://u:p@pdf.shoalrun.invalid/favicon.ico']) assert.equal(pdfRequestResponse(prepared,url,'other',false),undefined);
  assert.equal(pdfRequestResponse(prepared,'https://pdf.shoalrun.invalid/favicon.ico','document',true),undefined);
  assert.equal(pdfRequestResponse(prepared,'https://pdf.shoalrun.invalid/favicon.ico','other',false,'POST'),undefined);
  assert.equal(pdfRequestResponse(prepared,'https://pdf.shoalrun.invalid/assets/icon.svg','script',false),undefined);
});
