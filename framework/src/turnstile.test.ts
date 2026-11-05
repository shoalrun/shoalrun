import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAskHandler } from './ask-handler.js';
import type { AskResult } from './ask.js';
import { createSession, turnstilePreviewVerifier, turnstileVerifier, turnstileVerifyUrl } from './turnstile.js';

const respond = (body: unknown, status = 200) => async (url: string, init: RequestInit) => { calls.push({ url, body: String(init.body) }); return Response.json(body, { status }); };
const calls: Array<{ url: string; body: string }> = [];

test('a token is verified with the secret and the caller address, and only success passes', async () => {
  calls.length = 0;
  const verify = turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: 'the-secret', fetch: respond({ success: true, hostname: 'docs.example.com' }) as unknown as typeof fetch });
  assert.equal(await verify({ token: 'tok', ip: '203.0.113.9' }), true);
  assert.equal(calls[0].url, turnstileVerifyUrl);
  const form = new URLSearchParams(calls[0].body);
  assert.deepEqual([form.get('secret'), form.get('response'), form.get('remoteip')], ['the-secret', 'tok', '203.0.113.9']);
  assert.equal(await turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: 's', fetch: respond({ success: false, 'error-codes': ['timeout-or-duplicate'] }) as unknown as typeof fetch })({ token: 't' }), false);
  assert.equal(await turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: 's', fetch: respond({ success: 'true' }) as unknown as typeof fetch })({ token: 't' }), false, 'only the boolean true passes');
});

test('a missing, oversized, or unverifiable token is refused, and an outage refuses too', async () => {
  calls.length = 0;
  const ok = turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: 's', fetch: respond({ success: true, hostname: 'docs.example.com' }) as unknown as typeof fetch });
  assert.equal(await ok({}), false);
  assert.equal(await ok({ token: '' }), false);
  assert.equal(await ok({ token: 'x'.repeat(3000) }), false);
  assert.equal(calls.length, 0, 'Cloudflare is not asked about a token that cannot be real');
  assert.equal(await turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: 's', fetch: respond({}, 500) as unknown as typeof fetch })({ token: 't' }), false);
  assert.equal(await turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: 's', fetch: (async () => { throw new Error('offline'); }) as unknown as typeof fetch })({ token: 't' }), false);
  assert.equal(await turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: 's', fetch: (async () => new Response('not json')) as unknown as typeof fetch })({ token: 't' }), false);
  assert.throws(() => turnstileVerifier({ allowedHostnames: ['docs.example.com'], secret: '' }), /needs a secret key/);
  const form = new URLSearchParams(calls[calls.length - 1]?.body ?? '');
  assert.equal(form.get('remoteip'), null);
});

test('successful verification requires an exact configured hostname and the configured action', async () => {
  const check = (body: unknown, action: string | undefined = 'docs_chat') => turnstileVerifier({ secret: 's', allowedHostnames: ['docs.example.com', 'preview.example.com'], action, fetch: respond(body) as unknown as typeof fetch })({ token: 't' });
  assert.equal(await check({ success: true, hostname: 'docs.example.com', action: 'docs_chat' }), true);
  assert.equal(await check({ success: true, hostname: 'preview.example.com', action: 'docs_chat' }), true);
  assert.equal(await check({ success: true, hostname: 'DOCS.EXAMPLE.COM', action: 'docs_chat' }), true);
  for (const hostname of [undefined, null, '', 'other.example.com', 'docs.example.com.attacker.example', 'https://docs.example.com', 'docs.example.com:443', '*.example.com', 12]) {
    assert.equal(await check({ success: true, hostname, action: 'docs_chat' }), false, `reject hostname ${hostname}`);
  }
  for (const action of [undefined, '', 'other_action', true]) assert.equal(await check({ success: true, hostname: 'docs.example.com', action }), false);
  const noAction = turnstileVerifier({ secret: 's', allowedHostnames: ['docs.example.com'], fetch: respond({ success: true, hostname: 'docs.example.com' }) as unknown as typeof fetch });
  assert.equal(await noAction({ token: 't' }), true, 'an action is checked only when explicitly configured');
  for (const names of [[], ['*'], ['https://docs.example.com'], ['docs.example.com:443']]) assert.throws(() => turnstileVerifier({ secret: 's', allowedHostnames: names }), /hostnames/i);
});

test('loopback preview accepts only the published dummy token and testing-key response', async () => {
  const check = (body: unknown, token = 'XXXX.DUMMY.TOKEN.XXXX') => turnstilePreviewVerifier({ fetch: respond(body) as unknown as typeof fetch })({ token });
  const actualDummyResponse = { success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } };
  assert.equal(await check(actualDummyResponse), true, 'the actual dummy response has no action and uses example.com');
  const form = new URLSearchParams(calls.at(-1)!.body);
  assert.equal(form.get('secret'), '1x0000000000000000000000000000000AA');
  assert.equal(await check(actualDummyResponse, 'real-token'), false);
  assert.equal(await check({ ...actualDummyResponse, hostname: 'production.example.com' }), false);
  assert.equal(await check({ success: true, metadata: { result_with_testing_key: true } }), false);
  assert.equal(await check({ success: true, hostname: 'example.com' }), false);
  assert.equal(await check({ ...actualDummyResponse, success: false }), false);
});

test('the handler refuses a request that fails the challenge before anything is answered or counted', async () => {
  const answered: string[] = [];
  const result = { question: 'q', mode: 'lexical', decision: 'answered', answer: 'ok', sources: [], considered: [], uncited: false, invalidCitations: [], unsupportedCode: [], verified: false, claims: [], unsupportedClaims: [], notes: [], usage: { promptTokens: 0, completionTokens: 0, chatCalls: 0 }, timings: { rewriteMs: 0, retrieveMs: 0, rerankMs: 0, answerMs: 0, verifyMs: 0 } } as AskResult;
  const tokens: Array<string | undefined> = [];
  const handle = createAskHandler({ hosts: ['example.com'], answer: async question => { answered.push(question); return result; }, clientKey: () => '203.0.113.9', challenge: async ({ token, ip }) => { tokens.push(token); assert.equal(ip, '203.0.113.9'); return token === 'good'; } });
  const post = (body: unknown) => handle(new Request('https://example.com/__shoalrun/ask', { method: 'POST', headers: { host: 'example.com', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  const refused = await post({ question: 'how do I add a redirect' });
  assert.equal(refused.status, 403);
  assert.equal((await refused.json() as { challenge?: boolean }).challenge, true);
  assert.equal((await post({ question: 'q', turnstileToken: 5 })).status, 403);
  assert.equal((await post({ question: 'q', turnstileToken: 'good' })).status, 200);
  assert.deepEqual(tokens, [undefined, undefined, 'good']);
  assert.deepEqual(answered, ['q']);
  const broken = createAskHandler({ hosts: ['example.com'], answer: async () => result, challenge: async () => { throw new Error('boom'); } });
  assert.equal((await broken(new Request('https://example.com/a', { method: 'POST', headers: { host: 'example.com', 'content-type': 'application/json' }, body: JSON.stringify({ question: 'q', turnstileToken: 'x' }) }))).status, 403, 'a failing check refuses');
});

test('the handler runs the challenge only when it is needed, and treats a failing decision as needed', async () => {
  const result = { question: 'q', mode: 'lexical', decision: 'answered', answer: 'ok', sources: [], considered: [], uncited: false, invalidCitations: [], unsupportedCode: [], verified: false, claims: [], unsupportedClaims: [], notes: [], usage: { promptTokens: 0, completionTokens: 0, chatCalls: 0 }, timings: { rewriteMs: 0, retrieveMs: 0, rerankMs: 0, answerMs: 0, verifyMs: 0 } } as AskResult;
  let needed: boolean | Error = false;
  const challenged: string[] = [];
  const handle = createAskHandler({ hosts: ['example.com'], answer: async () => result, clientKey: () => 'caller', challengeNeeded: async () => { if (needed instanceof Error) throw needed; return needed; }, challenge: async ({ token }) => { challenged.push(token ?? ''); return token === 'human'; } });
  const post = (body: object) => handle(new Request('https://example.com/a', { method: 'POST', headers: { host: 'example.com', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  assert.equal((await post({ question: 'q' })).status, 200, 'nobody is asked while it is not needed');
  assert.deepEqual(challenged, []);
  needed = true;
  assert.equal((await post({ question: 'q' })).status, 403);
  assert.equal((await post({ question: 'q', turnstileToken: 'human' })).status, 200);
  needed = new Error('store down');
  assert.equal((await post({ question: 'q' })).status, 403, 'a failing decision asks');
  assert.deepEqual(challenged, ['', 'human', '']);
});

test('a session pass is signed, expires, is tied to the caller, and cannot be forged or altered', () => {
  let time = Date.parse('2026-09-26T12:00:00Z');
  const session = createSession({ secret: 'the-turnstile-secret', maxAgeSeconds: 600, now: () => time });
  const header = session.header('203.0.113.9', true);
  assert.match(header, /^sr_ask=\d+\.[A-Za-z0-9_-]+; Max-Age=600; Path=\/__shoalrun\/ask; HttpOnly; SameSite=Strict; Secure$/);
  assert.ok(!header.includes('the-turnstile-secret') && !header.includes('203.0.113.9'));
  assert.doesNotMatch(session.header('203.0.113.9', false), /Secure/);
  const cookie = header.split(';')[0];
  assert.equal(session.valid(`other=1; ${cookie}; more=2`, '203.0.113.9'), true);
  assert.equal(session.valid(cookie, '198.51.100.4'), false, 'a copy from another caller is refused');
  assert.equal(session.valid(null, '203.0.113.9'), false);
  assert.equal(session.valid('sr_ask=', '203.0.113.9'), false);
  const [name, value] = cookie.split('=');
  const [expires, signature] = value.split('.');
  assert.equal(session.valid(`${name}=${Number(expires) + 100000}.${signature}`, '203.0.113.9'), false, 'a longer expiry breaks the signature');
  assert.equal(session.valid(`${name}=${expires}.${signature.slice(0, -2)}xx`, '203.0.113.9'), false);
  assert.equal(session.valid(`${name}=${expires}.${signature}.extra`, '203.0.113.9'), false);
  assert.equal(createSession({ secret: 'another-secret', now: () => time }).valid(cookie, '203.0.113.9'), false, 'a pass from another secret is refused');
  time += 599_000;
  assert.equal(session.valid(cookie, '203.0.113.9'), true);
  time += 2_000;
  assert.equal(session.valid(cookie, '203.0.113.9'), false, 'the pass expires');
  assert.throws(() => createSession({ secret: '' }), /needs a secret/);
});

test('session passes cannot cross a challenge policy boundary or reuse an unbound legacy pass', () => {
  const make = (context?: string) => createSession({ secret: 'same-widget-secret', context });
  const policy = JSON.stringify({ version: 1, hostnames: ['docs.example.com'], action: 'docs_chat' });
  const session = make(policy);
  const cookie = session.header('caller', true).split(';')[0];
  assert.equal(make(policy).valid(cookie, 'caller'), true);
  assert.equal(make(JSON.stringify({ version: 1, hostnames: ['other.example.com'], action: 'docs_chat' })).valid(cookie, 'caller'), false);
  assert.equal(make(JSON.stringify({ version: 1, hostnames: ['docs.example.com'], action: 'different_action' })).valid(cookie, 'caller'), false);
  assert.equal(session.valid(make().header('caller', true).split(';')[0], 'caller'), false, 'old secret-only passes must be challenged again');
});

test('the handler gives a pass after a passed check and lets follow-ups through with it, and refuses a wrong or expired one', async () => {
  const result = { question: 'q', mode: 'lexical', decision: 'answered', answer: 'ok', sources: [], considered: [], uncited: false, invalidCitations: [], unsupportedCode: [], verified: false, claims: [], unsupportedClaims: [], notes: [], usage: { promptTokens: 0, completionTokens: 0, chatCalls: 0 }, timings: { rewriteMs: 0, retrieveMs: 0, rerankMs: 0, answerMs: 0, verifyMs: 0 } } as AskResult;
  let time = Date.parse('2026-09-26T12:00:00Z');
  const session = createSession({ secret: 's', maxAgeSeconds: 600, now: () => time });
  const checked: Array<string | undefined> = [];
  let caller = '203.0.113.9';
  const handle = createAskHandler({ hosts: ['example.com'], answer: async () => result, clientKey: () => caller, session, challenge: async ({ token }) => { checked.push(token); return token === 'human'; } });
  const post = (body: object, cookie?: string) => handle(new Request('https://example.com/__shoalrun/ask', { method: 'POST', headers: { host: 'example.com', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
  const refused = await post({ question: 'q' });
  assert.equal(refused.status, 403);
  assert.equal(refused.headers.get('set-cookie'), null, 'a failed check gets no pass');
  const first = await post({ question: 'q', turnstileToken: 'human' });
  assert.equal(first.status, 200);
  const cookie = first.headers.get('set-cookie')!.split(';')[0];
  assert.match(first.headers.get('set-cookie')!, /Secure/, 'the request was https');
  const followUp = await post({ question: 'and another' }, cookie);
  assert.equal(followUp.status, 200);
  assert.equal(followUp.headers.get('set-cookie'), null, 'a pass in hand is not reissued');
  assert.deepEqual(checked, [undefined, 'human'], 'the check was not run again for the follow-up');
  caller = '198.51.100.4';
  assert.equal((await post({ question: 'q' }, cookie)).status, 403, 'the pass does not work from another address');
  caller = '203.0.113.9';
  assert.equal((await post({ question: 'q' }, `${cookie.slice(0, -3)}abc`)).status, 403, 'an altered pass is refused');
  time += 601_000;
  assert.equal((await post({ question: 'q' }, cookie)).status, 403, 'an expired pass is refused');
  assert.equal((await post({ question: 'q', turnstileToken: 'human' }, cookie)).status, 200, 'and a new check works again');
});
