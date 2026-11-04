import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DailyBudget, SharedRateLimit } from './budget.js';
import { envBudgetStore } from './budget-store.js';
import { validateReaderFilters } from './reader-filters.js';
import { createSearchHandler } from './search-handler.js';
import { validateSearch } from './search-config.js';
import { prepareSearchRetrieval } from './retrieval-runtime.js';
import { allowedHosts, type FunctionRuntime, type AskFunction } from './function-runtime.js';

export async function createHostedSearchFunction(directory: string, env: NodeJS.ProcessEnv = process.env): Promise<AskFunction> {
  const runtime = JSON.parse(await readFile(path.join(directory, 'runtime.json'), 'utf8')) as FunctionRuntime;
  if (runtime?.schemaVersion !== 1 || !runtime.settings) throw new Error('runtime.json is not a Shoalrun search function file');
  const filters = validateReaderFilters(runtime.settings.readerFilters);
  // Accept old function metadata while new builds omit the chat configuration.
  const legacy = runtime.settings.chat as { budget?: { store?: unknown } } | undefined;
  const settings = runtime.searchStore ?? legacy?.budget?.store;
  if (!settings || typeof settings !== 'object' || !('provider' in settings) || settings.provider !== 'upstash' || !('urlEnv' in settings) || typeof settings.urlEnv !== 'string' || !('tokenEnv' in settings) || typeof settings.tokenEnv !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(settings.urlEnv) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(settings.tokenEnv)) throw new Error('Hosted semantic search needs a shared budget store');
  const setup = await prepareSearchRetrieval(path.join(directory, 'site'), runtime.settings);
  const store = envBudgetStore({ urlEnv: settings.urlEnv, tokenEnv: settings.tokenEnv }, env);
  const { limits } = validateSearch(runtime.settings.search);
  return createSearchHandler({
    ...setup, readerFilters: filters, hosts: allowedHosts(runtime, env),
    onFallback: reason => console.warn(`Search fallback: ${reason}`),
    rateLimiter: new SharedRateLimit(store, limits.perCallerPerMinute, Date.now, error => console.error(`Search rate limit: ${error.message}`), 'search-rate'),
    budget: new DailyBudget(store, { perCaller: limits.perCallerPerDay, perDay: limits.perDay }, Date.now, error => console.error(`Search budget: ${error.message}`), 'search-budget'),
    clientKey: request => request.headers.get(runtime.callerHeader ?? 'x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown'
  });
}
