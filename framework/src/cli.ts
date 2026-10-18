#!/usr/bin/env node
import { compareDocumentSnapshots } from './document-sync.js';
import { validateAuthoringGuidance } from './authoring-guidance.js';
import { resolveAgentDiscovery } from './agent-discovery.js';
import { configField } from './compiler-config.js';
import { checkThemeContrast, compile } from './compiler.js';
import { explain, loadConfig } from './config.js';
import { auditReference } from './reference-audit.js';
import { importRemoteOpenApi, refreshRemoteOpenApi } from './remote-import.js';
import { auditFocusedContracts } from './focused-audit.js';
import { auditProject } from './audit.js';
import { scaffold, scaffoldFromPath } from './scaffold.js';
import { initProject, type Starter } from './init.js';
import { selectApiReferences } from './api-selection.js';
import { materializeApiPages } from './api-materialize.js';
import { serveSite, type SiteExtras } from './server.js';
import { createAskHandler } from './ask-handler.js';
import { createSearchHandler } from './search-handler.js';
import { Retriever } from './retrieval.js';
import { AskLog, analyzeLog, checkLogPath, formatReport, readLog } from './ask-log.js';
import { readKvLog } from './ask-log-kv.js';
import { envRedis } from './budget-store.js';
import { pausedKey } from './chat-pause.js';
import { stringify as yamlStringify } from 'yaml';
import { startDev } from './dev.js';
import { buildVercel } from './vercel.js';
import { queryBuiltSite, type SearchOptions } from './search-query.js';
import { parseDocsReadOptions, runDocsReadCommand } from './docs-command.js';
import { DocumentationError } from './documentation-core.js';
import { checkEvalReport, prepareEvalReport, evalBuildSnapshot, compareEvalBuildInventories } from './docs-eval.js';
import { docsApply, docsContext, docsPlan } from './docs-author.js';
import { runProjectCommand } from './authoring-project-command.js';
import { runValidationCommand } from './authoring-validation-command.js';
import { runAuthoringReviewCommand } from './authoring-review-command.js';
import { writeRecipeDraft } from './recipe-draft.js';
import { writeIngredientDraft } from './ingredient-draft.js';
import { buildChunkIndex, embeddingInput } from './index-build.js';
import { createProvider, embedChunkIndex, readEmbeddings } from './embeddings.js';
import { embeddingProviderConfig, queryProviderConfig, validateRetrieval } from './retrieval-config.js';
import { defaultLogNotice, validateChat } from './chat-config.js';
import { createSession, turnstileVerifier } from './turnstile.js';
import { adaptiveChallenge } from './budget.js';
import { validateReaderFilters } from './reader-filters.js';
import { askQuestion } from './ask.js';
import { parseReaderView, prepareAsk } from './ask-setup.js';
import { buildCards, parseCardQuestions, writeCards } from './answer-cards.js';
import type { BuildProvenance } from './build-info.js';
import { access, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

async function discoverConfig(start: string): Promise<string> {
  let directory = path.resolve(start);
  while (true) {
    const candidate = path.join(directory, 'docs.config.yaml');
    try { await access(candidate); return candidate; } catch { /* Try parent. */ }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('No docs.config.yaml found; pass --config FILE');
    directory = parent;
  }
}

function buildArguments(args: string[], defaultOutput: string): { config: string; output: string; provenance: BuildProvenance } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }
    if (!['--source-commit', '--release-label'].includes(value)) throw new Error(`Unknown build option ${value}`);
    if (flags[value] !== undefined) throw new Error(`Duplicate build option ${value}`);
    const next = args[++index];
    if (!next || next.startsWith('--')) throw new Error(`Build option ${value} needs a value`);
    flags[value] = next;
  }
  if (positional.length > 2) throw new Error('Build accepts at most a config and output directory');
  return { config: positional[0] ?? 'docs.config.yaml', output: positional[1] ?? defaultOutput, provenance: { sourceCommit: flags['--source-commit'], releaseLabel: flags['--release-label'] } };
}

// An unset or empty PORT means the default; serveSite rejects anything else that is not a port number.
const defaultPort = () => process.env.PORT?.trim() ? Number(process.env.PORT) : 8765;

const [command, subcommand, ...rest] = process.argv.slice(2);
try {
  if (command === 'init') {
    const args = [subcommand, ...rest].filter((item): item is string => item !== undefined);
    let directory = '.';
    let starter: Starter = 'minimal';
    let hasDirectory = false;
    let hasStarter = false;
    for (let index = 0; index < args.length; index++) {
      const value = args[index];
      if (value === '--starter') {
        if (hasStarter || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Usage: shoalrun init [directory] [--starter minimal|api-docs]');
        starter = args[++index] as Starter;
        hasStarter = true;
      } else if (value.startsWith('--') || hasDirectory) {
        throw new Error('Usage: shoalrun init [directory] [--starter minimal|api-docs]');
      } else {
        directory = value;
        hasDirectory = true;
      }
    }
    process.stdout.write(JSON.stringify(await initProject(directory, starter), null, 2) + '\n');
  } else if (command === 'build') {
    const { config, output, provenance } = buildArguments([subcommand, ...rest].filter((item): item is string => item !== undefined), 'site-dist');
    const manifest = await compile(config, output, provenance);
    process.stdout.write(JSON.stringify({ status: 'ok', documents: manifest.documents.length, operations: Object.keys(manifest.operations).length }, null, 2) + '\n');
  } else if (command === 'dev') {
    const args = [subcommand, ...rest].filter((item): item is string => item !== undefined);
    const positional: string[] = [];
    let port = defaultPort();
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--port') {
        if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Usage: shoalrun dev [config] [output] [--port PORT]');
        port = Number(args[++index]);
      } else if (args[index].startsWith('--')) throw new Error(`Unknown dev option ${args[index]}`);
      else positional.push(args[index]);
    }
    if (positional.length > 2) throw new Error('Usage: shoalrun dev [config] [output] [--port PORT]');
    await startDev(positional[0] ?? 'docs.config.yaml', positional[1] ?? 'site-dist', '127.0.0.1', port);
  } else if (command === 'vercel' && subcommand === 'build') {
    // --chat adds the optional answer function: it needs chat and retrieval settings and the embedding key at build time.
    const chat = rest.includes('--chat');
    const { config, output, provenance } = buildArguments(rest.filter(item => item !== '--chat'), '.vercel/output');
    const result = await buildVercel(config, output, provenance, { chat });
    // Asking for the chat and not getting it must fail the deploy. Otherwise a site would look ready and have no chat.
    if (chat && result.chat && !result.chat.added) throw new Error(`The chat was requested but not added: ${result.chat.reason}`);
    process.stdout.write(JSON.stringify({ status: 'ok', ...result }, null, 2) + '\n');
  } else if (command === 'serve') {
    const usage = 'Usage: shoalrun serve <site-directory> [--host HOST] [--port PORT] [--search [--config FILE]] [--ask [--config FILE] [--model MODEL] [--log FILE] [--public-preview] [--reader-view FACET=CHOICE[,CHOICE]]...]';
    if (!subcommand || subcommand.startsWith('--')) throw new Error(usage);
    const options: Record<string, string> = {};
    const serveViews: string[] = [];
    let ask = false;
    let search = false;
    let publicPreview = false;
    for (let index = 0; index < rest.length; index++) {
      const flag = rest[index];
      if (flag === '--ask') { if (ask) throw new Error('Duplicate --ask'); ask = true; continue; }
      if (flag === '--search') { if (search) throw new Error('Duplicate --search'); search = true; continue; }
      if (flag === '--public-preview') { if (publicPreview) throw new Error('Duplicate --public-preview'); publicPreview = true; continue; }
      const value = rest[++index];
      if (flag === '--reader-view' && value && !value.startsWith('--')) { serveViews.push(value); continue; }
      if (!['--host', '--port', '--config', '--model', '--log'].includes(flag) || !value) throw new Error(usage);
      if (options[flag] !== undefined) throw new Error(`Duplicate serve option ${flag}`);
      options[flag] = value;
    }
    if (!ask && !search && (options['--model'] || options['--log'] || publicPreview || serveViews.length)) throw new Error('--config, --model, --log, --public-preview, and --reader-view need --ask');
    if (!ask && !search && options['--config']) throw new Error('--config needs --search or --ask');
    if (!ask && (options['--model'] || options['--log'] || publicPreview || serveViews.length)) throw new Error('--model, --log, --public-preview, and --reader-view need --ask');
    const host = options['--host'] ?? '127.0.0.1';
    const port = options['--port'] === undefined ? defaultPort() : Number(options['--port']);
    let extras: SiteExtras | undefined;
    const hosts: string[] = [];
    let banner = '';
    if (search) {
      if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error('--search runs only on a loopback address because embedding queries spend API credits');
      const configFile = options['--config'] ?? await discoverConfig(process.cwd());
      const settings = (await loadConfig(configFile)).value;
      const chunks = JSON.parse(await readFile(path.join(subcommand, 'ai', 'chunks.json'), 'utf8'));
      const searchIndex = JSON.parse(await readFile(path.join(subcommand, 'search-index.json'), 'utf8')) as { documents: Array<{ id: string; variant: string; summary: string }> };
      const pageSummaries = new Map(searchIndex.documents.map(document => [`${document.variant}:${document.id}`, document.summary]));
      const embeddings = await readEmbeddings(subcommand);
      const retriever = new Retriever(chunks, embeddings);
      let embedQuery: ((query: string, signal?: AbortSignal) => Promise<Float32Array>) | undefined;
      if (embeddings) {
        const provider = createProvider(queryProviderConfig(validateRetrieval(settings.retrieval), embeddings.meta));
        if (provider.space !== embeddings.meta.space || (embeddings.meta.backend && provider.backend !== embeddings.meta.backend)) throw new Error(`${provider.model} is not in the embedding space or backend of ${embeddings.meta.model}`);
        embedQuery = async (query, signal) => (await provider.embed([query], 'query', signal))[0];
      }
      extras = { search: createSearchHandler({ retriever, embedQuery, hosts, readerFilters: validateReaderFilters(settings.readerFilters), pageSummaries }) };
      banner = `Search is on: ${embeddings ? 'hybrid retrieval' : 'lexical retrieval; run shoalrun index --embed for semantic results'}.\n`;
    }
    if (ask) {
      // The preview spends your API credits on every question, so it answers only on this machine.
      if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error('--ask runs only on a loopback address (127.0.0.1, localhost, or ::1), because every question spends your API credits');
      const configFile = options['--config'] ?? await discoverConfig(process.cwd()).catch(() => { throw new Error('No docs.config.yaml found; pass --config FILE. `serve --ask` reads its chat provider and model from the config'); });
      const setup = await prepareAsk({ siteDirectory: subcommand, configFile, model: options['--model'], readerView: parseReaderView(serveViews), cache: true });
      for (const note of setup.notes) process.stderr.write(`${note}\n`);
      const log = options['--log'] ? new AskLog(await checkLogPath(options['--log'], subcommand)) : undefined;
      if (log) process.stderr.write(`Logging questions and answers to ${log.file} (emails, numbers, and keys are redacted; only you can read the file)\n`);
      // --public-preview shows the panel as readers see it: the Turnstile check (with Cloudflare's test keys, which work on any address), the
      // recording notice, and only the answer, sources, and warnings. Answers are still real, and the counters stay in memory.
      let publicSettings: Record<string, unknown> | undefined;
      let chatConfigForPreview: ReturnType<typeof validateChat>;
      let challenge: ((input: { token?: string; ip: string }) => Promise<boolean>) | undefined;
      const chatSettings = (await loadConfig(configFile)).value;
      const chatConfig = validateChat(chatSettings.chat, validateReaderFilters(chatSettings.readerFilters));
      if (publicPreview) {
        chatConfigForPreview = chatConfig;
        publicSettings = { siteKey: '1x00000000000000000000AA', ...(chatConfig?.challenge?.when === 'always' ? { prewarm: true } : {}), notice: chatConfig?.log?.notice ?? defaultLogNotice, ...(chatConfig?.panel ? { panel: chatConfig.panel } : {}) };
        const verify = turnstileVerifier({ secret: '1x0000000000000000000000000000000AA' });
        challenge = ({ token, ip }) => verify({ token, ip });
      }
      const handler = createAskHandler({ hosts, exposeErrors: true, ...(publicPreview ? { response: 'public' as const, challenge, session: createSession({ secret: '1x0000000000000000000000000000000AA' }), ...(chatConfigForPreview?.challenge?.when === 'always' || !setup.budget ? {} : { challengeNeeded: adaptiveChallenge(setup.budget, { freeQuestions: chatConfigForPreview?.challenge?.freeQuestions, busyShare: chatConfigForPreview?.challenge?.busyShare }) }) } : {}), ...(log ? { record: event => log.write(event) } : {}), ...(setup.budget ? { budget: setup.budget } : {}), answer: (question, history, context) => askQuestion({ question, history, ...setup.options, modelAllowed: context.modelAllowed, signal: context.signal, ...(publicPreview ? { requireCitations: true } : {}) }) });
      extras = { ...extras, ask: handler, ...(publicSettings ? { publicSettings } : chatConfig?.panel ? { panel: chatConfig.panel } : {}), widget: await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/ask-widget.js'), 'utf8') };
      banner += `Ask is on: ${setup.chat.model}${setup.options.jev ? ', relevance scoring' : ''}${setup.options.embedQuery ? ', semantic search' : ', keyword search only'}. Look for the Ask button on any page.\n`;
    }
    const server = await serveSite(subcommand, host, port, undefined, extras);
    const listening = (server.address() as AddressInfo).port;
    for (const name of ['127.0.0.1', 'localhost', '[::1]']) hosts.push(`${name}:${listening}`);
    process.stdout.write(`Serving ${path.resolve(subcommand)} at http://${host}:${listening}/\n${banner}`);
  } else if (command === 'eval' && subcommand === 'snapshot') {
    if (rest.length !== 1 || rest[0].startsWith('--')) throw new Error('Usage: shoalrun eval snapshot <site-directory>');
    const snapshot = await evalBuildSnapshot(rest[0]);
    process.stdout.write(JSON.stringify({ schemaVersion: 1, buildDigest: snapshot.buildDigest, files: snapshot.fileDigests }, null, 2) + '\n');
  } else if (command === 'eval' && subcommand === 'compare') {
    if (rest.length !== 3 || rest[1] !== '--since' || rest[0].startsWith('--') || rest[2].startsWith('--')) throw new Error('Usage: shoalrun eval compare CURRENT.json --since PREVIOUS.json');
    const result = compareEvalBuildInventories(JSON.parse(await readFile(rest[2], 'utf8')), JSON.parse(await readFile(rest[0], 'utf8')));
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.status !== 'ok') process.exitCode = 1;
  } else if (command === 'eval') {
    const usage = 'Usage: shoalrun eval prepare <site-directory> --tasks FILE --out REPORT | eval check <site-directory> --tasks FILE --report REPORT';
    if (!['prepare', 'check'].includes(subcommand) || !rest[0] || rest[0].startsWith('--')) throw new Error(usage);
    const flags: Record<string, string> = {};
    for (let index = 1; index < rest.length; index++) {
      const flag = rest[index];
      const value = rest[++index];
      if (!['--tasks', subcommand === 'prepare' ? '--out' : '--report'].includes(flag) || !value || value.startsWith('--') || flags[flag] !== undefined) throw new Error(usage);
      flags[flag] = value;
    }
    if (!flags['--tasks'] || !flags[subcommand === 'prepare' ? '--out' : '--report']) throw new Error(usage);
    const result = subcommand === 'prepare'
      ? await prepareEvalReport(rest[0], flags['--tasks'], flags['--out'])
      : await checkEvalReport(rest[0], flags['--tasks'], flags['--report']);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.status !== 'ok') process.exitCode = 1;
  } else if (command === 'docs') {
    if (subcommand === 'baseline' || subcommand === 'validate' || subcommand === 'validation-status') await runValidationCommand(subcommand, rest, () => discoverConfig(process.cwd()));
    else if (subcommand === 'review' || subcommand === 'preview') await runAuthoringReviewCommand(subcommand, rest);
    else if (subcommand === 'project' || subcommand === 'source') await runProjectCommand(subcommand, rest, () => discoverConfig(process.cwd()));
    else if (subcommand === 'search' || subcommand === 'read' || subcommand === 'outline' || subcommand === 'section') await runDocsReadCommand(subcommand, rest);
    else if (subcommand === 'changes') {
      if (rest.length !== 3 || rest[1] !== '--since' || rest[0].startsWith('--') || rest[2].startsWith('--')) throw new Error('Usage: shoalrun docs changes CURRENT-SNAPSHOT --since PREVIOUS-SNAPSHOT');
      const current = JSON.parse(await readFile(rest[0], 'utf8'));
      const previous = JSON.parse(await readFile(rest[2], 'utf8'));
      process.stdout.write(JSON.stringify(compareDocumentSnapshots(previous, current), null, 2) + '\n');
    }
    else if (subcommand === 'mcp') {
      const { directory, positional } = parseDocsReadOptions(rest, true);
      if (positional.length) throw new DocumentationError('invalid_input', 'Usage: shoalrun docs mcp [--site DIRECTORY]');
      const { serveDocsMcp } = await import('./docs-mcp.js');
      serveDocsMcp(directory);
    }
    else if (subcommand === 'context' && rest[0] && (rest.length === 1 || (rest.length === 3 && rest[1] === '--config'))) {
      const config = rest[2] ?? await discoverConfig(process.cwd());
      process.stdout.write(JSON.stringify(await docsContext(rest[0], config), null, 2) + '\n');
    } else if (subcommand === 'plan' && (rest.length === 4 || rest.length === 6) && rest[0] === '--request-file' && rest[2] === '--out' && (rest.length === 4 || rest[4] === '--config')) {
      const config = rest[5] ?? await discoverConfig(process.cwd());
      process.stdout.write(JSON.stringify(await docsPlan(rest[1], config, rest[3]), null, 2) + '\n');
    } else if (subcommand === 'apply' && rest[0] && (rest.length === 1 || rest.length === 2 && rest[1] === '--check' || rest.length === 3 && rest[1] === '--config' || rest.length === 4 && rest[1] === '--config' && rest[3] === '--check')) {
      const config = rest[2] ?? await discoverConfig(process.cwd());
      process.stdout.write(JSON.stringify(await docsApply(rest[0], config, rest.includes('--check')), null, 2) + '\n');
    } else throw new Error('Usage: shoalrun docs changes CURRENT-SNAPSHOT --since PREVIOUS-SNAPSHOT | docs review REPORT [--format json|markdown] | docs preview REPORT [--port PORT] | docs baseline --out FILE [--config FILE] | docs validate (--baseline FILE | --file FILE | --id ID) [--config FILE] | docs validation-status REPORT | docs project [--config FILE] [--section pages|guidance|configuration|navigation|relationships|templates|findings] [--id ID|--file FILE|--query QUERY] [--offset N] [--limit N] [--max-tokens N] | docs source FILE [--config FILE] [--offset N] [--max-tokens N] | docs search <query> | docs read <document-id> | docs context <document-id> [--config FILE] | docs plan --request-file FILE --out PLAN [--config FILE] | docs apply PLAN [--config FILE] [--check]');
  } else if (command === 'recipe' || command === 'ingredient') {
    const usage = `Usage: shoalrun ${command} draft --spec FILE --out FILE [--config FILE] [--check]`;
    if (subcommand !== 'draft') throw new Error(usage);
    const flags: Record<string, string> = {};
    let check = false;
    for (let index = 0; index < rest.length; index++) {
      const flag = rest[index];
      if (flag === '--check') { if (check) throw new Error(usage); check = true; continue; }
      if (!['--spec', '--out', '--config'].includes(flag) || flags[flag] !== undefined || !rest[index + 1] || rest[index + 1].startsWith('--')) throw new Error(usage);
      flags[flag] = rest[++index];
    }
    if (!flags['--spec'] || !flags['--out']) throw new Error(usage);
    const writer = command === 'ingredient' ? writeIngredientDraft : writeRecipeDraft;
    process.stdout.write(JSON.stringify(await writer(flags['--config'] ?? await discoverConfig(process.cwd()), flags['--spec'], flags['--out'], check), null, 2) + '\n');
  } else if (command === 'search') {
    if (!subcommand || !rest[0] || rest[0].startsWith('--')) throw new Error('Usage: shoalrun search <site-directory> <query> [--channel C] [--version V] [--language L] [--limit N]');
    const options: SearchOptions = {};
    const names = { '--channel': 'channel', '--version': 'version', '--language': 'language', '--limit': 'limit' } as const;
    for (let index = 1; index < rest.length; index += 2) {
      const flag = rest[index] as keyof typeof names;
      const value = rest[index + 1];
      if (!(flag in names)) throw new Error(`Unknown search option ${flag}`);
      if (!value || value.startsWith('--')) throw new Error(`Search option ${flag} needs a value`);
      const name = names[flag];
      if (options[name] !== undefined) throw new Error(`Duplicate search option ${flag}`);
      if (name === 'limit') options.limit = Number(value);
      else options[name] = value;
    }
    process.stdout.write(JSON.stringify(await queryBuiltSite(subcommand, rest[0], options), null, 2) + '\n');
  } else if (command === 'index') {
    const usage = 'Usage: shoalrun index <site-directory> [--embed [--config FILE] [--provider voyage|openai] [--model MODEL] [--dimension N] [--base-url URL] [--key-env NAME]]';
    if (!subcommand || subcommand.startsWith('--')) throw new Error(usage);
    const values: Record<string, string> = {};
    let embed = false;
    for (let index = 0; index < rest.length; index++) {
      const flag = rest[index];
      if (flag === '--embed') { if (embed) throw new Error('Duplicate --embed'); embed = true; continue; }
      const value = rest[++index];
      if (!['--config', '--provider', '--model', '--dimension', '--base-url', '--key-env'].includes(flag) || !value || value.startsWith('--')) throw new Error(usage);
      if (values[flag] !== undefined) throw new Error(`Duplicate index option ${flag}`);
      values[flag] = value;
    }
    if (!embed && Object.keys(values).length) throw new Error('Embedding options need --embed');
    const result = await buildChunkIndex(subcommand);
    let embeddings;
    if (embed) {
      // The project's retrieval.embeddings setting chooses the provider. Flags override it, and a complete pair of --provider and
      // --model needs no config at all.
      const configFile = values['--config'] ?? (values['--provider'] && values['--model'] ? undefined : await discoverConfig(process.cwd()).catch(() => undefined));
      const retrieval = configFile ? validateRetrieval((await loadConfig(configFile)).value.retrieval) : undefined;
      const provider = createProvider(embeddingProviderConfig(retrieval, { provider: values['--provider'], model: values['--model'], dimension: values['--dimension'] === undefined ? undefined : Number(values['--dimension']), baseUrl: values['--base-url'], keyEnv: values['--key-env'] }));
      embeddings = await embedChunkIndex(subcommand, result.index, provider, embeddingInput);
    }
    process.stdout.write(JSON.stringify({ status: 'ok', documents: result.documents, chunks: result.index.chunks.length, output: result.output, ...(embeddings ? { embeddings } : {}) }, null, 2) + '\n');
  } else if (command === 'ask') {
    const usage = 'Usage: shoalrun ask <site-directory> "<question>" [--config FILE] [--model MODEL] [--passages N] [--reader-view FACET=CHOICE[,CHOICE]]... [--channel C --version V --language L] [--no-rerank] [--no-direct] [--no-escalate] [--no-cards] [--json]';
    if (!subcommand || subcommand.startsWith('--') || !rest[0] || rest[0].startsWith('--')) throw new Error(usage);
    const values: Record<string, string> = {};
    const views: string[] = [];
    const switches = new Set<string>();
    for (let index = 1; index < rest.length; index++) {
      const flag = rest[index];
      if (['--no-rerank', '--no-direct', '--no-escalate', '--no-cards', '--json'].includes(flag)) { switches.add(flag); continue; }
      const value = rest[++index];
      if (flag === '--reader-view' && value && !value.startsWith('--')) { views.push(value); continue; }
      if (!['--config', '--model', '--passages', '--channel', '--version', '--language'].includes(flag) || !value || value.startsWith('--')) throw new Error(usage);
      if (values[flag] !== undefined) throw new Error(`Duplicate ask option ${flag}`);
      values[flag] = value;
    }
    const configFile = values['--config'] ?? await discoverConfig(process.cwd()).catch(() => { throw new Error('No docs.config.yaml found; pass --config FILE. `ask` reads its chat provider and model from the config'); });
    const setup = await prepareAsk({ siteDirectory: subcommand, configFile, model: values['--model'], passages: values['--passages'] === undefined ? undefined : Number(values['--passages']), channel: values['--channel'], version: values['--version'], language: values['--language'], noRerank: switches.has('--no-rerank'), noDirect: switches.has('--no-direct'), noEscalate: switches.has('--no-escalate'), noCards: switches.has('--no-cards'), readerView: parseReaderView(views) });
    for (const note of setup.notes) process.stderr.write(`${note}\n`);
    const chat = setup.chat;
    const result = await askQuestion({ question: rest[0], ...setup.options });
    if (switches.has('--json')) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else {
      process.stdout.write(`${result.answer}\n`);
      if (result.sources.length) process.stdout.write(`\nSources:\n${result.sources.map(item => `[${item.number}] ${item.title}${item.heading ? ` > ${item.heading}` : ''}: ${item.url}`).join('\n')}\n`);
    }
    const seconds = (result.timings.rewriteMs + result.timings.retrieveMs + result.timings.rerankMs + result.timings.answerMs + result.timings.verifyMs) / 1000;
    process.stderr.write(`[${result.mode} | ${result.decision}${result.jevBest !== undefined ? ` | jev ${result.jevBest.toFixed(2)}` : ''} | ${chat.model} | ${result.usage.chatCalls} model call${result.usage.chatCalls === 1 ? '' : 's'}, ${result.usage.promptTokens} in / ${result.usage.completionTokens} out tokens | ${seconds.toFixed(1)}s]\n`);
    for (const note of result.notes) process.stderr.write(`Note: ${note}\n`);
  } else if (command === 'chat') {
    // Instant off switch for a hosted chat, in the store that chat.budget.store names. It reads the store's address and token from the
    // environment variables that config names, so run it with those set (for example `vercel env pull` output, or your shell).
    const usage = 'Usage: shoalrun chat pause|resume|status --config FILE';
    if (!['pause', 'resume', 'status'].includes(subcommand ?? '') || rest[0] !== '--config' || !rest[1] || rest.length !== 2) throw new Error(usage);
    const settings = (await loadConfig(rest[1])).value;
    const chat = validateChat(settings.chat, validateReaderFilters(settings.readerFilters));
    if (!chat?.budget?.store) throw new Error('The config needs chat.budget.store to pause the chat');
    const redis = envRedis(chat.budget.store);
    if (subcommand === 'pause') { await redis.command(['SET', pausedKey, new Date().toISOString()]); process.stdout.write('The chat is paused. Running functions notice within about five seconds.\n'); }
    else if (subcommand === 'resume') { await redis.command(['DEL', pausedKey]); process.stdout.write('The chat is resumed.\n'); }
    else { const since = await redis.command(['GET', pausedKey]); process.stdout.write(since === null ? 'The chat is running.\n' : `The chat is paused, since ${String(since)}.\n`); }
  } else if (command === 'ask-log') {
    const usage = 'Usage: shoalrun ask-log (<log-file> | --kv --config FILE [--days N]) [--min-repeats N] [--limit N] [--cards-out FILE] [--json]';
    // --kv reads the hosted log from the key-value store that chat.budget.store names, using the environment variables that config names.
    const fromStore = subcommand === '--kv';
    if (!subcommand || (subcommand.startsWith('--') && !fromStore)) throw new Error(usage);
    const values: Record<string, string> = {};
    let json = false;
    for (let index = 0; index < rest.length; index++) {
      const flag = rest[index];
      if (flag === '--json') { json = true; continue; }
      const value = rest[++index];
      if (!['--min-repeats', '--limit', '--cards-out', ...(fromStore ? ['--config', '--days'] : [])].includes(flag) || !value || value.startsWith('--') || values[flag] !== undefined) throw new Error(usage);
      values[flag] = value;
    }
    const number = (flag: string, fallback: number) => { const value = values[flag] === undefined ? fallback : Number(values[flag]); if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${flag} must be a whole number of 1 or more`); return value; };
    let records;
    if (fromStore) {
      if (!values['--config']) throw new Error(usage);
      const settings = (await loadConfig(values['--config'])).value;
      const chat = validateChat(settings.chat, validateReaderFilters(settings.readerFilters));
      if (!chat?.budget?.store || !chat.log) throw new Error('The config needs chat.budget.store and chat.log to read the hosted log');
      records = await readKvLog(envRedis(chat.budget.store), number('--days', chat.log.retentionDays));
    } else records = await readLog(subcommand);
    const report = analyzeLog(records, { minRepeats: number('--min-repeats', 2) });
    process.stdout.write(json ? JSON.stringify(report, null, 2) + '\n' : formatReport(report, number('--limit', 15)));
    if (values['--cards-out']) {
      if (!report.cards.length) process.stderr.write('No question qualifies for a card yet, so no file was written\n');
      else {
        // A new file only: this is a starting list to review, and it must never replace answers.yaml.
        const { writeFile } = await import('node:fs/promises');
        await writeFile(values['--cards-out'], `# Questions from the ask log that are worth answering ahead of time. Review them, then move the ones you want into your questions file.\n${yamlStringify(report.cards.map(card => card.question))}`, { flag: 'wx' });
        process.stderr.write(`Wrote ${report.cards.length} question${report.cards.length === 1 ? '' : 's'} to ${values['--cards-out']}\n`);
      }
    }
  } else if (command === 'answers') {
    const usage = 'Usage: shoalrun answers <site-directory> --questions FILE [--config FILE] [--model MODEL] [--reader-view FACET=CHOICE[,CHOICE]]...';
    if (!subcommand || subcommand.startsWith('--')) throw new Error(usage);
    const values: Record<string, string> = {};
    const views: string[] = [];
    for (let index = 0; index < rest.length; index++) {
      const flag = rest[index];
      const value = rest[++index];
      if (flag === '--reader-view' && value && !value.startsWith('--')) { views.push(value); continue; }
      if (!['--questions', '--config', '--model'].includes(flag) || !value || value.startsWith('--')) throw new Error(usage);
      if (values[flag] !== undefined) throw new Error(`Duplicate answers option ${flag}`);
      values[flag] = value;
    }
    if (!values['--questions']) throw new Error(usage);
    const configFile = values['--config'] ?? await discoverConfig(process.cwd()).catch(() => { throw new Error('No docs.config.yaml found; pass --config FILE. `answers` reads its chat provider and model from the config'); });
    const questions = parseCardQuestions(await readFile(values['--questions'], 'utf8'));
    // Cards are polished answers, so they come from the model, not from a direct excerpt, and never from another card.
    const setup = await prepareAsk({ siteDirectory: subcommand, configFile, model: values['--model'], noCards: true, noDirect: true, readerView: parseReaderView(views) });
    for (const note of setup.notes) process.stderr.write(`${note}\n`);
    if (!setup.embedTexts || !setup.embedding) throw new Error('Answer cards need semantic search. Run shoalrun index --embed first');
    const built = await buildCards({ questions, ask: question => askQuestion({ question, ...setup.options }), embed: setup.embedTexts, digestOf: id => setup.options.retriever.digestOf(id), embedding: setup.embedding, variant: setup.options.variant as string, readerSelection: setup.options.readerSelection, progress: message => process.stderr.write(`${message}\n`) });
    const output = await writeCards(subcommand, built.file);
    process.stdout.write(JSON.stringify({ status: 'ok', cards: built.file.cards.length, rejected: built.rejected, output }, null, 2) + '\n');
  } else if (command === 'check') {
    const args = [subcommand, ...rest].filter((value): value is string => value !== undefined);
    const json = args.includes('--json');
    const positional = args.filter(value => value !== '--json');
    if (args.filter(value => value === '--json').length > 1 || positional.length > 1 || positional.some(value => value.startsWith('--'))) throw new Error('Usage: shoalrun check [config] [--json]');
    const report = await auditProject(positional[0] ?? await discoverConfig(process.cwd()));
    if (json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    else {
      for (const result of report.results) {
        process.stdout.write(`${result.status === 'ok' ? 'PASS' : 'FAIL'} ${result.id}\n`);
        for (const finding of result.findings) process.stdout.write(`  ${finding.target}: ${finding.message}\n`);
      }
      process.stdout.write(`${report.status === 'ok' ? 'Checks passed.' : 'Checks failed. Fix the findings above and rerun shoalrun check.'}\n`);
    }
    if (report.status !== 'ok') process.exitCode = 1;
  } else if (command === 'audit') {
    const args = [subcommand, ...rest].filter((v): v is string => v !== undefined);
    const config = args[0] && !args[0].startsWith('--') ? args.shift()! : await discoverConfig(process.cwd());
    if (args.length) throw new Error('Usage: shoalrun audit [config]');
    const report = await auditProject(config);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.status !== 'ok') process.exitCode = 1;
  } else if (command === 'scaffold') {
    if (!subcommand) throw new Error('Usage: shoalrun scaffold <template> -n <target> [--config FILE] [--id ID] [--title TITLE] [--summary SUMMARY] [--slug SLUG] [--operation ID]');
    const shortForm = rest.includes('-n') || rest.includes('--new');
    if (!shortForm && (!rest[0] || !rest[1])) throw new Error('Usage: shoalrun scaffold <template> -n <target> [--config FILE]');
    const options: Record<string, string> = {};
    const operations: string[] = [];
    for (let index = shortForm ? 0 : 2; index < rest.length; index += 2) {
      const flag = rest[index];
      const value = rest[index + 1];
      if ((!flag?.startsWith('--') && flag !== '-n') || !value || value.startsWith('--')) throw new Error(`Scaffold option ${flag ?? ''} needs a value`);
      const name = flag === '-n' ? 'new' : flag.slice(2);
      if (!['new', 'config', 'id', 'title', 'summary', 'slug', 'channel', 'version', 'language', 'operation'].includes(name)) throw new Error(`Unknown scaffold option ${flag}`);
      if (name === 'operation') operations.push(value);
      else if (options[name] !== undefined) throw new Error(`Duplicate scaffold option ${flag}`);
      else options[name] = value;
    }
    if (shortForm && !options.new) throw new Error('Scaffold needs -n or --new with a target file');
    const overrides = { id: options.id, title: options.title, summary: options.summary, slug: options.slug, channel: options.channel, version: options.version, language: options.language, ...(operations.length ? { operations } : {}) };
    const result = shortForm
      ? await scaffoldFromPath(options.config ?? await discoverConfig(process.cwd()), subcommand, options.new, Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)))
      : await scaffold(rest[0], subcommand, rest[1], overrides);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (command === 'config' && subcommand === 'resolve') {
    const config = await loadConfig(rest[0] ?? 'docs.config.yaml');
    process.stdout.write(JSON.stringify({ value: config.value, digest: config.digest, dependencies: config.dependencies }, null, 2) + '\n');
  } else if (command === 'config' && subcommand === 'validate') {
    const config = await loadConfig(rest[0] ?? 'docs.config.yaml');
    validateAuthoringGuidance(config.value.authoring);
    validateRetrieval(config.value.retrieval);
    resolveAgentDiscovery(configField(config.value.site, 'agentDiscovery'));
    validateChat(config.value.chat, validateReaderFilters(config.value.readerFilters));
    const contrast = await checkThemeContrast(rest[0] ?? 'docs.config.yaml');
    process.stdout.write(JSON.stringify({ status: 'ok', digest: config.digest, dependencies: config.dependencies.length, contrast: { status: 'ok', palette: contrast.palette, modes: contrast.modes } }, null, 2) + '\n');
  } else if (command === 'config' && subcommand === 'graph') {
    const config = await loadConfig(rest[0] ?? 'docs.config.yaml');
    process.stdout.write(JSON.stringify({ root: rest[0] ?? 'docs.config.yaml', dependencies: config.dependencies }, null, 2) + '\n');
  } else if (command === 'config' && subcommand === 'explain') {
    const config = await loadConfig(rest[1] ?? 'docs.config.yaml');
    process.stdout.write(JSON.stringify(explain(config, rest[0]), null, 2) + '\n');
  } else if (command === 'api' && subcommand === 'review') {
    if (rest.length !== 3 || rest[1] !== '--output' || !rest[0] || !rest[2]) throw new Error('Usage: shoalrun api review <config-file> --output <local-directory>');
    const result = await compile(rest[0], rest[2], {}, { apiReview: 'report' });
    process.stdout.write(JSON.stringify({ status: 'review-needed', directory: path.resolve(rest[2]), apis: result.apiPublicationReview }, null, 2) + '\n');
  } else if (command === 'api' && subcommand === 'import') {
    if (rest.length !== 3 || rest[1] !== '--output' || !rest[0] || !rest[2]) throw new Error('Usage: shoalrun api import <https-openapi-url> --output <snapshot-directory>');
    process.stdout.write(JSON.stringify(await importRemoteOpenApi(rest[0], rest[2]), null, 2) + '\n');
  } else if (command === 'api' && subcommand === 'refresh') {
    if (!rest[0] || (rest.length !== 1 && (rest.length !== 3 || rest[1] !== '--output' || !rest[2]))) throw new Error('Usage: shoalrun api refresh <snapshot-directory> [--output <new-snapshot-directory>]');
    process.stdout.write(JSON.stringify(await refreshRemoteOpenApi(rest[0], { output: rest[2] }), null, 2) + '\n');
  } else if (command === 'api' && subcommand === 'audit') {
    if (!rest[0]) throw new Error('Usage: shoalrun api audit <openapi-file>');
    const result = await auditReference(rest[0]);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.status !== 'ok') process.exitCode = 1;
  } else if (command === 'api' && subcommand === 'focused-audit') {
    if (!rest[0]) throw new Error('Usage: shoalrun api focused-audit <site-directory>');
    const result = await auditFocusedContracts(rest[0]);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.status !== 'ok') process.exitCode = 1;
  } else if (command === 'api' && subcommand === 'select') {
    if (!rest[0] || !rest[1] || rest[2] !== '--output' || !rest[3] || rest.length !== 4) throw new Error('Usage: shoalrun api select <api-id> <config> --output <selection.yaml>');
    const result = await selectApiReferences(rest[1], rest[0], rest[3]);
    process.stdout.write(JSON.stringify({ status: 'ok', ...result }, null, 2) + '\n');
  } else if (command === 'api' && subcommand === 'materialize') {
    const usage = 'Usage: shoalrun api materialize <api-id> <config> (--all | --operation ID | --route "METHOD /path")... [--output content/subdirectory]';
    if (!rest[0] || !rest[1] || rest[0].startsWith('--') || rest[1].startsWith('--')) throw new Error(usage);
    const options: { all?: boolean; operations: string[]; routes: string[]; output?: string } = { operations: [], routes: [] };
    for (let index = 2; index < rest.length; index++) {
      const flag = rest[index];
      if (flag === '--all') { if (options.all) throw new Error('Duplicate --all'); options.all = true; continue; }
      const value = rest[++index];
      if (!['--operation', '--route', '--output'].includes(flag) || !value || value.startsWith('--')) throw new Error(usage);
      if (flag === '--operation') options.operations.push(value);
      else if (flag === '--route') options.routes.push(value);
      else if (options.output) throw new Error('Duplicate --output');
      else options.output = value;
    }
    const result = await materializeApiPages(rest[1], rest[0], options);
    process.stdout.write(JSON.stringify({ status: 'ok', ...result }, null, 2) + '\n');
  } else if (command === 'operation' && subcommand === 'inspect') {
    const usage = 'Usage: shoalrun operation inspect <id> [config] [--channel C] [--version V] [--language L]';
    if (!rest[0] || rest[0].startsWith('--')) throw new Error(usage);
    const hasConfig = rest[1] !== undefined && !rest[1].startsWith('--');
    const filters: Partial<Record<'channel' | 'version' | 'language', string>> = {};
    for (let index = hasConfig ? 2 : 1; index < rest.length; index += 2) {
      const flag = rest[index];
      const value = rest[index + 1];
      const name = flag.slice(2);
      if (!['--channel', '--version', '--language'].includes(flag)) throw new Error(`Unknown operation inspect option ${flag}`);
      if (!value || value.startsWith('--')) throw new Error(`Operation inspect option ${flag} needs a value`);
      if (filters[name as keyof typeof filters] !== undefined) throw new Error(`Duplicate operation inspect option ${flag}`);
      filters[name as keyof typeof filters] = value;
    }
    const manifest = await compile(hasConfig ? rest[1] : 'docs.config.yaml');
    const matches = (manifest.operations[rest[0]] ?? []).filter(item => (!filters.channel || item.channel === filters.channel) && (!filters.version || item.version === filters.version) && (!filters.language || item.language === filters.language));
    process.stdout.write(JSON.stringify({ status: matches.length ? 'ok' : 'missing-variant', operationId: rest[0], bindings: matches }, null, 2) + '\n');
  } else {
    throw new Error('Usage: shoalrun init [directory] [--starter minimal|api-docs] | build [config] [output] [--source-commit SHA] [--release-label LABEL] | check [config] [--json] | audit [config] | vercel build [config] [output] [--source-commit SHA] [--release-label LABEL] [--chat] | serve <site-directory> [--host HOST] [--port PORT] [--search [--config FILE]] [--ask [--config FILE] [--model MODEL] [--reader-view FACET=CHOICE[,CHOICE]]...] | search <site-directory> <query> [--channel C --version V --language L --limit N] | answers <site-directory> --questions FILE [--config FILE] [--model MODEL] [--reader-view FACET=CHOICE[,CHOICE]]... | chat pause|resume|status --config FILE | ask-log <log-file> [--min-repeats N] [--limit N] [--cards-out FILE] [--json] | ask <site-directory> "<question>" [--config FILE] [--model MODEL] [--passages N] [--reader-view FACET=CHOICE[,CHOICE]]... [--channel C --version V --language L] [--no-rerank] [--no-direct] [--no-escalate] [--no-cards] [--json] | eval prepare <site-directory> --tasks FILE --out REPORT | eval check <site-directory> --tasks FILE --report REPORT | index <site-directory> [--embed [--config FILE] [--provider voyage|openai] [--model MODEL] [--dimension N] [--base-url URL] [--key-env NAME]] | ingredient draft --spec FILE --out FILE [--config FILE] [--check] | recipe draft --spec FILE --out FILE [--config FILE] [--check] | scaffold <template> -n <target> [--config FILE] [--id ID] [--title TITLE] [--summary SUMMARY] [--slug SLUG] [--channel C] [--version V] [--language L] [--operation ID]... | scaffold <template> <config> <target> --id ID --title TITLE --summary SUMMARY --slug SLUG | config validate|resolve|graph <config> | config explain <key> <config> | operation inspect <id> <config> [--channel C --version V --language L] | api audit <openapi-file> | api focused-audit <site-directory> | api review <config-file> --output <local-directory> | api select <api-id> <config> --output <selection.yaml> | api materialize <api-id> <config> (--all | --operation ID | --route "METHOD /path")... [--output content/subdirectory]');
  }
} catch (error) {
  process.stderr.write(JSON.stringify({ status: 'error', message: (error as Error).message }) + '\n');
  process.exitCode = 1;
}
