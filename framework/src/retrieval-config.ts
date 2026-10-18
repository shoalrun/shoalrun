import type { ProviderConfig } from './embeddings.js';

// `retrieval.embeddings` in docs.config.yaml chooses the embedding provider for `shoalrun index --embed`. Shoalrun has no
// default, so a project that wants vectors names its provider and model here. The config never holds a key: `keyEnv` names the
// environment variable that does.
export type EmbeddingConfig = { provider: 'voyage' | 'openai'; model: string; dimension?: number; queryModel?: string; baseUrl?: string; keyEnv?: string };
export type RetrievalConfig = { embeddings?: EmbeddingConfig };

const mapping = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const providers = ['voyage', 'openai'];
const embeddingKeys = ['provider', 'model', 'dimension', 'queryModel', 'baseUrl', 'keyEnv'];

function text(value: unknown, setting: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${setting} must be a nonempty string`);
  return value.trim();
}

export function validateRetrieval(value: unknown): RetrievalConfig | undefined {
  if (value === undefined) return undefined;
  if (!mapping(value)) throw new Error('retrieval must be a mapping');
  for (const key of Object.keys(value)) if (key !== 'embeddings') throw new Error(`retrieval has an unknown setting ${key}; it accepts only embeddings`);
  if (value.embeddings === undefined) return {};
  const embeddings = value.embeddings;
  if (!mapping(embeddings)) throw new Error('retrieval.embeddings must be a mapping');
  for (const key of Object.keys(embeddings)) {
    if (embeddingKeys.includes(key)) continue;
    throw new Error(/key|secret|token|password/i.test(key)
      ? `retrieval.embeddings.${key} is not a setting. The config never holds a key; name the environment variable that does with keyEnv`
      : `retrieval.embeddings has an unknown setting ${key}; it accepts ${embeddingKeys.join(', ')}`);
  }
  const provider = text(embeddings.provider, 'retrieval.embeddings.provider');
  if (!providers.includes(provider)) throw new Error(`retrieval.embeddings.provider must be one of ${providers.join(', ')}`);
  const result: EmbeddingConfig = { provider: provider as EmbeddingConfig['provider'], model: text(embeddings.model, 'retrieval.embeddings.model') };
  if (embeddings.dimension !== undefined) {
    if (typeof embeddings.dimension !== 'number' || !Number.isSafeInteger(embeddings.dimension) || embeddings.dimension < 1) throw new Error('retrieval.embeddings.dimension must be a positive integer');
    result.dimension = embeddings.dimension;
  }
  if (embeddings.queryModel !== undefined) result.queryModel = text(embeddings.queryModel, 'retrieval.embeddings.queryModel');
  if (embeddings.keyEnv !== undefined) {
    const name = text(embeddings.keyEnv, 'retrieval.embeddings.keyEnv');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('retrieval.embeddings.keyEnv names an environment variable, such as OPENAI_API_KEY, not the key itself');
    result.keyEnv = name;
  }
  if (embeddings.baseUrl !== undefined) {
    if (provider !== 'openai') throw new Error('retrieval.embeddings.baseUrl applies only to the openai provider');
    const url = text(embeddings.baseUrl, 'retrieval.embeddings.baseUrl');
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('retrieval.embeddings.baseUrl must be an http or https URL'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('retrieval.embeddings.baseUrl must be an http or https URL');
    if (parsed.username || parsed.password) throw new Error('retrieval.embeddings.baseUrl must not contain credentials; name the key variable with keyEnv');
    result.baseUrl = url;
  }
  return { embeddings: result };
}

export type EmbeddingFlags = { provider?: string; model?: string; dimension?: number; baseUrl?: string; keyEnv?: string };

// Command-line flags override the config, so a one-off experiment never needs a config edit. Both must together name a provider
// and a model, and neither has a default.
export function embeddingProviderConfig(config: RetrievalConfig | undefined, flags: EmbeddingFlags = {}): ProviderConfig {
  const base = config?.embeddings;
  const provider = flags.provider ?? base?.provider;
  const model = flags.model ?? base?.model;
  if (!provider || !model) throw new Error('Choose an embedding provider and model: set retrieval.embeddings in docs.config.yaml, or pass --provider and --model');
  // A flag that names a different provider drops the config's provider-specific settings, which would not apply to it.
  const same = provider === base?.provider;
  return { provider, model, dimension: flags.dimension ?? (same ? base?.dimension : undefined), baseUrl: flags.baseUrl ?? (same ? base?.baseUrl : undefined), keyEnv: flags.keyEnv ?? (same ? base?.keyEnv : undefined) };
}

// Queries use the config's queryModel when there is one. It must be in the passage model's embedding space, which the
// provider check enforces when vectors are compared.
export function queryProviderConfig(config: RetrievalConfig | undefined, stored: { provider: string; model: string; dimension: number }, flags: { model?: string; baseUrl?: string; keyEnv?: string } = {}): ProviderConfig {
  const base = config?.embeddings;
  const same = base?.provider === stored.provider;
  return { provider: stored.provider, model: flags.model ?? (same ? base?.queryModel : undefined) ?? stored.model, dimension: stored.dimension, baseUrl: flags.baseUrl ?? (same ? base?.baseUrl : undefined), keyEnv: flags.keyEnv ?? (same ? base?.keyEnv : undefined) };
}
