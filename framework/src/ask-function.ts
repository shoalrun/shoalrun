import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SharedRateLimit, adaptiveChallenge } from './budget.js';
import { askQuestion } from './ask.js';
import { clientKeyFromHeader, createAskHandler } from './ask-handler.js';
import { prepareAskRuntime } from './ask-runtime.js';
import { allowedHosts, type FunctionRuntime, type AskFunction } from './function-runtime.js';
export { nodeAdapter } from './function-runtime.js';
export type { FunctionRuntime, AskFunction } from './function-runtime.js';
// Keep the previous deep import available without making Search import Ask.
export { createHostedSearchFunction } from './search-function.js';
import { validateChat } from './chat-config.js';
import { validateReaderFilters } from './reader-filters.js';
import { createSession, turnstileVerifier, type Session } from './turnstile.js';
import { envRedis } from './budget-store.js';
import { pausedKey } from './chat-pause.js';
import { deleteKvLogRecord, kvLogSink } from './ask-log-kv.js';

// The answer function for a hosted site. The build writes a directory holding `runtime.json` (the chat and retrieval settings, with no
// keys) and `site/ai` (the passages and vectors), and this module turns that directory into a Web `Request` to `Response` function. Keys come
// only from the environment variables the settings name. It refuses to start without a shared budget store, because per-instance counters
// on a serverless host would not limit anything.
export async function createAskFunction(directory: string, env: NodeJS.ProcessEnv = process.env, send?: typeof fetch): Promise<AskFunction> {
  const runtime = JSON.parse(await readFile(path.join(directory, 'runtime.json'), 'utf8')) as FunctionRuntime;
  if (runtime?.schemaVersion !== 1 || !runtime.settings) throw new Error('runtime.json is not a Shoalrun answer function file');
  const chat = validateChat(runtime.settings.chat, validateReaderFilters(runtime.settings.readerFilters));
  if (!chat) throw new Error('The site config has no chat section');
  if (!chat.budget?.store) throw new Error('A hosted chat needs chat.budget with a shared store, so its daily caps hold across server instances');
  const setup = await prepareAskRuntime({ siteDirectory: path.join(directory, 'site'), settings: runtime.settings, cache: true, sharedStore: true, ...(runtime.variant ?? {}) });
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
