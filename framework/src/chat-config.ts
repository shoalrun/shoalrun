import { reservedBodyFields, type ChatProviderConfig } from './chat.js';
import { validateReaderSelection, type ReaderFiltersConfig, type ReaderSelection } from './reader-filters.js';

// `chat` in docs.config.yaml chooses the service that writes answers for `shoalrun ask` and, later, the chat endpoint. Like
// `retrieval`, it names no default, and it never holds a key: `keyEnv` names the environment variable that does.
export type ChatGate = { decline: number; hedge: number };
export type ChatVerify = { threshold: number; onUnsupported: 'flag' | 'remove' };
export const escalateReasons = ['unsupported-claim', 'unsupported-code', 'uncited'] as const;
export type EscalateReason = typeof escalateReasons[number];
// Another model to use. It inherits the provider, address, key variable, and limits from the main chat settings, so a second model is
// usually just a `model:` line.
// The scorer that reorders passages and checks claims. `provider: jev` names the wire protocol (POST /v1/systemone, yes/no questions), so any
// service or local server that speaks it works. With no settings it uses the JEV_* and TYPESAFE_* environment variables.
export type ChatRerank = { provider: 'jev'; endpoint?: string; model?: string; keyEnv?: string; stateFormat?: 'object' | 'string'; onError?: 'search' | 'answer' };
export type ChatCards = { threshold: number; confirm: number };
// Where the counters live. With none, they live in memory, which suits one local process. A serverless host needs a store that all its
// instances share. The config names the environment variables that hold the address and token, and never the values.
export type ChatBudgetStore = { provider: 'upstash'; urlEnv: string; tokenEnv: string };
// The check that stops scripts. The site key is public and goes to the browser; the secret is named by `secretEnv` and never written in config.
export type ChatChallenge = { provider: 'turnstile'; siteKey: string; secretEnv: string; when: 'adaptive' | 'always'; freeQuestions: number; busyShare: number };
// Recording questions on a hosted site. It uses the budget's store. Text is redacted before it is written, and the notice is shown to readers.
export type ChatLog = { retentionDays: number; maxPerDay: number; answers: boolean; notice: string };
// The words on the chat panel that a site may change. Each is optional; the panel has its own text for any that are left out.
export type ChatPanel = { title?: string; placeholder?: string; intro?: string };
export const defaultLogNotice = 'Questions are recorded, with personal details removed, to improve these docs.';
export type ChatBudget = { perCaller: number; perDay: number; store?: ChatBudgetStore };
export type ChatCache = { maxEntries: number; ttlMinutes: number };
export type ChatRoute = { body?: Record<string, unknown>; model: string; provider?: 'openai'; baseUrl?: string; keyEnv?: string; maxTokens?: number; temperature?: number };
export type ChatEscalate = ChatRoute & { when: EscalateReason[] };
export type ChatDirect = { threshold: number; maxChars: number; margin: number; others: number };
export type ChatConfig = { body?: Record<string, unknown>; provider: 'openai'; model: string; baseUrl?: string; keyEnv?: string; maxTokens?: number; temperature?: number; passages?: number; readerView?: ReaderSelection; rerank?: ChatRerank; gate?: ChatGate; verify?: ChatVerify; direct?: ChatDirect; fallback?: ChatRoute[]; escalate?: ChatEscalate; cache?: ChatCache; cards?: ChatCards; budget?: ChatBudget; challenge?: ChatChallenge; log?: ChatLog; panel?: ChatPanel };

const mapping = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = ['provider', 'model', 'baseUrl', 'keyEnv', 'maxTokens', 'temperature', 'passages', 'readerView', 'rerank', 'gate', 'verify', 'direct', 'fallback', 'escalate', 'cache', 'cards', 'body', 'budget', 'challenge', 'log', 'panel'];

export function text(value: unknown, setting: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${setting} must be a nonempty string`);
  return value.trim();
}

export function integer(value: unknown, setting: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${setting} must be an integer from ${min} to ${max}`);
  return value;
}

const routeKeys = ['model', 'provider', 'baseUrl', 'keyEnv', 'maxTokens', 'temperature', 'body'];

// Extra fields to send with every request, such as OpenRouter's `reasoning`. They can add to a request but cannot replace what the tool owns,
// and they can never carry a key, because the config never holds one.
export function bodyFields(value: unknown, where: string): Record<string, unknown> {
  if (!mapping(value)) throw new Error(`${where} must be a mapping of request fields`);
  const secretLike = /key|secret|token|password|authorization|credential/i;
  const scan = (item: unknown, path: string, depth: number): void => {
    if (depth > 4) throw new Error(`${where} nests too deeply at ${path}`);
    if (item === null || ['string', 'number', 'boolean'].includes(typeof item)) return;
    if (Array.isArray(item)) { item.forEach((entry, at) => scan(entry, `${path}[${at}]`, depth + 1)); return; }
    if (mapping(item)) { for (const [name, entry] of Object.entries(item)) { if (secretLike.test(name)) throw new Error(`${where}.${path ? `${path}.` : ''}${name} looks like a secret. The config never holds a key; name the environment variable that does with keyEnv`); scan(entry, path ? `${path}.${name}` : name, depth + 1); } return; }
    throw new Error(`${where}.${path} must be text, a number, true or false, a list, or a mapping`);
  };
  for (const name of Object.keys(value)) if (reservedBodyFields.includes(name)) throw new Error(`${where}.${name} is set by Shoalrun and can't be replaced${name === 'model' ? '; use chat.model' : name === 'max_tokens' ? '; use chat.maxTokens' : name === 'temperature' ? '; use chat.temperature' : ''}`);
  scan(value, '', 0);
  if (JSON.stringify(value).length > 2000) throw new Error(`${where} is too large; keep it under 2,000 characters`);
  return value;
}

// `rerank: jev`, or a mapping that names the service. The endpoint may carry no credentials and no query, and the key comes from the
// environment variable named by keyEnv.
function rerankConfig(value: unknown): ChatRerank {
  if (value === 'jev') return { provider: 'jev' };
  if (!mapping(value)) throw new Error('chat.rerank must be jev, or a mapping with provider: jev and optionally endpoint, model, keyEnv, stateFormat, and onError');
  for (const key of Object.keys(value)) {
    if (['provider', 'endpoint', 'model', 'keyEnv', 'stateFormat', 'onError'].includes(key)) continue;
    throw new Error(/key|secret|token|password/i.test(key) ? `chat.rerank.${key} is not a setting. The config never holds a key; name the environment variable that does with keyEnv` : `chat.rerank has an unknown setting ${key}; it accepts provider, endpoint, model, keyEnv, stateFormat, and onError`);
  }
  if (value.provider !== 'jev') throw new Error('chat.rerank.provider must be jev, the yes/no scoring protocol that Jev and compatible services speak');
  const result: ChatRerank = { provider: 'jev' };
  if (value.endpoint !== undefined) {
    const endpoint = text(value.endpoint, 'chat.rerank.endpoint');
    let url: URL;
    try { url = new URL(endpoint); } catch { throw new Error('chat.rerank.endpoint must be a full URL such as https://api.example.com'); }
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('chat.rerank.endpoint must use https, except for localhost');
    if (url.username || url.password || url.search || url.hash) throw new Error('chat.rerank.endpoint must not contain credentials, a query, or a fragment. The config never holds a key; name the environment variable that does with keyEnv');
    result.endpoint = endpoint;
  }
  if (value.model !== undefined) result.model = text(value.model, 'chat.rerank.model');
  if (value.stateFormat !== undefined) { if (value.stateFormat !== 'object' && value.stateFormat !== 'string') throw new Error('chat.rerank.stateFormat must be object or string'); result.stateFormat = value.stateFormat; }
  if (value.onError !== undefined) { if (value.onError !== 'search' && value.onError !== 'answer') throw new Error('chat.rerank.onError must be search or answer'); result.onError = value.onError; }
  if (value.keyEnv !== undefined) {
    const name = text(value.keyEnv, 'chat.rerank.keyEnv');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('chat.rerank.keyEnv names an environment variable, such as LAYA_API_KEY, not the key itself');
    result.keyEnv = name;
  }
  return result;
}

function route(value: unknown, where: string, extra: string[] = []): ChatRoute {
  if (!mapping(value)) throw new Error(`${where} must be a mapping with at least a model`);
  for (const key of Object.keys(value)) {
    if (routeKeys.includes(key) || extra.includes(key)) continue;
    throw new Error(/key|secret|token|password/i.test(key) && key !== 'maxTokens' ? `${where}.${key} is not a setting. The config never holds a key; name the environment variable that does with keyEnv` : `${where} has an unknown setting ${key}; it accepts ${[...routeKeys, ...extra].join(', ')}`);
  }
  const result: ChatRoute = { model: text(value.model, `${where}.model`) };
  if (value.provider !== undefined) { if (value.provider !== 'openai') throw new Error(`${where}.provider must be openai`); result.provider = 'openai'; }
  if (value.keyEnv !== undefined) {
    const name = text(value.keyEnv, `${where}.keyEnv`);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`${where}.keyEnv names an environment variable, such as OPENROUTER_API_KEY, not the key itself`);
    result.keyEnv = name;
  }
  if (value.baseUrl !== undefined) {
    const url = text(value.baseUrl, `${where}.baseUrl`);
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error(`${where}.baseUrl must be an http or https URL`); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${where}.baseUrl must be an http or https URL`);
    if (parsed.username || parsed.password) throw new Error(`${where}.baseUrl must not contain credentials; name the key variable with keyEnv`);
    result.baseUrl = url;
  }
  if (value.maxTokens !== undefined) result.maxTokens = integer(value.maxTokens, `${where}.maxTokens`, 1, 100000);
  if (value.temperature !== undefined) {
    if (typeof value.temperature !== 'number' || !(value.temperature >= 0 && value.temperature <= 2)) throw new Error(`${where}.temperature must be a number from 0 to 2`);
    result.temperature = value.temperature;
  }
  if (value.body !== undefined) result.body = bodyFields(value.body, `${where}.body`);
  return result;
}

export function validateChat(value: unknown, readerFilters?: ReaderFiltersConfig): ChatConfig | undefined {
  if (value === undefined) return undefined;
  if (!mapping(value)) throw new Error('chat must be a mapping');
  for (const key of Object.keys(value)) {
    if (keys.includes(key)) continue;
    throw new Error(/key|secret|token|password/i.test(key)
      ? `chat.${key} is not a setting. The config never holds a key; name the environment variable that does with keyEnv`
      : `chat has an unknown setting ${key}; it accepts ${keys.join(', ')}`);
  }
  const provider = text(value.provider, 'chat.provider');
  if (provider !== 'openai') throw new Error('chat.provider must be openai, which covers any OpenAI-style service, including OpenRouter');
  const result: ChatConfig = { provider, model: text(value.model, 'chat.model') };
  if (value.keyEnv !== undefined) {
    const name = text(value.keyEnv, 'chat.keyEnv');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('chat.keyEnv names an environment variable, such as OPENROUTER_API_KEY, not the key itself');
    result.keyEnv = name;
  }
  if (value.baseUrl !== undefined) {
    const url = text(value.baseUrl, 'chat.baseUrl');
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('chat.baseUrl must be an http or https URL'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('chat.baseUrl must be an http or https URL');
    if (parsed.username || parsed.password) throw new Error('chat.baseUrl must not contain credentials; name the key variable with keyEnv');
    result.baseUrl = url;
  }
  if (value.maxTokens !== undefined) result.maxTokens = integer(value.maxTokens, 'chat.maxTokens', 1, 100000);
  if (value.passages !== undefined) result.passages = integer(value.passages, 'chat.passages', 1, 20);
  if (value.temperature !== undefined) {
    if (typeof value.temperature !== 'number' || !(value.temperature >= 0 && value.temperature <= 2)) throw new Error('chat.temperature must be a number from 0 to 2');
    result.temperature = value.temperature;
  }
  if (value.readerView !== undefined) {
    // Who the chat answers for. It uses the site's reader filters, so audience means the same thing in search and in chat.
    if (!readerFilters) throw new Error('chat.readerView needs readerFilters.facets in the site config');
    const selection = validateReaderSelection(value.readerView, readerFilters, 'chat.readerView');
    if (Object.values(selection).some(choices => !choices.length)) throw new Error('chat.readerView lists at least one choice for each filter');
    result.readerView = selection;
  }
  if (value.rerank !== undefined) {
    result.rerank = rerankConfig(value.rerank);
  }
  if (value.gate !== undefined) {
    if (!mapping(value.gate)) throw new Error('chat.gate must be a mapping with decline and hedge');
    for (const key of Object.keys(value.gate)) if (!['decline', 'hedge'].includes(key)) throw new Error(`chat.gate has an unknown setting ${key}; it accepts decline and hedge`);
    const { decline, hedge } = value.gate;
    if (typeof decline !== 'number' || typeof hedge !== 'number' || !(decline >= 0 && hedge <= 1 && decline < hedge)) throw new Error('chat.gate.decline and chat.gate.hedge must be numbers with 0 <= decline < hedge <= 1');
    if (!result.rerank) throw new Error('chat.gate needs chat.rerank: jev, because the gate reads Jev scores');
    result.gate = { decline, hedge };
  }
  if (value.verify !== undefined) {
    if (!mapping(value.verify)) throw new Error('chat.verify must be a mapping with threshold and onUnsupported');
    for (const key of Object.keys(value.verify)) if (!['threshold', 'onUnsupported'].includes(key)) throw new Error(`chat.verify has an unknown setting ${key}; it accepts threshold and onUnsupported`);
    const { threshold, onUnsupported = 'flag' } = value.verify;
    if (typeof threshold !== 'number' || !(threshold > 0 && threshold < 1)) throw new Error('chat.verify.threshold must be a number above 0 and below 1');
    if (onUnsupported !== 'flag' && onUnsupported !== 'remove') throw new Error('chat.verify.onUnsupported must be flag or remove');
    if (!result.rerank) throw new Error('chat.verify needs chat.rerank: jev, because Jev checks each sentence against the passage it cites');
    result.verify = { threshold, onUnsupported };
  }
  if (value.direct !== undefined) {
    if (!mapping(value.direct)) throw new Error('chat.direct must be a mapping with threshold and maxChars');
    for (const key of Object.keys(value.direct)) if (!['threshold', 'maxChars', 'margin', 'others'].includes(key)) throw new Error(`chat.direct has an unknown setting ${key}; it accepts threshold, maxChars, margin, and others`);
    const { threshold, maxChars = 1200, margin = 0.1, others = 1 } = value.direct;
    if (typeof margin !== 'number' || !(margin >= 0 && margin <= 1)) throw new Error('chat.direct.margin must be a number from 0 to 1');
    if (typeof others !== 'number' || !Number.isSafeInteger(others) || others < 0 || others > 20) throw new Error('chat.direct.others must be an integer from 0 to 20');
    if (typeof threshold !== 'number' || !(threshold > 0 && threshold <= 1)) throw new Error('chat.direct.threshold must be a number above 0 and at most 1');
    if (typeof maxChars !== 'number' || !Number.isSafeInteger(maxChars) || maxChars < 200 || maxChars > 6000) throw new Error('chat.direct.maxChars must be an integer from 200 to 6000');
    if (!result.rerank) throw new Error('chat.direct needs chat.rerank: jev, because it reads Jev scores');
    if (result.gate && threshold < result.gate.hedge) throw new Error('chat.direct.threshold must be at least chat.gate.hedge, so a passage shown word for word is never one the gate would hedge on');
    result.direct = { threshold, maxChars, margin, others };
  }
  if (value.body !== undefined) result.body = bodyFields(value.body, 'chat.body');
  if (value.cards !== undefined) {
    if (!mapping(value.cards)) throw new Error('chat.cards must be a mapping with threshold and confirm');
    for (const key of Object.keys(value.cards)) if (!['threshold', 'confirm'].includes(key)) throw new Error(`chat.cards has an unknown setting ${key}; it accepts threshold and confirm`);
    // Similarity only shortlists a card. Jev's confirmation is the safety, so the shortlist can be loose.
    const { threshold = 0.75, confirm = 0.9 } = value.cards;
    if (typeof threshold !== 'number' || !(threshold > 0 && threshold <= 1)) throw new Error('chat.cards.threshold must be a number above 0 and at most 1');
    if (typeof confirm !== 'number' || !(confirm > 0 && confirm <= 1)) throw new Error('chat.cards.confirm must be a number above 0 and at most 1');
    if (!result.rerank) throw new Error('chat.cards needs chat.rerank: jev, because Jev confirms that a card answers the question');
    result.cards = { threshold, confirm };
  }
  if (value.log !== undefined) {
    if (!mapping(value.log)) throw new Error('chat.log must be a mapping');
    for (const key of Object.keys(value.log)) if (!['retentionDays', 'maxPerDay', 'answers', 'notice'].includes(key)) throw new Error(`chat.log has an unknown setting ${key}; it accepts retentionDays, maxPerDay, answers, and notice`);
    if (!value.budget || !mapping(value.budget) || !value.budget.store) throw new Error('chat.log needs chat.budget.store, because questions are recorded in the same store as the daily counters');
    const notice = value.log.notice === undefined ? defaultLogNotice : typeof value.log.notice === 'string' ? value.log.notice.trim() : '';
    if (!notice || notice.length > 300) throw new Error('chat.log.notice must be text of 300 characters or fewer, shown to readers');
    if (value.log.answers !== undefined && typeof value.log.answers !== 'boolean') throw new Error('chat.log.answers must be true or false');
    result.log = { retentionDays: value.log.retentionDays === undefined ? 30 : integer(value.log.retentionDays, 'chat.log.retentionDays', 1, 365), maxPerDay: value.log.maxPerDay === undefined ? 2000 : integer(value.log.maxPerDay, 'chat.log.maxPerDay', 1, 100000), answers: value.log.answers ?? true, notice };
  }
  if (value.panel !== undefined) {
    if (!mapping(value.panel)) throw new Error('chat.panel must be a mapping with title, placeholder, or intro');
    const panel: ChatPanel = {};
    for (const [key, entry] of Object.entries(value.panel)) {
      if (key !== 'title' && key !== 'placeholder' && key !== 'intro') throw new Error(`chat.panel has an unknown setting ${key}; it accepts title, placeholder, and intro`);
      const words = typeof entry === 'string' ? entry.trim() : '';
      if (!words || words.length > 150) throw new Error(`chat.panel.${key} must be text of 150 characters or fewer`);
      panel[key] = words;
    }
    if (Object.keys(panel).length) result.panel = panel;
  }
  if (value.challenge !== undefined) {
    const challenge = value.challenge;
    if (!mapping(challenge)) throw new Error('chat.challenge must be a mapping with provider, siteKey, and secretEnv');
    for (const key of Object.keys(challenge)) {
      if (['provider', 'siteKey', 'secretEnv', 'when', 'freeQuestions', 'busyShare'].includes(key)) continue;
      throw new Error(/key|secret|token|password/i.test(key) ? `chat.challenge.${key} is not a setting. The config never holds a secret; name the environment variable that does with secretEnv` : `chat.challenge has an unknown setting ${key}; it accepts provider, siteKey, secretEnv, when, freeQuestions, and busyShare`);
    }
    if (challenge.provider !== 'turnstile') throw new Error('chat.challenge.provider must be turnstile');
    const siteKey = typeof challenge.siteKey === 'string' ? challenge.siteKey.trim() : '';
    if (!/^[0-9A-Za-z_-]{8,64}$/.test(siteKey)) throw new Error('chat.challenge.siteKey must be the public site key from the Turnstile dashboard');
    const secretEnv = typeof challenge.secretEnv === 'string' ? challenge.secretEnv.trim() : '';
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(secretEnv)) throw new Error('chat.challenge.secretEnv names an environment variable, such as TURNSTILE_SECRET_KEY, not the secret itself');
    if (challenge.when !== undefined && challenge.when !== 'adaptive' && challenge.when !== 'always') throw new Error('chat.challenge.when must be adaptive or always');
    if (challenge.busyShare !== undefined && (typeof challenge.busyShare !== 'number' || !(challenge.busyShare > 0 && challenge.busyShare <= 1))) throw new Error('chat.challenge.busyShare must be a number above 0 and at most 1');
    result.challenge = { provider: 'turnstile', siteKey, secretEnv, when: challenge.when ?? 'adaptive', freeQuestions: challenge.freeQuestions === undefined ? 3 : integer(challenge.freeQuestions, 'chat.challenge.freeQuestions', 0, 1000), busyShare: challenge.busyShare ?? 0.5 };
  }
  if (value.budget !== undefined) {
    if (!mapping(value.budget)) throw new Error('chat.budget must be a mapping with perCaller and perDay');
    for (const key of Object.keys(value.budget)) if (!['perCaller', 'perDay', 'store'].includes(key)) throw new Error(`chat.budget has an unknown setting ${key}; it accepts perCaller, perDay, and store`);
    const perCaller = integer(value.budget.perCaller, 'chat.budget.perCaller', 1, 100000);
    const perDay = integer(value.budget.perDay, 'chat.budget.perDay', 1, 10000000);
    if (perCaller > perDay) throw new Error('chat.budget.perCaller can not be more than chat.budget.perDay');
    result.budget = { perCaller, perDay };
    if (value.budget.store !== undefined) {
      const store = value.budget.store;
      if (!mapping(store)) throw new Error('chat.budget.store must be a mapping with provider, urlEnv, and tokenEnv');
      for (const key of Object.keys(store)) {
        if (['provider', 'urlEnv', 'tokenEnv'].includes(key)) continue;
        throw new Error(/key|secret|token|password|url/i.test(key) && !['urlEnv', 'tokenEnv'].includes(key) ? `chat.budget.store.${key} is not a setting. The config never holds an address or token; name the environment variables that do with urlEnv and tokenEnv` : `chat.budget.store has an unknown setting ${key}; it accepts provider, urlEnv, and tokenEnv`);
      }
      if (store.provider !== 'upstash') throw new Error('chat.budget.store.provider must be upstash, the REST API that Upstash Redis and Vercel KV provide');
      const name = (setting: unknown, where: string) => {
        const text = typeof setting === 'string' ? setting.trim() : '';
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) throw new Error(`${where} names an environment variable, such as KV_REST_API_URL, not the value itself`);
        return text;
      };
      result.budget.store = { provider: 'upstash', urlEnv: name(store.urlEnv, 'chat.budget.store.urlEnv'), tokenEnv: name(store.tokenEnv, 'chat.budget.store.tokenEnv') };
    }
  }
  if (value.cache !== undefined) {
    if (!mapping(value.cache)) throw new Error('chat.cache must be a mapping with maxEntries and ttlMinutes');
    for (const key of Object.keys(value.cache)) if (!['maxEntries', 'ttlMinutes'].includes(key)) throw new Error(`chat.cache has an unknown setting ${key}; it accepts maxEntries and ttlMinutes`);
    result.cache = { maxEntries: value.cache.maxEntries === undefined ? 500 : integer(value.cache.maxEntries, 'chat.cache.maxEntries', 1, 100000), ttlMinutes: value.cache.ttlMinutes === undefined ? 1440 : integer(value.cache.ttlMinutes, 'chat.cache.ttlMinutes', 1, 525600) };
  }
  if (value.fallback !== undefined) {
    if (!Array.isArray(value.fallback) || value.fallback.length < 1 || value.fallback.length > 5) throw new Error('chat.fallback must be a list of one to five models');
    result.fallback = value.fallback.map((entry, at) => route(entry, `chat.fallback[${at}]`));
  }
  if (value.escalate !== undefined) {
    const second = route(value.escalate, 'chat.escalate', ['when']);
    let when: EscalateReason[];
    if ((value.escalate as Record<string, unknown>).when === undefined) when = ['unsupported-code', 'uncited', ...(result.verify ? ['unsupported-claim' as const] : [])];
    else {
      const listed = (value.escalate as Record<string, unknown>).when;
      if (!Array.isArray(listed) || !listed.length || new Set(listed).size !== listed.length || listed.some(reason => !escalateReasons.includes(reason as EscalateReason))) throw new Error(`chat.escalate.when must be a unique list of ${escalateReasons.join(', ')}`);
      when = listed as EscalateReason[];
    }
    if (when.includes('unsupported-claim') && !result.verify) throw new Error('chat.escalate.when lists unsupported-claim, which needs chat.verify');
    result.escalate = { ...second, when };
  }
  return result;
}

export type ChatFlags = { model?: string; baseUrl?: string; keyEnv?: string; passages?: number };

// Flags override the config, so a model can be tried without editing it. A missing chat section is an error, because nothing
// here supplies a default service.
export function chatProviderConfig(config: ChatConfig | undefined, flags: ChatFlags = {}): ChatProviderConfig {
  const provider = config?.provider;
  const model = flags.model ?? config?.model;
  if (!provider || !model) throw new Error('Choose a chat provider and model: set chat in docs.config.yaml, or add chat.provider and chat.model');
  return { provider, model, baseUrl: flags.baseUrl ?? config?.baseUrl, keyEnv: flags.keyEnv ?? config?.keyEnv, maxTokens: config?.maxTokens, temperature: config?.temperature, ...(config?.body ? { body: config.body } : {}) };
}

const merged = (main: ChatProviderConfig, entry: ChatRoute): ChatProviderConfig => ({ ...main, ...Object.fromEntries(Object.entries(entry).filter(([key, value]) => value !== undefined && key !== 'when')) });

// The provider settings for each extra model. Each inherits the main model's settings and overrides only what it names.
export function chatRoutes(config: ChatConfig | undefined, main: ChatProviderConfig): { fallbacks: ChatProviderConfig[]; escalate?: { config: ChatProviderConfig; when: EscalateReason[] } } {
  return { fallbacks: (config?.fallback ?? []).map(entry => merged(main, entry)), ...(config?.escalate ? { escalate: { config: merged(main, config.escalate), when: config.escalate.when } } : {}) };
}
