import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { openRestContentSource } from './content-delivery.js';
import { contentResourceKey } from './content-rest-contract.js';
import type { ContentResource } from './content-delivery-contract.js';

const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const publication = { channel: 'production', version: 'current', language: 'en' };
const baseUrl = 'https://docs.example/content/v1';
function fixture() {
  const content = '<p>Request a refund.</p>\n';
  const resource: ContentResource = { ref: { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' }, publication: { ...publication }, title: 'Refunds', summary: '', type: 'guide', representations: { html: { path: 'content/refunds.html', mediaType: 'text/html', bytes: Buffer.byteLength(content), digest: digest(content), anchors: [], links: [] } }, assets: [], externalDependencies: [] };
  return { content, resource, envelope: { schemaVersion: 1, revision: digest('revision'), publication: { ...publication }, resources: [{ key: contentResourceKey(resource.ref), resource }] } };
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function transport(f = fixture(), override?: () => Response | Promise<Response>, calls: Array<{url: URL; init?: RequestInit}> = []): typeof fetch {
  return (async (input: any, init?: RequestInit) => { const url = new URL(String(input)); calls.push({ url, init }); return url.pathname.endsWith('/resources') ? json(f.envelope) : override ? override() : new Response(f.content, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }) as typeof fetch;
}
test('REST snapshot pins publication and revision, verifies bytes, and preserves immutable metadata', async () => {
  const f = fixture(); const calls: Array<{url: URL; init?: RequestInit}> = [];
  const source = await openRestContentSource({ baseUrl, publication, fetch: transport(f, undefined, calls) });
  assert.equal(source.revision, f.envelope.revision); assert.ok(Object.isFrozen(source.list()[0].representations.html));
  assert.equal((await source.get(f.resource.ref, { format: 'html' })).content, f.content);
  assert.equal(calls[0].url.pathname, '/content/v1/resources'); assert.equal(calls[0].url.searchParams.has('revision'), false);
  assert.equal(calls[1].url.pathname, '/content/v1/resources/' + contentResourceKey(f.resource.ref) + '/representations/html');
  for (const key of ['channel', 'version', 'language'] as const) assert.equal(calls[1].url.searchParams.get(key), publication[key]);
  assert.equal(calls[1].url.searchParams.get('revision'), source.revision);
  assert.ok(calls.every(call => call.init?.redirect === 'error' && call.init.cache === 'no-store' && call.init.credentials === 'same-origin'));
  await assert.rejects(source.get({ kind: 'page', documentId: 'absent' }, { format: 'html' }), { code: 'not_found' });
  await assert.rejects(source.get(f.resource.ref, { format: 'markdown' }), { code: 'unsupported_format' });
  source.dispose(); assert.throws(() => source.list(), { code: 'disposed' }); await assert.rejects(source.get(f.resource.ref, { format: 'html' }), { code: 'disposed' });
});
test('REST rejects malformed, mismatched and unsafe inventories before requesting content', async () => {
  for (const mutate of [
    (e: any) => e.resources[0].key += 'x', (e: any) => e.publication.language = 'fr',
    (e: any) => e.resources[0].resource.privatePath = '/secret', (e: any) => e.resources.push(e.resources[0]),
    (e: any) => e.resources[0].resource.representations.html.path = '../secret',
    (e: any) => e.resources[0].resource.representations.html.links.push({ key: 'x', kind: 'resource', ref: {kind:'page',documentId:'missing'}, href:'/content/missing' }),
    (e: any) => e.resources[0].resource.representations.html.links.push({ key: 'x', kind: 'resource', ref: e.resources[0].resource.ref, href: '//[' }),
    (e: any) => e.resources[0].resource.representations.html.links.push({ key: 'x', kind: 'asset', asset:'assets/a.png', href:'//evil.example/a.png' }),
  ]) {
    const f = fixture(); mutate(f.envelope); const calls: Array<{url: URL}> = [];
    await assert.rejects(openRestContentSource({ baseUrl, publication, fetch: transport(f, undefined, calls) }), { code: 'invalid_manifest' }); assert.equal(calls.length, 1);
  }
  const f = fixture(); await assert.rejects(openRestContentSource({ baseUrl, publication, revision: digest('other'), fetch: transport(f) }), { code: 'stale_revision' });
  await assert.rejects(openRestContentSource({ baseUrl: baseUrl + '?token=secret', publication, fetch: transport(f) }), { code: 'invalid_manifest' });
  await assert.rejects(openRestContentSource({ baseUrl, publication, limits: { resources: 0 }, fetch: transport(f) }), { code: 'invalid_manifest' });
});
test('REST maps structured errors and rejects corrupt or oversized representations', async () => {
  const f = fixture();
  for (const [status, serverCode, expected] of [[404,'not_found','not_found'],[406,'unsupported_format','unsupported_format'],[409,'stale_revision','stale_revision'],[500,'internal_error','network_error']] as const) {
    const source = await openRestContentSource({ baseUrl, publication, fetch: transport(f, () => json({error:{code:serverCode,message:'Unavailable'}}, status)) });
    await assert.rejects(source.get(f.resource.ref, {format:'html'}), {code:expected}); source.dispose();
  }
  for (const [response, code] of [
    [() => new Response('changed', {headers:{'Content-Type':'text/html'}}), 'stale_revision'],
    [() => new Response('x', {headers:{'Content-Type':'application/json'}}), 'invalid_content'],
    [() => json({error:{code:'not_found',message:'bad status'}},409), 'invalid_content'],
    [() => new Response('x'.repeat(101), {headers:{'Content-Type':'text/html'}}), 'invalid_content'],
  ] as const) {
    const source = await openRestContentSource({baseUrl, publication, limits:{resourceBytes:100}, fetch:transport(f,response)});
    await assert.rejects(source.get(f.resource.ref,{format:'html'}),{code}); source.dispose();
  }
});
test('REST abort and dispose cancel pending response bodies', async () => {
  for (const dispose of [false, true]) {
    const f = fixture(); let started!: () => void; const ready = new Promise<void>(resolve => started=resolve); let cancelled = false;
    const source = await openRestContentSource({baseUrl, publication, fetch: transport(f, () => new Response(new ReadableStream({start(){started();},cancel(){cancelled=true;}}), {headers:{'Content-Type':'text/html'}}))});
    const controller = new AbortController(); const pending = source.get(f.resource.ref,{format:'html',signal:controller.signal});
    await ready; await new Promise(resolve => setTimeout(resolve,0)); if(dispose) source.dispose(); else controller.abort();
    await assert.rejects(pending, (error:any) => dispose ? error.code==='disposed' : error.name==='AbortError'); assert.ok(cancelled); source.dispose();
  }
});
test('REST treats host HTTP failures as network errors without consuming their bodies', async () => {
  const f = fixture();
  for (const status of [401, 403, 429, 502, 503]) {
    for (const mediaType of ['text/html', 'text/plain', 'application/json']) {
      let cancelled = false;
      const response = () => new Response(new ReadableStream({
        cancel() { cancelled = true; return new Promise<void>(() => {}); },
      }, { highWaterMark: 0 }), { status, headers: { 'Content-Type': mediaType, 'Content-Length': '999999999' } });
      // Exercise both initial discovery and an already-open snapshot.
      await assert.rejects(openRestContentSource({ baseUrl, publication, fetch: async () => response() }), { code: 'network_error' });
      assert.ok(cancelled); cancelled = false;
      const source = await openRestContentSource({ baseUrl, publication, fetch: transport(f, response) });
      await assert.rejects(source.get(f.resource.ref, { format: 'html' }), { code: 'network_error' });
      assert.ok(cancelled); source.dispose();
    }
  }
});
test('REST preserves abort and disposal when rejecting a host error body', async () => {
  const f = fixture();
  for (const dispose of [false, true]) {
    const controller = new AbortController(); const reason = new Error('Read cancelled');
    let cancelled = false;
    const source = await openRestContentSource({ baseUrl, publication, fetch: transport(f, () => new Response(new ReadableStream({
      cancel() { cancelled = true; if (dispose) source.dispose(); else controller.abort(reason); },
    }, { highWaterMark: 0 }), { status: 503 })) });
    await assert.rejects(source.get(f.resource.ref, { format: 'html', signal: controller.signal }),
      (error: any) => dispose ? error.code === 'disposed' : error === reason);
    assert.ok(cancelled); source.dispose();
  }
});
test('REST still validates defined error statuses strictly', async () => {
  const f = fixture();
  for (const status of [400, 404, 405, 406, 409, 500]) {
    for (const response of [
      () => new Response('<html>Proxy failure</html>', { status, headers: { 'Content-Type': 'text/html' } }),
      () => json({ error: { code: 'unexpected', message: 'Wrong contract' } }, status),
    ]) {
      const source = await openRestContentSource({ baseUrl, publication, fetch: transport(f, response) });
      await assert.rejects(source.get(f.resource.ref, { format: 'html' }), { code: 'invalid_content' });
      source.dispose();
    }
  }
});
