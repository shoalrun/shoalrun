import { copyFunctionRuntime } from './function-package.js';
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateChat } from './chat-config.js';
import { loadConfig } from './config.js';
import { createProvider, embedChunkIndex, readEmbeddings, writeEmbeddings, type StoredEmbeddings } from './embeddings.js';
import { buildChunkIndex, embeddingInput } from './index-build.js';
import { validateReaderFilters } from './reader-filters.js';
import { embeddingProviderConfig, validateRetrieval } from './retrieval-config.js';
import type { FunctionRuntime } from './ask-function.js';

// Adds the optional answer function to a Vercel build. The site's static files are already built. This indexes them, moves the index out of
// the static directory (which is public) into the function's own directory, writes the settings without any key, and copies the code
// the function needs. It is opt-in: without it, a build never runs a model or writes a function.
export type AskFunctionResult = { added: true; directory: string; chunks: number; embedded: boolean; embeddingCounts: { embedded: number; reused: number } } | { added: false; reason: string };

// Puts the panel script on every page. A page that already has it is left alone.
async function addPanelToPages(directory: string, basePath: string): Promise<number> {
  const tag = `<script src="${basePath}/__shoalrun/ask.js" defer></script>`;
  let pages = 0;
  const visit = async (folder: string): Promise<void> => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const html = await readFile(file, 'utf8');
      if (html.includes(tag) || !html.includes('</body>')) continue;
      await writeFile(file, html.replace('</body>', `${tag}</body>`));
      pages++;
    }
  };
  await visit(directory);
  return pages;
}

export async function addAskFunction(input: { configFile: string; staticDirectory: string; functionsDirectory: string; basePath?: string; distDirectory?: string; env?: NodeJS.ProcessEnv }): Promise<AskFunctionResult> {
  const basePath = input.basePath ?? '';
  const func = path.join(input.functionsDirectory, basePath.slice(1), '__shoalrun', 'ask.func');
  const searchFunc = path.join(input.functionsDirectory, basePath.slice(1), '__shoalrun', 'search.func');
  let previous: { retrieval: unknown; embeddings: StoredEmbeddings } | undefined;
  try {
    const runtime = JSON.parse(await readFile(path.join(func, 'runtime.json'), 'utf8')) as FunctionRuntime;
    const embeddings = await readEmbeddings(path.join(func, 'site'));
    if (embeddings) previous = { retrieval: runtime.settings?.retrieval, embeddings };
  } catch { /* A missing or damaged previous bundle is a cache miss. */ }
  await rm(func, { recursive: true, force: true });
  await rm(searchFunc, { recursive: true, force: true });
  const env = input.env ?? process.env;
  const settings = (await loadConfig(input.configFile)).value;
  const readerFilters = validateReaderFilters(settings.readerFilters);
  const chat = validateChat(settings.chat, readerFilters);
  if (!chat) return { added: false, reason: 'the config has no chat section' };
  if (!chat.budget?.store) return { added: false, reason: 'chat.budget needs a shared store (chat.budget.store), so the daily caps hold across server instances' };
  const retrieval = validateRetrieval(settings.retrieval);
  if (!retrieval?.embeddings) return { added: false, reason: 'the config has no retrieval.embeddings, so there is nothing to search meaningfully' };
  const provider = createProvider(embeddingProviderConfig(retrieval, {}));
  const keyName = retrieval.embeddings.keyEnv ?? (provider.name === 'voyage' ? 'VOYAGE_API_KEY' : 'OPENAI_API_KEY');
  if (!env[keyName]) return { added: false, reason: `set ${keyName} at build time to embed the passages` };

  const built = await buildChunkIndex(input.staticDirectory);
  const site = path.join(func, 'site');
  let embedded;
  try {
    // Compilation replaces static output, while the prior function holds the only private vectors.
    // Reuse them only when the exact retrieval settings still name the same embedding service.
    if (previous && JSON.stringify(previous.retrieval) === JSON.stringify(settings.retrieval)) {
      await writeEmbeddings(input.staticDirectory, previous.embeddings.meta, previous.embeddings.vectors);
    }
    embedded = await embedChunkIndex(input.staticDirectory, built.index, provider, embeddingInput);
    await mkdir(site, { recursive: true });
    // The index is private. It must not stay in the static directory, which is served to everyone.
    await rename(path.join(input.staticDirectory, 'ai'), path.join(site, 'ai'));
  } finally {
    await rm(path.join(input.staticDirectory, 'ai'), { recursive: true, force: true });
  }

  // What the browser needs: the panel script, and a small public settings file with the Turnstile site key, the recording notice, and the panel wording.
  // Nothing in it is secret. The panel is added to every page.
  const shoalrun = path.join(input.staticDirectory, basePath.slice(1), '__shoalrun');
  await mkdir(shoalrun, { recursive: true });
  const assets = path.join(input.distDirectory ?? path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
  await cp(path.join(assets, 'ask-widget.js'), path.join(shoalrun, 'ask.js'));
  await writeFile(path.join(shoalrun, 'chat.json'), JSON.stringify({ ...(chat.challenge ? { siteKey: chat.challenge.siteKey, ...(chat.challenge.when === 'always' ? { prewarm: true } : {}) } : {}), ...(chat.log ? { notice: chat.log.notice } : {}), ...(chat.panel ? { panel: chat.panel } : {}) }, null, 2) + '\n');
  await addPanelToPages(input.staticDirectory, basePath);

  const publications = (settings.publications as { defaults?: { channel?: string; version?: string; language?: string } } | undefined)?.defaults;
  const origin = (settings.site as { origin?: string } | undefined)?.origin;
  const runtime: FunctionRuntime = {
    schemaVersion: 1,
    settings: { chat: settings.chat, retrieval: settings.retrieval, ...(settings.search ? { search: settings.search } : {}), ...(settings.readerFilters ? { readerFilters: settings.readerFilters } : {}) },
    ...(publications?.channel && publications.version && publications.language ? { variant: { channel: publications.channel, version: publications.version, language: publications.language } } : {}),
    ...(origin ? { hosts: [new URL(origin).host] } : {})
  };
  await writeFile(path.join(func, 'runtime.json'), JSON.stringify(runtime, null, 2) + '\n');

  const dist = input.distDirectory ?? path.dirname(fileURLToPath(import.meta.url));
  await copyFunctionRuntime(dist, 'ask-function.js', func);
  await writeFile(path.join(func, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');
  await writeFile(path.join(func, 'index.js'), `import { createAskFunction, nodeAdapter } from './lib/ask-function.js';\n\nconst directory = new URL('.', import.meta.url).pathname;\nexport default nodeAdapter(() => createAskFunction(directory));\n`);
  // The answer can take about a minute. Hobby allows up to 300 seconds with Fluid compute, so 120 leaves room.
  await writeFile(path.join(func, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 120, memory: 1024 }, null, 2) + '\n');
  await cp(func, searchFunc, { recursive: true });
  await writeFile(path.join(searchFunc, 'index.js'), `import { createHostedSearchFunction, nodeAdapter } from './lib/ask-function.js';\n\nconst directory = new URL('.', import.meta.url).pathname;\nexport default nodeAdapter(() => createHostedSearchFunction(directory));\n`);
  await writeFile(path.join(searchFunc, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 30, memory: 1024 }, null, 2) + '\n');
  await readdir(func);
  return { added: true, directory: func, chunks: built.index.chunks.length, embedded: true, embeddingCounts: { embedded: embedded.embedded, reused: embedded.reused } };
}
