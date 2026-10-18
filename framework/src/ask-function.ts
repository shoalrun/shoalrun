import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { DailyBudget, SharedRateLimit, adaptiveChallenge } from './budget.js';
import { askQuestion } from './ask.js';
import { clientKeyFromHeader, createAskHandler } from './ask-handler.js';
import { prepareAsk } from './ask-setup.js';
import { validateChat } from './chat-config.js';
import { validateReaderFilters } from './reader-filters.js';
import { createSession, turnstileVerifier, type Session } from './turnstile.js';
import { envBudgetStore, envRedis } from './budget-store.js';
import { createSearchHandler } from './search-handler.js';
import { validateSearch } from './search-config.js';
import { pausedKey } from './chat-pause.js';
import { deleteKvLogRecord, kvLogSink } from './ask-log-kv.js';

// The answer function for a hosted site. The build writes a directory holding `runtime.json` (the chat and retrieval settings, with no
// keys) and `site/ai` (the passages and vectors), and this module turns that directory into a Web `Request` to `Response` function. Keys come
// only from the environment variables the settings name. It refuses to start without a shared budget store, because per-instance counters
// on a serverless host would not limit anything.
export type FunctionRuntime = {
  schemaVersion: 1;
  settings: Record<string, unknown>;
  variant?: { channel: string; version: string; language: string };
  hosts?: string[];
  callerHeader?: string;
  maxRequestsPerMinute?: number;
};

export type AskFunction = (request: Request) => Promise<Response>;

function allowedHosts(runtime: FunctionRuntime, env: NodeJS.ProcessEnv): string[] {
  return [...new Set([...(runtime.hosts ?? []), env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL, ...(env.SHOALRUN_ASK_HOSTS?.split(',') ?? [])].map(host => host?.trim().toLowerCase()).filter((host): host is string => Boolean(host)))];
}

// Hosted search uses the same private index as chat, with separate limits for embedding spend.
export async function createHostedSearchFunction(directory: string, env: NodeJS.ProcessEnv = process.env): Promise<AskFunction> {
  const runtime = JSON.parse(await readFile(path.join(directory, 'runtime.json'), 'utf8')) as FunctionRuntime;
  if (runtime?.schemaVersion !== 1 || !runtime.settings) throw new Error('runtime.json is not a Shoalrun search function file');
  const filters = validateReaderFilters(runtime.settings.readerFilters);
  const chat = validateChat(runtime.settings.chat, filters);
  if (!chat?.budget?.store) throw new Error('Hosted semantic search needs a shared budget store');
  const setup = await prepareAsk({ siteDirectory: path.join(directory, 'site'), settings: runtime.settings, sharedStore: true, ...(runtime.variant ?? {}) });
  const store = envBudgetStore(chat.budget.store, env);
  const { limits } = validateSearch(runtime.settings.search);
  return createSearchHandler({
    retriever: setup.options.retriever, embedQuery: setup.options.embedQuery, readerFilters: filters, hosts: allowedHosts(runtime, env),
    onFallback: reason => console.warn(`Search fallback: ${reason}`),
    rateLimiter: new SharedRateLimit(store, limits.perCallerPerMinute, Date.now, error => console.error(`Search rate limit: ${error.message}`), 'search-rate'),
    budget: new DailyBudget(store, { perCaller: limits.perCallerPerDay, perDay: limits.perDay }, Date.now, error => console.error(`Search budget: ${error.message}`), 'search-budget'),
    clientKey: clientKeyFromHeader(runtime.callerHeader ?? 'x-vercel-forwarded-for')
  });
}

export async function createAskFunction(directory: string, env: NodeJS.ProcessEnv = process.env, send?: typeof fetch): Promise<AskFunction> {
  const runtime = JSON.parse(await readFile(path.join(directory, 'runtime.json'), 'utf8')) as FunctionRuntime;
  if (runtime?.schemaVersion !== 1 || !runtime.settings) throw new Error('runtime.json is not a Shoalrun answer function file');
  const chat = validateChat(runtime.settings.chat, validateReaderFilters(runtime.settings.readerFilters));
  if (!chat) throw new Error('The site config has no chat section');
  if (!chat.budget?.store) throw new Error('A hosted chat needs chat.budget with a shared store, so its daily caps hold across server instances');
  const setup = await prepareAsk({ siteDirectory: path.join(directory, 'site'), settings: runtime.settings, cache: true, sharedStore: true, ...(runtime.variant ?? {}) });
  for (const note of setup.notes) console.error(note);
  if (!setup.budget) throw new Error('The daily budget could not be set up');

  // The host the request was sent to must be one of ours: the deployment's own addresses and the site's production domain.
  const hosts = allowedHosts(runtime, env);

  let challenge: ((input: { token?: string; ip: string }) => Promise<boolean>) | undefined;
  let session: Session | undefined;
  if (chat.challenge) {
    const secret = env[chat.challenge.secretEnv];
    if (secret) {
      session = createSession({ secret }); const verify = turnstileVerifier({ secret, ...(send ? { fetch: send } : {}) }); challenge = ({ token, ip }) => verify({ token, ip }); }
    else { console.error(`Set ${chat.challenge.secretEnv} to check visitors with Turnstile; every request is refused until then`); challenge = async () => false; }
  } else console.error('chat.challenge is not set, so nothing stops a script from asking questions until the daily caps are spent');

  // Recording is off unless the config turns it on. It uses the budget's store, and its failures are logged and never reach the reader.
  const record = chat.log ? kvLogSink(envRedis(chat.budget.store, env), { retentionDays: chat.log.retentionDays, maxPerDay: chat.log.maxPerDay, answers: chat.log.answers, onError: error => console.error(`Question log: ${error.message}`) }) : undefined;

  // An instant off switch: a flag in the store, checked at most every five seconds. A store that cannot be read counts as paused.
  const redis = envRedis(chat.budget.store, env);
  let checked = 0;
  let paused = false;
  const isPaused = async (): Promise<boolean> => {
    if (Date.now() - checked < 5000) return paused;
    try { paused = (await redis.command(['GET', pausedKey])) !== null; } catch (error) { paused = true; console.error(`Pause flag: ${(error as Error).message}`); }
    checked = Date.now();
    return paused;
  };

  return createAskHandler({
    paused: isPaused, response: 'public',
    hosts, exposeErrors: false, budget: setup.budget, ...(session ? { session } : {}), ...(chat.challenge && chat.challenge.when === 'adaptive' ? { challengeNeeded: adaptiveChallenge(setup.budget, { freeQuestions: chat.challenge.freeQuestions, busyShare: chat.challenge.busyShare }) } : {}), ...(record ? { record, deleteRecord: (receipt: string) => deleteKvLogRecord(redis, receipt) } : {}), rateLimiter: new SharedRateLimit(setup.budgetStore as NonNullable<typeof setup.budgetStore>, runtime.maxRequestsPerMinute ?? 10, Date.now, error => console.error(`Rate limit: ${error.message}`)), ...(challenge ? { challenge } : {}),
    clientKey: clientKeyFromHeader(runtime.callerHeader ?? 'x-vercel-forwarded-for'),
    // The function stops at 120 seconds (vercel-function.ts), so an answer gets 100 and the reader always hears back.
    answerTimeoutMs: 100_000,
    answer: (question, history, context) => askQuestion({ question, history, ...setup.options, modelAllowed: context.modelAllowed, signal: context.signal, requireCitations: true })
  });
}

const failure = (status: number, message: string): Response => new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// Vercel's Node runtime calls `(req, res)`. This turns that into a Web request and back. Starting up happens on the first request, and a
// failed start is tried again on the next one. The reader never sees why it failed; the reason goes to the function log.
export function nodeAdapter(load: () => Promise<AskFunction>, limits = { bodyBytes: 32_768 }): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  let ready: Promise<AskFunction> | undefined;
  const write = async (res: ServerResponse, response: Response) => {
    res.statusCode = response.status;
    response.headers.forEach((value, name) => { if (name !== 'set-cookie') res.setHeader(name, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  return async (req, res) => {
    try {
      const handler = await (ready ??= load().catch(error => { ready = undefined; throw error; }));
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += (chunk as Buffer).length;
        if (size > limits.bodyBytes) { await write(res, failure(413, 'The request is too large.')); return; }
        chunks.push(chunk as Buffer);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, item);
      const method = req.method ?? 'GET';
      const request = new Request(`https://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, { method, headers, ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }) });
      await write(res, await handler(request));
    } catch (error) {
      console.error(`The answer function failed: ${(error as Error).message}`);
      if (!res.headersSent) await write(res, failure(503, 'The chat is unavailable right now.'));
    }
  };
}
