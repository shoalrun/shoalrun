import type { BudgetStore } from './budget.js';

// A budget counter store for a serverless host, over the REST API that Upstash Redis and Vercel KV (which is Upstash) provide. It needs
// no client library: each call is one JSON POST. There are no retries, because a repeated increment would count twice, and a slow
// or failing store must not slow every question. A failure throws, and DailyBudget treats that as a spent budget.
export type RestStoreOptions = { url: string; token: string; timeoutMs?: number; fetch?: typeof fetch };

// A store whose address and token come from named environment variables, read on first use. A missing variable is an error at the first
// question, which DailyBudget counts as a spent budget. It never falls back to counters that each server instance keeps for itself.
export function envBudgetStore(settings: { urlEnv: string; tokenEnv: string }, env: Record<string, string | undefined> = process.env, send?: typeof fetch): BudgetStore {
  let built: BudgetStore | undefined;
  const store = (): BudgetStore => {
    if (built) return built;
    const url = env[settings.urlEnv];
    const token = env[settings.tokenEnv];
    if (!url) throw new Error(`Set ${settings.urlEnv} to use the budget store`);
    if (!token) throw new Error(`Set ${settings.tokenEnv} to use the budget store`);
    return built = restBudgetStore({ url, token, ...(send ? { fetch: send } : {}) });
  };
  return { add: async (key, amount, ttl) => store().add(key, amount, ttl), get: async key => store().get(key) };
}

const local = (host: string) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);

// The Redis REST API, one JSON POST per call. `command` runs one command and `pipeline` runs several in order. Both throw on any failure.
export type RestRedis = { command(args: string[]): Promise<unknown>; pipeline(commands: string[][]): Promise<unknown[]> };

export function restRedis(options: RestStoreOptions): RestRedis {
  let base: URL;
  try { base = new URL(options.url); } catch { throw new Error('The budget store address is not a valid URL'); }
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && local(base.hostname))) throw new Error('The budget store address must use https, so the token is never sent in the clear');
  if (base.username || base.password || base.search || base.hash) throw new Error('The budget store address must not contain credentials or a query');
  const root = base.href.replace(/\/+$/, '');
  const send = options.fetch ?? fetch;

  async function post(path: string, body: unknown): Promise<unknown> {
    let response: Response;
    try { response = await send(`${root}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${options.token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(options.timeoutMs ?? 2000) }); }
    catch (error) { throw new Error(`The budget store request failed: ${(error as Error).message}`); }
    if (!response.ok) throw new Error(`The budget store returned ${response.status}`);
    return response.json();
  }

  const value = (entry: unknown): unknown => {
    const item = entry as { result?: unknown; error?: unknown } | null;
    if (!item || typeof item !== 'object' || item.error !== undefined) throw new Error('The budget store returned an error');
    return item.result;
  };
  return {
    async command(args) { return value(await post('', args)); },
    async pipeline(commands) {
      const answers = await post('/pipeline', commands);
      if (!Array.isArray(answers) || answers.length !== commands.length) throw new Error('The budget store returned an unexpected answer');
      return answers.map(value);
    }
  };
}

// The same client, with its address and token read from named environment variables on first use.
export function envRedis(settings: { urlEnv: string; tokenEnv: string }, env: Record<string, string | undefined> = process.env, send?: typeof fetch): RestRedis {
  let built: RestRedis | undefined;
  const client = (): RestRedis => {
    if (built) return built;
    const url = env[settings.urlEnv];
    const token = env[settings.tokenEnv];
    if (!url) throw new Error(`Set ${settings.urlEnv} to use the budget store`);
    if (!token) throw new Error(`Set ${settings.tokenEnv} to use the budget store`);
    return built = restRedis({ url, token, ...(send ? { fetch: send } : {}) });
  };
  return { command: async args => client().command(args), pipeline: async commands => client().pipeline(commands) };
}

export function restBudgetStore(options: RestStoreOptions): BudgetStore {
  const redis = restRedis(options);
  const count = (raw: unknown): number => {
    const total = raw === null || raw === undefined ? 0 : Number(raw);
    if (!Number.isFinite(total) || total < 0) throw new Error('The budget store returned a value that is not a count');
    return total;
  };
  return {
    // INCRBY makes the counter, and EXPIRE with NX gives it a lifetime only the first time, so later questions don't extend it.
    async add(key, amount, ttlSeconds) { return count((await redis.pipeline([['INCRBY', key, String(amount)], ['EXPIRE', key, String(ttlSeconds), 'NX']]))[0]); },
    async get(key) { return count(await redis.command(['GET', key])); }
  };
}
