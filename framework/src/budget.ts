import { createHash } from 'node:crypto';

// A daily cap on questions that reach the model, for each caller and for the whole site. When a cap is spent the chat still serves
// cached answers, cards, and excerpts, and shows the closest pages for everything else, so it degrades and never switches off.
// The counters live in a store the host provides (a Redis or KV service on a serverless host); the memory store below serves one process.
export type BudgetStore = {
  // Add to a counter, start it with a lifetime if it is new, and return the new total.
  add(key: string, amount: number, ttlSeconds: number): Promise<number>;
  get(key: string): Promise<number>;
};

export type BudgetLimits = { perCaller: number; perDay: number };
export type BudgetReservation = { readonly callerKey: string; readonly siteKey: string };

export function memoryBudgetStore(now: () => number = Date.now): BudgetStore {
  const counters = new Map<string, { total: number; expires: number }>();
  const live = (key: string) => {
    const entry = counters.get(key);
    if (entry && entry.expires <= now()) { counters.delete(key); return undefined; }
    return entry;
  };
  return {
    async add(key, amount, ttlSeconds) {
      const entry = live(key) ?? { total: 0, expires: now() + ttlSeconds * 1000 };
      entry.total += amount;
      counters.set(key, entry);
      // Bounded by the number of callers in a day; drop expired counters when it grows.
      if (counters.size > 10_000) for (const name of [...counters.keys()]) live(name);
      return entry.total;
    },
    async get(key) { return live(key)?.total ?? 0; }
  };
}

const callerHash = (caller: string) => createHash('sha256').update(caller).digest('hex').slice(0, 16);

// A per-minute limit that holds across server instances, on the same store as the daily budget. A fixed one-minute window per caller: a
// caller can send a burst on each side of a minute boundary, which the daily budget still bounds. A request that is over the limit still
// counts, so hammering keeps a caller limited. A store that fails refuses the request.
export class SharedRateLimit {
  constructor(private readonly store: BudgetStore, readonly perMinute: number, private readonly now: () => number = Date.now, private readonly onError: (error: Error) => void = () => {}, private readonly namespace = 'rate') {
    if (!Number.isSafeInteger(perMinute) || perMinute < 1) throw new Error('The per-minute limit must be a whole number of 1 or more');
  }

  async take(caller: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const at = this.now();
    const minute = Math.floor(at / 60_000);
    const retryAfterSeconds = Math.max(1, Math.ceil(((minute + 1) * 60_000 - at) / 1000));
    try { return { allowed: await this.store.add(`${this.namespace}:${minute}:${callerHash(caller)}`, 1, 120) <= this.perMinute, retryAfterSeconds }; }
    catch (error) { this.onError(error as Error); return { allowed: false, retryAfterSeconds: 5 }; }
  }
}

export class DailyBudget {
  constructor(private readonly store: BudgetStore, readonly limits: BudgetLimits, private readonly now: () => number = Date.now, private readonly onError: (error: Error) => void = () => {}, private readonly namespace = 'budget') {}

  // Counters roll over at midnight UTC. The caller is hashed, so the store never holds an address.
  private keys(caller: string): { caller: string; all: string } {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    return { caller: `${this.namespace}:${day}:${callerHash(caller)}`, all: `${this.namespace}:${day}:all` };
  }

  // How much of today's budget this caller and the whole site have used, counting questions that reached the model. It reads the counters and
  // changes nothing. A store that cannot be read throws, and the caller of this decides what that means.
  async usage(caller: string): Promise<{ mine: number; all: number }> {
    const keys = this.keys(caller);
    const [mine, all] = await Promise.all([this.store.get(keys.caller), this.store.get(keys.all)]);
    return { mine, all };
  }

  // Take one of this caller's slots for today, before the question is answered. The counters go up first and the totals are checked
  // afterwards, so questions that arrive together on many server instances cannot all pass a check that none has been counted in yet.
  // A store that fails counts as spent: an outage must not open the model to everyone.
  async reserve(caller: string): Promise<boolean> { return Boolean(await this.reserveWithReceipt(caller)); }

  async reserveWithReceipt(caller: string): Promise<BudgetReservation | undefined> {
    let keys: { caller: string; all: string };
    try {
      keys = this.keys(caller);
      const [mine, all] = await Promise.all([this.store.add(keys.caller, 1, 172_800), this.store.add(keys.all, 1, 172_800)]);
      if (mine <= this.limits.perCaller && all <= this.limits.perDay) return { callerKey: keys.caller, siteKey: keys.all };
      await Promise.all([this.store.add(keys.caller, -1, 172_800), this.store.add(keys.all, -1, 172_800)]);
      return undefined;
    } catch (error) { this.onError(error as Error); return undefined; }
  }

  // Give a slot back when the question turned out not to need the model, such as one served from the cache. A slot that cannot be
  // given back stays counted, which errs toward the cap.
  async releaseReservation(reservation: BudgetReservation): Promise<void> {
    try {
      await Promise.all([this.store.add(reservation.callerKey, -1, 172_800), this.store.add(reservation.siteKey, -1, 172_800)]);
    } catch (error) { this.onError(error as Error); }
  }
}

// When to ask a visitor to prove they are a person. Nobody is asked at first. A caller is asked once they have used `freeQuestions` model answers
// in a day, and everyone is asked once the site has used `busyShare` of its daily budget. A
// store that cannot be read means "ask", so an outage never removes the check.
export function adaptiveChallenge(budget: Pick<DailyBudget, 'usage' | 'limits'>, options: { freeQuestions?: number; busyShare?: number } = {}): (caller: string) => Promise<boolean> {
  const free = options.freeQuestions ?? 3;
  const busy = options.busyShare ?? 0.5;
  return async caller => {
    try {
      const { mine, all } = await budget.usage(caller);
      return mine >= free || all >= budget.limits.perDay * busy;
    } catch { return true; }
  };
}
