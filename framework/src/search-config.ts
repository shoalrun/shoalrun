import { validateSearchSynonyms } from './search-synonyms.js';

export type SearchLimits = { perCallerPerDay: number; perDay: number; perCallerPerMinute: number };

// Hosted search has its own limits; chat budgets do not change these defaults.
export function validateSearch(value: unknown): { limits: SearchLimits } {
  const limits: SearchLimits = { perCallerPerDay: 100, perDay: 1000, perCallerPerMinute: 10 };
  if (value === undefined) return { limits };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('search must be an object');
  const config = value as Record<string, unknown>;
  for (const key of Object.keys(config)) if (!['synonyms', 'limits'].includes(key)) throw new Error(`Unknown search setting: ${key}`);
  validateSearchSynonyms(config.synonyms);
  if (config.limits === undefined) return { limits };
  if (!config.limits || typeof config.limits !== 'object' || Array.isArray(config.limits)) throw new Error('search.limits must be an object');
  for (const [key, limit] of Object.entries(config.limits)) {
    if (!Object.hasOwn(limits, key)) throw new Error(`Unknown search.limits setting: ${key}`);
    if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1) throw new Error(`search.limits.${key} must be a positive whole number`);
    limits[key as keyof SearchLimits] = limit;
  }
  return { limits };
}
