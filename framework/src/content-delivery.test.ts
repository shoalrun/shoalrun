import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { openManifestContentSource, ContentDeliveryError, contentRefKey } from './content-delivery.js';
import type { ContentManifest, ContentSnapshot, ContentResource } from './content-delivery.js';

const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const publication = { channel: 'production', version: 'current', language: 'en' };
function fixture() {
  const content = '<h2 id="sr-refunds">Refunds</h2><p>Ask for a refund.</p>\n';
  const file = { path: 'content/refunds.html', mediaType: 'text/html', bytes: Buffer.byteLength(content), digest: digest(content) };
  const resource: ContentResource = { ref: { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' }, publication, title: 'Refunds', summary: 'Request a refund.', type: 'how-to', source: { documentId: 'guide.billing' }, representations: { html: { ...file, anchors: [{ id: 'refunds', exportedId: 'sr-refunds' }], links: [] } }, assets: [], externalDependencies: [] };
  const body = { schemaVersion: 1 as const, kind: 'shoalrun-content-export' as const, publicBase: '/help/', publication, review: { status: 'ok' as const, apis: [] }, resources: [resource], assets: [], files: [{ path: file.path, bytes: file.bytes, digest: file.digest }], diagnostics: [] };
  const manifest: ContentManifest = { ...body, digest: digest(JSON.stringify(body)) };
  return { content, manifest, resource };
}
function sign(manifest: ContentManifest) { const { digest: _, ...body } = manifest; manifest.digest = digest(JSON.stringify(body)); return manifest; }
function fakeFetch(manifest: ContentManifest, content: string, calls: Array<{ url: string; options?: RequestInit }> = []): typeof fetch {
  return (async (input: any, options?: RequestInit) => { const url = String(input); calls.push({ url, options }); return new Response(url.endsWith('manifest.json') ? JSON.stringify(manifest) : content, { headers: { 'content-type': url.endsWith('manifest.json') ? 'application/json' : 'text/html' } }); }) as typeof fetch;
}

async function contentContract(source: ContentSnapshot) {
  assert.equal(source.publication.language, 'en');
  assert.equal(source.list().length, 1);
  const found = source.list()[0];
  const result = await source.get(found.ref, { format: 'html' });
  assert.equal(contentRefKey(result.resource.ref), contentRefKey(found.ref));
  assert.equal(result.revision, source.revision);
  assert.match(result.content, /Ask for a refund/);
  await assert.rejects(source.get({ kind: 'page', documentId: 'missing' }, { format: 'html' }), (e: any) => e.code === 'not_found');
  await assert.rejects(source.get(found.ref, { format: 'markdown' }), (e: any) => e.code === 'unsupported_format');
}

test('manifest source pins metadata and verifies content with an injected transport', async () => {
  const f = fixture(); const calls: Array<{ url: string; options?: RequestInit }> = [];
  const source = await openManifestContentSource({ manifestUrl: 'https://docs.example/help/manifest.json', fetch: fakeFetch(f.manifest, f.content, calls) });
  await contentContract(source);
  assert.ok(Object.isFrozen(source.list()[0].representations.html));
  assert.equal(calls[1].url, 'https://docs.example/help/content/refunds.html');
  assert.ok(calls.every(c => c.options?.redirect === 'error' && c.options.cache === 'no-store' && c.options.credentials === 'same-origin'));
  source.dispose(); source.dispose();
  assert.throws(() => source.list(), (e: any) => e.code === 'disposed');
  await assert.rejects(source.get(f.resource.ref, { format: 'html' }), (e: any) => e.code === 'disposed');
});

test('an alternative server-backed snapshot implements the same client contract', async t => {
  const f = fixture();
  const server = createServer((request, response) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ resource: f.resource, representation: f.resource.representations.html, format: 'html', content: f.content, revision: f.manifest.digest })); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const endpoint = `http://127.0.0.1:${(server.address() as any).port}`;
  // A server adapter may preload metadata, keeping UI callers independent of transport.
  const source: ContentSnapshot = { revision: f.manifest.digest, publication, list: () => [f.resource], async get(ref, options) {
    if (contentRefKey(ref) !== contentRefKey(f.resource.ref)) throw new ContentDeliveryError('not_found', 'Missing.');
    if (options.format !== 'html') throw new ContentDeliveryError('unsupported_format', 'Missing format.');
    return (await fetch(endpoint, { signal: options.signal })).json();
  }, dispose() {} };
  await contentContract(source);
});

test('malformed manifests fail before fetching any representation', async () => {
  const cases: Array<(m: ContentManifest) => void> = [
    m => { (m as any).privateSource = '/secret'; },
    m => { (m.resources[0] as any).privateSource = '/secret'; },
    m => { (m.resources[0].representations.html as any).privateSource = '/secret'; },
    m => { (m.files[0] as any).privateSource = '/secret'; },
    m => { m.resources.push(m.resources[0]); },
    m => { m.resources[0].publication = { ...publication, language: 'fr' }; },
    m => { m.review.status = 'required'; },
    m => { m.publicBase = '/help/../'; },
    m => { m.files[0].path = 'content/%2e%2e/private'; },
    m => { m.files[0].path = 'https://evil.example/secret'; },
    m => { m.resources[0].representations.html!.path = 'content/../private'; },
    m => { m.resources[0].representations.html!.mediaType = 'application/javascript'; },
    m => { m.resources[0].representations.html!.links = [{ key: 'x', kind: 'resource', ref: m.resources[0].ref, href: '//evil.example/help/x' }]; },
    m => { m.resources[0].representations.html!.links = [{ key: 'x', kind: 'resource', ref: m.resources[0].ref, href: '/help/content/%2e%2e/private' }]; },
    m => { m.resources[0].representations.html!.links = [{ key: 'x', kind: 'resource', ref: {kind:'page',documentId:'missing'}, href: '/help/content/missing.html' }]; },
  ];
  for (const mutate of cases) { const f = fixture(); mutate(f.manifest); sign(f.manifest); const calls: Array<{url:string}> = [];
    await assert.rejects(openManifestContentSource({ manifestUrl: 'https://docs.example/help/manifest.json', fetch: fakeFetch(f.manifest, f.content, calls) }), (e: any) => e.code === 'invalid_manifest');
    assert.equal(calls.length, 1);
  }
});

test('internal links retain encoded query values without treating them as path traversal', async () => {
  const f = fixture();
  const href = '/help/content/refunds.html?returnTo=%2Fsettings%2Fbilling';
  f.resource.representations.html!.links = [{key:'return',kind:'resource',ref:f.resource.ref,href,query:'returnTo=%2Fsettings%2Fbilling'}];
  sign(f.manifest);
  const source = await openManifestContentSource({manifestUrl:'https://docs.example/help/manifest.json',fetch:fakeFetch(f.manifest,f.content)});
  assert.equal(source.list()[0].representations.html!.links[0].href,href);
});

test('limits, redirects, MIME types and digests are enforced', async () => {
  const f = fixture();
  await assert.rejects(openManifestContentSource({ manifestUrl: 'https://docs.example/help/manifest.json', fetch: fakeFetch(f.manifest, f.content), limits: {manifestBytes:10} }), (e: any) => e.code === 'invalid_content');
  const badDigest = fixture(); badDigest.manifest.digest = '0'.repeat(64);
  await assert.rejects(openManifestContentSource({ manifestUrl:'https://docs.example/help/manifest.json',fetch:fakeFetch(badDigest.manifest,badDigest.content)}), (e:any)=>e.code==='invalid_manifest');
  for (const failure of ['redirect','mime','digest','size','missing']) {
    const transport = fakeFetch(f.manifest,f.content);
    const source = await openManifestContentSource({manifestUrl:'https://docs.example/help/manifest.json',fetch:(async (input:any,options:any)=>{
      if (String(input).endsWith('manifest.json')) return transport(input,options);
      if (failure==='missing') return new Response('',{status:404});
      const r = new Response(failure==='digest'?f.content.replace('Ask','Pay'):failure==='size'?f.content+'x':f.content,{headers:{'Content-Type':failure==='mime'?'text/plain':'text/html'}});
      if (failure==='redirect') Object.defineProperty(r,'url',{value:'https://evil.example/content.html'});
      return r;
    }) as typeof fetch});
    await assert.rejects(source.get(f.resource.ref,{format:'html'}),(e:any)=>['stale_revision','invalid_content'].includes(e.code));
  }
});

test('abort and disposal cancel in-flight bodies without returning partial content', async () => {
  const f = fixture(); let cancelled = false;
  const source = await openManifestContentSource({manifestUrl:'https://docs.example/help/manifest.json',fetch:(async (input:any)=>String(input).endsWith('manifest.json') ? new Response(JSON.stringify(f.manifest),{headers:{'Content-Type':'application/json'}}) : new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'Content-Type':'text/html'}})) as typeof fetch});
  const abort = new AbortController(); const pending = source.get(f.resource.ref,{format:'html',signal:abort.signal});
  await new Promise(resolve=>setTimeout(resolve,0)); abort.abort(); await assert.rejects(pending,(e:any)=>e.name==='AbortError'); assert.equal(cancelled,true);
  const pendingDisposed=source.get(f.resource.ref,{format:'html'}); await new Promise(resolve=>setTimeout(resolve,0)); source.dispose(); await assert.rejects(pendingDisposed,(e:any)=>e.code==='disposed');
});

test('an interrupted response becomes a typed transport error', async () => {
  const f = fixture();
  const source = await openManifestContentSource({ manifestUrl:'https://docs.example/help/manifest.json',fetch:(async (input:any)=>String(input).endsWith('manifest.json')
    ? new Response(JSON.stringify(f.manifest),{headers:{'Content-Type':'application/json'}})
    : new Response(new ReadableStream({start(controller){controller.error(new TypeError('Connection lost'));}}),{headers:{'Content-Type':'text/html'}})) as typeof fetch });
  await assert.rejects(source.get(f.resource.ref,{format:'html'}),(e:any)=>e.code==='network_error');
});

test('rejected metadata cancels response bodies instead of leaving downloads running', async () => {
  for (const kind of ['mime', 'length', 'status']) {
    let cancelled = false;
    const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
      status: kind === 'status' ? 503 : 200,
      headers: { 'Content-Type': kind === 'mime' ? 'text/plain' : 'application/json', ...(kind === 'length' ? { 'Content-Length': '5000001' } : {}) },
    });
    await assert.rejects(openManifestContentSource({ manifestUrl: 'https://docs.example/help/manifest.json', fetch: (async () => response) as typeof fetch }), ContentDeliveryError);
    assert.equal(cancelled, true, kind);
  }
});

test('public content entrypoint bundles for a browser without compiler or Node dependencies', async () => {
  const framework = process.env.SHOALRUN_TEST_PACKAGE ?? fileURLToPath(new URL('..', import.meta.url));
  const result=await build({stdin:{contents:'import {openManifestContentSource,openRestContentSource,mountContent} from "@shoalrun/cli/content"; globalThis.help={openManifestContentSource,openRestContentSource,mountContent};',resolveDir:framework},platform:'browser',format:'esm',bundle:true,write:false,metafile:true});
  const inputs=Object.keys(result.metafile!.inputs).filter(name=>name!=='<stdin>');
  assert.ok(inputs.some(name=>name.endsWith('/content-delivery.js')));
  assert.ok(inputs.every(name=>/content-(?:delivery(?:-contract|-validation|-transport)?|rest-client|rest-contract|mount)\.js$/.test(name)),inputs.join('\n'));
  assert.ok(result.outputFiles[0].text.includes('openManifestContentSource'));
  const pkg=JSON.parse(await readFile(path.join(framework,'package.json'),'utf8')); assert.equal(pkg.exports['./content'],'./dist/content-delivery.js');
});
