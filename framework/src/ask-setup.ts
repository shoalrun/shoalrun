import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AnswerCache } from './answer-cache.js';
import { CardIndex, readCards } from './answer-cards.js';
import type { AskOptions } from './ask.js';
import { chatProviderConfig, chatRoutes, validateChat } from './chat-config.js';
import { createChatProvider, fallbackChat, type ChatProvider } from './chat.js';
import { loadConfig } from './config.js';
import { validateReaderFilters, validateReaderSelection, type ReaderSelection } from './reader-filters.js';
import { createProvider, readEmbeddings } from './embeddings.js';
import { DailyBudget, memoryBudgetStore, type BudgetStore } from './budget.js';
import { envBudgetStore } from './budget-store.js';
import { jevAvailable, jevEndpoint, type JevOptions } from './jev.js';
import { queryProviderConfig, validateRetrieval } from './retrieval-config.js';
import { Retriever } from './retrieval.js';

// `--reader-view audience=authors,maintainers`, repeatable for more than one filter.
export function parseReaderView(specs: string[]): ReaderSelection | undefined {
  if (!specs.length) return undefined;
  const selection: ReaderSelection = {};
  for (const spec of specs) {
    const match = /^([a-z][a-z0-9-]*)=(.+)$/.exec(spec);
    if (!match) throw new Error(`--reader-view needs facet=choice[,choice], such as audience=authors; got ${JSON.stringify(spec)}`);
    if (selection[match[1]]) throw new Error(`--reader-view names ${match[1]} twice`);
    selection[match[1]] = match[2].split(',').map(choice => choice.trim()).filter(Boolean);
  }
  return selection;
}

// Either `configFile`, or `settings` (the parsed config, for a host that has no config file, such as a serverless function).
export type AskSetupInput = { sharedStore?: boolean; siteDirectory: string; configFile?: string; settings?: Record<string, unknown>; model?: string; passages?: number; channel?: string; version?: string; language?: string; noRerank?: boolean; noDirect?: boolean; noEscalate?: boolean; noCards?: boolean; cache?: boolean; direct?: { threshold: number; maxChars?: number }; jevCacheDir?: string; readerView?: ReaderSelection; maxTokens?: number };
export type AskSetup = { budget?: DailyBudget; budgetStore?: BudgetStore; chat: ChatProvider; options: Omit<AskOptions, 'question'>; notes: string[]; embedTexts?: (texts: string[]) => Promise<Float32Array[]>; embedding?: { provider: string; model: string; space: string; dimension: number } };

// Everything `shoalrun ask` and the answer eval share: read the project's chat and retrieval settings, load the passages and any
// vectors, and wire up the optional layers. A layer that isn't configured is left out, and one that is configured but can't run
// (Jev without a key) is left out with a note.
export async function prepareAsk(input: AskSetupInput): Promise<AskSetup> {
  if (!input.settings && !input.configFile) throw new Error('prepareAsk needs a config file or settings');
  const settings = input.settings ?? (await loadConfig(input.configFile as string)).value;
  const readerFilters = validateReaderFilters(settings.readerFilters);
  const chatConfig = validateChat(settings.chat, readerFilters);
  const retrieval = validateRetrieval(settings.retrieval);
  // --model replaces the main model only. Fallback and escalation models still inherit the config's settings.
  const mainConfig = chatProviderConfig(chatConfig, { model: input.model });
  const routes = chatRoutes(chatConfig, chatProviderConfig(chatConfig));
  const chat = fallbackChat([createChatProvider(mainConfig), ...routes.fallbacks.map(createChatProvider)]);
  let chunks;
  try { chunks = JSON.parse(await readFile(path.join(input.siteDirectory, 'ai', 'chunks.json'), 'utf8')); }
  catch (error) { throw (error as NodeJS.ErrnoException).code === 'ENOENT' ? new Error(`No ai/chunks.json in ${input.siteDirectory}; run shoalrun index first`) : error; }
  const embeddings = await readEmbeddings(input.siteDirectory);
  const retriever = new Retriever(chunks, embeddings);
  const variants = retriever.variants();
  const variant = input.channel && input.version && input.language ? `${input.channel}|${input.version}|${input.language}` : variants.length === 1 ? variants[0] : undefined;
  if (!variant) throw new Error(`The site has several publications (${variants.join(', ')}); pass --channel, --version, and --language`);
  let embedQuery: AskOptions['embedQuery'];
  let embedTexts: AskSetup['embedTexts'];
  let embedding: AskSetup['embedding'];
  if (embeddings) {
    const queryProvider = createProvider(queryProviderConfig(retrieval, embeddings.meta));
    if (queryProvider.space !== embeddings.meta.space || (embeddings.meta.backend && queryProvider.backend !== embeddings.meta.backend)) throw new Error(`${queryProvider.model} is not in the embedding space or backend of ${embeddings.meta.model}; set retrieval.embeddings.queryModel and baseUrl to compatible values`);
    embedQuery = async (text, signal) => (await queryProvider.embed([text], 'query', signal))[0];
    embedTexts = texts => queryProvider.embed(texts, 'query');
    embedding = { provider: queryProvider.name, model: queryProvider.model, space: queryProvider.space, dimension: queryProvider.dimension };
  }
  // A reader view on the command line replaces the config's, so one run can answer for a different audience.
  if (input.readerView && !readerFilters) throw new Error('--reader-view needs readerFilters.facets in the site config');
  const readerSelection = input.readerView ? validateReaderSelection(input.readerView, readerFilters!, '--reader-view') : chatConfig?.readerView;
  const notes: string[] = [];
  const rerank = Boolean(chatConfig?.rerank) && !input.noRerank;
  const scoring = chatConfig?.rerank;
  const scorer: JevOptions = { ...(scoring?.endpoint ? { endpoint: jevEndpoint(scoring.endpoint) } : {}), ...(scoring?.model ? { model: scoring.model } : {}), ...(scoring?.keyEnv ? { keyEnv: scoring.keyEnv } : {}), ...(scoring?.stateFormat ? { stateFormat: scoring.stateFormat } : {}), ...(input.jevCacheDir ? { cacheDir: input.jevCacheDir } : {}) };
  const scoringReady = jevAvailable(scoring?.keyEnv);
  // A scorer that is configured but has no key counts as down, not as absent: it is what keeps off-topic questions from the model.
  if (rerank && !scoringReady) notes.push(`The relevance scorer has no key: set ${scoring?.keyEnv ?? 'JEV_API_KEY'}. Until then it counts as down, so ${scoring?.onError === 'answer' ? 'the model answers without the gate and the claim check' : 'questions get the closest pages and no model call'}`);
  // Answer cards need semantic search and Jev. A configured but missing card file is a note, not an error, so the chat still answers.
  let cards: AskOptions['cards'];
  if (chatConfig?.cards && !input.noCards && rerank && scoringReady) {
    const file = await readCards(input.siteDirectory);
    if (!file) notes.push('chat.cards is set but there is no ai/answers.json; run shoalrun answers to make it');
    else if (!embedding || file.embedding.space !== embedding.space || file.embedding.dimension !== embedding.dimension) notes.push('The answer cards were made with a different embedding model, so they are not used; run shoalrun answers again');
    else cards = { index: new CardIndex(file), threshold: chatConfig.cards.threshold, confirm: chatConfig.cards.confirm, jev: { ...scorer, maxCalls: 1 } };
  }
  // The shared store is for a hosted function. A local run keeps its counters in memory, so it never needs the store's keys.
  const store = input.sharedStore && chatConfig?.budget?.store ? envBudgetStore(chatConfig.budget.store) : memoryBudgetStore();
  const reported = new Set<string>();
  const onBudgetError = (error: Error) => { if (!reported.has(error.message)) { reported.add(error.message); process.stderr.write(`Budget: ${error.message}. Questions get the closest pages, with no model call, until it works.\n`); } };
  return { ...(chatConfig?.budget ? { budget: new DailyBudget(store, chatConfig.budget, Date.now, onBudgetError), budgetStore: store } : {}), chat, notes, embedTexts, embedding, options: { ...(scoring?.onError ? { onScorerError: scoring.onError } : {}), retriever, chat, variant, readerSelection, embedQuery, passages: input.passages ?? chatConfig?.passages, gate: chatConfig?.gate, ...(input.maxTokens ? { maxTokens: input.maxTokens } : {}), ...(rerank ? { jev: { ...scorer, top: 24, maxCalls: 2 } } : {}), ...(cards ? { cards } : {}), ...(input.cache && chatConfig?.cache ? { cache: new AnswerCache({ maxEntries: chatConfig.cache.maxEntries, ttlMs: chatConfig.cache.ttlMinutes * 60_000 }) } : {}), ...(routes.escalate && !input.noEscalate ? { escalate: { chat: createChatProvider(routes.escalate.config), when: routes.escalate.when } } : {}), ...(rerank && scoringReady && !input.noDirect && (input.direct || chatConfig?.direct) ? { direct: { threshold: input.direct?.threshold ?? chatConfig!.direct!.threshold, maxChars: input.direct?.maxChars ?? chatConfig?.direct?.maxChars ?? 1200, margin: chatConfig?.direct?.margin ?? 0.1, others: chatConfig?.direct?.others ?? 1, jev: { ...scorer, maxCalls: 2 } } } : {}), ...(rerank && scoringReady && chatConfig?.verify ? { verify: { ...chatConfig.verify, jev: { ...scorer, maxCalls: 3 } } } : {}) } };
}
