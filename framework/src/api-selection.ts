import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import YAML from 'yaml';
import { ApiReader } from './api.js';
import { generatedOperationIdentity } from './api-identity.js';
import { explain, loadConfig } from './config.js';

export type ApiCandidate = { operationId: string; method: string; route: string; title: string; authored: boolean; id: string; reference: string; slug: string; filename: string };

export async function apiCandidates(configFile: string, apiId: string): Promise<{ candidates: ApiCandidate[]; selected: Set<string>; pathPrefix: string }> {
  const loaded = await loadConfig(configFile);
  const config: any = loaded.value;
  const definition = config.apis?.[apiId];
  if (!definition) throw new Error(`Unknown API ${apiId}`);
  const defaults = config.publications?.defaults;
  if (!defaults?.channel || !defaults?.version) throw new Error('API selection needs publication defaults');
  const publicationIndex = definition.publications?.findIndex((item: any) => item.channel === defaults.channel && item.version === defaults.version) ?? -1;
  const source = publicationIndex >= 0 ? definition.publications[publicationIndex].source : definition.source;
  if (source?.kind !== 'file') throw new Error(`API ${apiId} needs a local file source in the default publication`);
  const sourceKey = publicationIndex >= 0 ? `apis.${apiId}.publications.${publicationIndex}.source.path` : `apis.${apiId}.source.path`;
  const origin = explain(loaded, sourceKey).source.file;
  const reader = new ApiReader();
  const loadedSpec = await reader.load(path.resolve(path.dirname(origin), source.path));
  const spec = loadedSpec.value;
  const explicit = new Map<string, any>((definition.operations ?? []).map((entry: any) => [entry.sourceOperationId, entry]));
  const generate = definition.generateReferences;
  const pathPrefix = generate && generate !== true && typeof generate.pathPrefix === 'string' ? generate.pathPrefix : `/reference/${apiId}`;
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
  const seen = new Set<string>();
  const candidates: ApiCandidate[] = [];
  for (const [collection, webhook] of [[spec.paths ?? {}, false], [spec.webhooks ?? {}, true]] as const) for (const [route, initial] of Object.entries<any>(collection)) {
    const pathItem = initial?.$ref ? (await reader.ref(loadedSpec, initial.$ref)).value : initial;
    for (const [method, operation] of Object.entries<any>(pathItem ?? {})) {
      if (!methods.has(method)) continue;
      const operationId = operation?.operationId;
      if (typeof operationId !== 'string' || !operationId.trim()) throw new Error(`${webhook ? 'WEBHOOK' : method.toUpperCase()} ${route} needs operationId for selection`);
      if (seen.has(operationId)) throw new Error(`Duplicate operationId ${operationId}`);
      seen.add(operationId);
      const identity = generatedOperationIdentity(apiId, operationId, pathPrefix);
      const binding = explicit.get(operationId);
      candidates.push({ operationId, method: webhook ? 'WEBHOOK' : method.toUpperCase(), route, title: String(operation.summary || operationId), authored: !!binding, id: binding?.id ?? identity.id, reference: binding?.reference ?? identity.reference, slug: identity.slug, filename: identity.filename });
    }
  }
  const selected = new Set<string>(generate && generate !== true && Array.isArray(generate.include) ? generate.include : generate && generate !== true && Array.isArray(generate.exclude) ? candidates.filter(item => !generate.exclude.includes(item.operationId)).map(item => item.operationId) : generate ? candidates.map(item => item.operationId) : []);
  return { candidates, selected, pathPrefix };
}

export async function selectApiReferences(configFile: string, apiId: string, outputFile: string): Promise<{ selected: string[]; total: number; file: string }> {
  const { candidates, selected: current, pathPrefix } = await apiCandidates(configFile, apiId);
  const chosen: string[] = [];
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  const answers = reader[Symbol.asyncIterator]();
  try {
    for (const [index, item] of candidates.entries()) {
      if (item.authored) {
        process.stdout.write(`[${index + 1}/${candidates.length}] ${item.method} ${item.route} (${item.operationId}) — authored page\n`);
        continue;
      }
      const wasSelected = current.has(item.operationId);
      process.stdout.write(`[${index + 1}/${candidates.length}] ${item.method} ${item.route} (${item.operationId}) — ${item.title} [${wasSelected ? 'Y/n' : 'y/N'}]: `);
      const next = await answers.next();
      if (next.done) throw new Error('API selection ended before every operation was reviewed; no file written');
      const answer = next.value.trim().toLowerCase();
      if (answer === 'q' || answer === 'quit') throw new Error('API selection cancelled; no file written');
      if (!['', 'y', 'yes', 'n', 'no'].includes(answer)) throw new Error(`Expected yes or no for ${item.operationId}; no file written`);
      if (answer === 'y' || answer === 'yes' || (!answer && wasSelected)) chosen.push(item.operationId);
    }
  } finally {
    reader.close();
  }
  const file = path.resolve(outputFile);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, YAML.stringify({ pathPrefix, include: chosen }));
  return { selected: chosen, total: candidates.filter(item => !item.authored).length, file };
}
