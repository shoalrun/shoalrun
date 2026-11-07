import type { DecisionRerankConfig } from './decision-rerank.js';
import { validateSearchSynonyms } from './search-synonyms.js';

export type SearchLimits = { perCallerPerDay: number; perDay: number; perCallerPerMinute: number };

// Hosted search has its own limits; chat budgets do not change these defaults.
export function validateSearch(value: unknown): { limits: SearchLimits; rerank?: DecisionRerankConfig } {
  const limits: SearchLimits = { perCallerPerDay: 100, perDay: 1000, perCallerPerMinute: 10 };
  if (value === undefined) return { limits };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('search must be an object');
  const config = value as Record<string, unknown>;
  for (const key of Object.keys(config)) if (!['synonyms', 'limits', 'rerank'].includes(key)) throw new Error(`Unknown search setting: ${key}`);
  validateSearchSynonyms(config.synonyms);
  const rerank = validateSearchRerank(config.rerank);
  if (config.limits === undefined) return { limits, ...(rerank ? { rerank } : {}) };
  if (!config.limits || typeof config.limits !== 'object' || Array.isArray(config.limits)) throw new Error('search.limits must be an object');
  for (const [key, limit] of Object.entries(config.limits)) {
    if (!Object.hasOwn(limits, key)) throw new Error(`Unknown search.limits setting: ${key}`);
    if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1) throw new Error(`search.limits.${key} must be a positive whole number`);
    limits[key as keyof SearchLimits] = limit;
  }
  return { limits, ...(rerank ? { rerank } : {}) };
}

function validateSearchRerank(value: unknown): DecisionRerankConfig | undefined {
  if (value === undefined || value === false) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('search.rerank must be false or a decision-model configuration');
  const config = value as Record<string, unknown>;
  for (const key of Object.keys(config)) if (!['provider', 'endpoint', 'model', 'keyEnv', 'maxCandidates', 'timeoutMs'].includes(key)) throw new Error(`Unknown search.rerank setting: ${key}`);
  if (config.provider !== 'decisions') throw new Error('search.rerank.provider must be decisions');
  if (typeof config.endpoint !== 'string') throw new Error('search.rerank.endpoint is required');
  let endpoint: URL;
  try { endpoint = new URL(config.endpoint); } catch { throw new Error('search.rerank.endpoint must be a valid URL'); }
  if ((endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error('search.rerank.endpoint needs HTTPS without credentials, query, or fragment; HTTP is allowed only for loopback');
  if (typeof config.model !== 'string' || !config.model.trim()) throw new Error('search.rerank.model is required');
  if (typeof config.keyEnv !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(config.keyEnv)) throw new Error('search.rerank.keyEnv must name an environment variable');
  const maxCandidates = config.maxCandidates ?? 12;
  const timeoutMs = config.timeoutMs ?? 750;
  if (!Number.isSafeInteger(maxCandidates) || (maxCandidates as number) < 2 || (maxCandidates as number) > 20) throw new Error('search.rerank.maxCandidates must be 2–20');
  if (!Number.isSafeInteger(timeoutMs) || (timeoutMs as number) < 50 || (timeoutMs as number) > 2000) throw new Error('search.rerank.timeoutMs must be 50–2000');
  return { provider: 'decisions', endpoint: endpoint.href, model: config.model, keyEnv: config.keyEnv, maxCandidates: maxCandidates as number, timeoutMs: timeoutMs as number };
}
