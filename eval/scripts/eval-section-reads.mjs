// Offline, deterministic evidence coverage; never calls an embedding or model provider.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentationFailure, documentationTokens, getDocumentationPage, getDocumentationSection, searchDocumentation } from '../../framework/dist/documentation-core.js';
import { evalBuildSnapshot } from '../../framework/dist/docs-eval.js';

const sha = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.replace(/\s+/g, ' ').toLowerCase();
export function evidenceCoverage(task, result) {
  const content = normalize(result?.content ?? '');
  const missing = task.evidence.filter(value => !content.includes(normalize(value)));
  return { expectedSource: task.expectedPageIds.includes(result?.id), missing, complete: task.expectedPageIds.includes(result?.id) && !missing.length && result?.budget?.truncated === false };
}
export function payloadCost(result) {
  const payload = JSON.stringify(result);
  return { calls: 1, payloadBytes: Buffer.byteLength(payload), payloadTokens: documentationTokens(payload), markdownBytes: Buffer.byteLength(result.content ?? '') };
}
const addCost = (...costs) => Object.fromEntries(['calls', 'payloadBytes', 'payloadTokens', 'markdownBytes'].map(key => [key, costs.reduce((total, cost) => total + cost[key], 0)]));
const call = async operation => { try { return await operation(); } catch (error) { return documentationFailure(error); } };
const publicationKey = value => [value?.channel, value?.version, value?.language].join('|');

export async function compareSectionReads(site, fixture) {
  if (fixture.schemaVersion !== 1 || !Array.isArray(fixture.tasks) || !fixture.tasks.length) throw new Error('Invalid task fixture');
  const manifest = JSON.parse(await readFile(path.join(site, 'documents.json'), 'utf8'));
  const key = publicationKey(fixture.publication);
  const pages = new Map(manifest.documents.filter(doc => publicationKey(doc.variant) === key).map(doc => [doc.id, doc]));
  const seen = new Set();
  // Validate labels against the full published source before inspecting any ranking.
  for (const task of fixture.tasks) {
    if (seen.has(task.id) || !task.id || !task.query || !Array.isArray(task.expectedPageIds) || !Array.isArray(task.evidence) || task.expectedPageIds.length && !task.evidence.length) throw new Error(`Invalid task ${task.id}`);
    seen.add(task.id);
    for (const id of task.expectedPageIds) {
      const doc = pages.get(id);
      if (!doc) throw new Error(`${task.id}: expected page ${id} is not in the selected publication`);
      const content = await readFile(path.join(site, doc.markdownUrl), 'utf8');
      const coverage = evidenceCoverage(task, { id, content, budget: { truncated: false } });
      if (coverage.missing.length) throw new Error(`${task.id}: invalid evidence labels: ${coverage.missing.join(', ')}`);
    }
  }
  const inspect = (task, result, cost) => {
    const doc = pages.get(result.id);
    const section = result.section;
    const record = section ? doc?.sections?.find(item => item.id === section.id) : doc;
    const resource = section?.markdownUrl ?? result.markdownUrl;
    const integrity = !!record && resource === record.markdownUrl && publicationKey(result.publication) === key
      && sha(result.content ?? '') === record.digest && (!section || section.parentDigest === doc.digest);
    return { tool: section ? 'get_section' : 'get_page', resource: resource ?? null, id: result.id ?? null,
      coverage: task.expectedPageIds.length ? evidenceCoverage(task, result) : null,
      citationIntegrity: integrity, publication: result.publication ?? null, digest: record?.digest ?? null,
      truncated: result.budget?.truncated ?? null, cost, ...(result.error ? { error: result.error } : {}) };
  };
  const results = [];
  for (const task of fixture.tasks) {
    const search = await call(() => searchDocumentation(site, task.query, { ...fixture.publication, limit: 3, maxTokens: 4096 }));
    if (search.error) throw new Error(`${task.id}: search failed: ${search.error.message}`);
    const hit = search.results[0];
    const shared = { id: task.id, category: task.category, question: task.question, query: task.query, expectedPageIds: task.expectedPageIds,
      rankedPageIds: search.results.map(item => item.id), searchCost: payloadCost(search), supported: !!task.expectedPageIds.length };
    if (!hit) { results.push({ ...shared, noResults: true, baseline: null, recommended: null, afterFallback: null, fallbackAttempted: false }); continue; }
    const fullArgs = { ...fixture.publication, maxTokens: 100_000 };
    const full = await call(() => getDocumentationPage(site, hit.id, fullArgs));
    const instruction = hit.read;
    if (!instruction || !['get_page', 'get_section'].includes(instruction.tool)) throw new Error(`${task.id}: missing read instruction`);
    const args = instruction.arguments;
    const recommended = await call(() => instruction.tool === 'get_section'
      ? getDocumentationSection(site, args.id, args.section, args)
      : getDocumentationPage(site, args.id, args));
    const baseline = inspect(task, full, addCost(shared.searchCost, payloadCost(full)));
    const first = inspect(task, recommended, addCost(shared.searchCost, payloadCost(recommended)));
    // The labels are an oracle, not an agent. This branch measures recovery capacity only.
    const fallbackAttempted = shared.supported && instruction.tool === 'get_section' && !first.coverage.complete;
    let afterFallback = first;
    if (fallbackAttempted) {
      const retry = await call(() => getDocumentationPage(site, hit.id, fullArgs));
      afterFallback = inspect(task, retry, addCost(first.cost, payloadCost(retry)));
    }
    results.push({ ...shared, noResults: false, read: instruction, baseline, recommended: first, afterFallback, fallbackAttempted,
      ...(fallbackAttempted ? { fallbackTrigger: 'oracle: missing expected evidence; not a model decision' } : {}) });
  }
  const supported = results.filter(task => task.supported);
  const summaryFor = (items, branch) => ({ tasks: items.length, evidenceComplete: items.filter(task => task[branch]?.coverage.complete).length,
    citationIntegrity: items.filter(task => task[branch]?.citationIntegrity).length,
    cost: addCost(...items.map(task => task[branch]?.cost ?? task.searchCost)) });
  const paired = supported.filter(task => task.baseline?.coverage.complete && task.recommended?.coverage.complete);
  return { summary: {
    supportedTasks: supported.length,
    baseline: summaryFor(supported, 'baseline'), recommended: summaryFor(supported, 'recommended'), oracleFallback: summaryFor(supported, 'afterFallback'),
    pairedSuccess: { baseline: summaryFor(paired, 'baseline'), recommended: summaryFor(paired, 'recommended') },
    firstReadRegressions: supported.filter(task => task.baseline?.coverage.complete && !task.recommended?.coverage.complete).map(task => task.id),
    fallbackAttempts: results.filter(task => task.fallbackAttempted).length,
    fallbackRecoveries: results.filter(task => task.fallbackAttempted && task.afterFallback.coverage.complete).length,
    missingInformation: results.filter(task => !task.supported).map(task => ({ id: task.id, noResults: task.noResults, retrievedPage: task.recommended?.id ?? null, modelAbstention: 'not tested' })),
  }, results };
}

async function main(args) {
  if (args.length !== 4 || args[2] !== '--out') throw new Error('Usage: node eval/scripts/eval-section-reads.mjs SITE TASKS.json --out NEW-REPORT.json');
  const [site, tasksFile, , output] = args;
  // Prohibit accidental network use even when provider credentials exist locally.
  globalThis.fetch = async () => { throw new Error('This evaluation is offline; network calls are forbidden'); };
  const fixtureBytes = await readFile(tasksFile);
  const fixture = JSON.parse(fixtureBytes);
  const before = await evalBuildSnapshot(site);
  const runner = fileURLToPath(import.meta.url);
  const runtimeFiles = ['documentation-core.js', 'search-query.js', 'search-synonyms.js', 'markdown-size.js'];
  const runtimeDigests = Object.fromEntries(await Promise.all(runtimeFiles.map(async name => [name, sha(await readFile(new URL(`../../framework/dist/${name}`, import.meta.url)))])));
  const report = { schemaVersion: 1, status: 'measured', recordedAt: new Date().toISOString(), labelOrigin: fixture.labelOrigin,
    fixtureDigest: sha(fixtureBytes), runnerDigest: sha(await readFile(runner)), runtimeDigests, node: process.version,
    buildId: JSON.parse(await readFile(path.join(site, 'documents.json'), 'utf8')).buildId,
    buildDigest: before.buildDigest, fileCount: before.files, publication: fixture.publication,
    method: { selection: 'top result among three returned by the same search for both arms', baseline: 'full page, maxTokens 100000', recommended: 'execute read.tool/read.arguments verbatim',
      fallback: 'oracle-triggered full-page retry when expected evidence is missing from a section', encoding: 'cl100k_base',
      costs: 'UTF-8 bytes and tokens of serialized JSON responses, including search; Markdown bytes also reported separately. Excludes request/protocol envelopes, HTTP compression, prompts, latency, and internal file reads.',
      limits: 'Substring evidence coverage is not answer correctness, factual review, model task success, or evidence that a model knows when to retry. Authored cases only. No paid calls.' },
    ...await compareSectionReads(site, fixture) };
  if ((await evalBuildSnapshot(site)).buildDigest !== before.buildDigest) throw new Error('Build changed during the run; refusing to save evidence');
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report.summary, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
