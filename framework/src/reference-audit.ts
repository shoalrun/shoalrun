import { ApiReader, supportedSchemaKeywords, type ApiSource } from './api.js';
import { renderHtml, renderMarkdown, root } from './content.js';

const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
type Failure = { operationId: string; message: string; source?: string; location?: string; keyword?: string };
const pointer = (parts: string[]) => `#/${parts.map(part => part.replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;

// Audit traverses schema-bearing OpenAPI objects only. Examples, defaults, and
// extension values can contain arbitrary JSON and must never be read as schemas.
async function schemaFailures(reader: ApiReader, source: ApiSource, operationId: string, pathParts: string[], method: string, pathItem: any, operation: any): Promise<Failure[]> {
  const failures: Failure[] = [];
  const found = new Set<string>();
  const base = [...pathParts, method];
  async function scan(value: any, at: ApiSource, parts: string[], scope: string[], refs: Set<string>): Promise<void> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const key of Object.keys(value)) {
      if (supportedSchemaKeywords.has(key) || key.startsWith('x-')) continue;
      const location = pointer([...parts, key]);
      const identity = `${at.file}|${location}`;
      if (found.has(identity)) continue;
      found.add(identity);
      failures.push({ operationId, message: `Unsupported schema keyword ${key} at ${scope.join('/')} in ${at.file} (${location})`, source: at.file, location, keyword: key });
    }
    if (typeof value.$ref === 'string') {
      const resolved = await reader.ref(at, value.$ref);
      if (!refs.has(resolved.identity)) {
        const fragment = resolved.identity.slice(resolved.source.file.length + 1);
        const nextParts = fragment.startsWith('/') ? fragment.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~')) : [];
        await scan(resolved.value, resolved.source, nextParts, scope, new Set([...refs, resolved.identity]));
      }
    }
    for (const name of ['items', 'additionalProperties']) if (value[name] && typeof value[name] === 'object') await scan(value[name], at, [...parts, name], [...scope, name], refs);
    for (const name of ['properties']) for (const [key, child] of Object.entries<any>(value[name] ?? {})) await scan(child, at, [...parts, name, key], [...scope, key], refs);
    for (const name of ['allOf', 'oneOf', 'anyOf']) for (const [index, child] of (value[name] ?? []).entries()) await scan(child, at, [...parts, name, String(index)], [...scope, name, String(index + 1)], refs);
  }
  async function resolved(initial: any, at: ApiSource, parts: string[]): Promise<{ value: any; source: ApiSource; parts: string[] }> {
    if (typeof initial?.$ref !== 'string') return { value: initial, source: at, parts };
    const ref = await reader.ref(at, initial.$ref);
    const fragment = ref.identity.slice(ref.source.file.length + 1);
    return { value: ref.value, source: ref.source, parts: fragment.startsWith('/') ? fragment.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~')) : [] };
  }
  const parameters = new Map<string, { value: any; source: ApiSource; parts: string[] }>();
  for (const [index, initial] of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])].entries()) {
    const where = index < (pathItem.parameters?.length ?? 0) ? [...pathParts, 'parameters', String(index)] : [...base, 'parameters', String(index - (pathItem.parameters?.length ?? 0))];
    const parameter = await resolved(initial, source, where);
    parameters.set(`${parameter.value?.in}|${parameter.value?.name}`, parameter);
  }
  for (const parameter of parameters.values()) {
    if (parameter.value?.schema) await scan(parameter.value.schema, parameter.source, [...parameter.parts, 'schema'], ['parameter', parameter.value.in ?? '', parameter.value.name ?? ''], new Set());
  }
  if (operation.requestBody) {
    const body = await resolved(operation.requestBody, source, [...base, 'requestBody']);
    for (const [mediaType, media] of Object.entries<any>(body.value?.content ?? {})) if (media?.schema) await scan(media.schema, body.source, [...body.parts, 'content', mediaType, 'schema'], ['request', mediaType], new Set());
  }
  for (const [status, initial] of Object.entries<any>(operation.responses ?? {})) {
    const response = await resolved(initial, source, [...base, 'responses', status]);
    for (const [mediaType, media] of Object.entries<any>(response.value?.content ?? {})) if (media?.schema) await scan(media.schema, response.source, [...response.parts, 'content', mediaType, 'schema'], ['response', status, mediaType], new Set());
  }
  return failures;
}

export async function auditReference(file: string) {
  const reader = new ApiReader();
  const source = (await reader.load(file)).value;
  const mapping = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
  if (!mapping(source)) throw new Error(`${file}: OpenAPI root must be a mapping. Supply an OpenAPI YAML or JSON document.`);
  if (typeof source.openapi !== 'string' || !/^3\.(0|1)\.\d+$/.test(source.openapi)) throw new Error(`${file}: OpenAPI 3.0.x or 3.1.x required. Set the openapi version or convert the source to a supported version.`);
  if (!mapping(source.info) || typeof source.info.title !== 'string' || !source.info.title.trim() || typeof source.info.version !== 'string' || !source.info.version.trim()) throw new Error(`${file}: info.title and info.version must be nonempty strings.`);
  for (const key of ['paths', 'webhooks']) if (source[key] !== undefined && !mapping(source[key])) throw new Error(`${file}: ${key} must be a mapping of names to path items.`);
  if (source.webhooks !== undefined && source.openapi.startsWith('3.0.')) throw new Error(`${file}: webhooks require OpenAPI 3.1. Use a supported 3.1.x source.`);
  const operations: string[] = [];
  const failures: Failure[] = [];
  const operationSites = new Map<string, { source: ApiSource; pathParts: string[]; method: string; pathItem: any; operation: any }>();
  for (const [collection, webhook] of [[source.paths ?? {}, false], [source.webhooks ?? {}, true]] as const) for (const [route, initial] of Object.entries<any>(collection)) {
    const rootSource = await reader.load(file);
    const selected = initial?.$ref ? await reader.ref(rootSource, initial.$ref) : undefined;
    const pathItem = selected?.value ?? initial;
    if (!mapping(pathItem)) {
      failures.push({ operationId: route, source: file, location: pointer([webhook ? 'webhooks' : 'paths', route]), message: `Path item must be a mapping at ${route}. Supply an operation object or a local $ref.` });
      continue;
    }
    const pathSource = selected?.source ?? rootSource;
    const fragment = selected?.identity.slice(pathSource.file.length + 1);
    const pathParts = fragment?.startsWith('/') ? fragment.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~')) : [webhook ? 'webhooks' : 'paths', route];
    for (const [method, operation] of Object.entries<any>(pathItem ?? {})) {
      if (!methods.has(method)) continue;
      if (typeof operation?.operationId !== 'string' || !operation.operationId) {
        failures.push({ operationId: `${webhook ? 'WEBHOOK' : method.toUpperCase()} ${route}`, message: 'Missing operationId' });
      } else {
        operations.push(operation.operationId);
        if (!operationSites.has(operation.operationId)) operationSites.set(operation.operationId, { source: pathSource, pathParts, method, pathItem, operation });
      }
    }
  }
  const seen = new Set<string>();
  let rendered = 0;
  let examples = 0;
  let htmlBytes = 0;
  let markdownBytes = 0;
  for (const operationId of operations) {
    if (seen.has(operationId)) {
      failures.push({ operationId, message: 'Duplicate operationId' });
      continue;
    }
    seen.add(operationId);
    const site = operationSites.get(operationId)!;
    let unsupported: Failure[] = [];
    try {
      unsupported = await schemaFailures(reader, site.source, operationId, site.pathParts, site.method, site.pathItem, site.operation);
      failures.push(...unsupported);
    } catch (error) {
      failures.push({ operationId, message: `Schema audit: ${(error as Error).message}` });
    }
    try {
      const generated = await reader.operation(file, operationId);
      const tree = root(generated.blocks);
      const html = renderHtml(tree);
      const markdown = renderMarkdown(tree);
      const anchors = [...html.matchAll(/<li id="(field-[^"]+)"/g)].map(match => match[1]);
      if (new Set(anchors).size !== anchors.length) throw new Error('Duplicate field anchor');
      for (const example of generated.examples) {
        if (!html.includes(example.title) || !markdown.includes(example.title)) throw new Error(`Named example missing from a representation: ${example.key}`);
      }
      if (!unsupported.length) rendered += 1;
      examples += generated.examples.length;
      htmlBytes += Buffer.byteLength(html);
      markdownBytes += Buffer.byteLength(markdown);
    } catch (error) {
      if (!unsupported.length || !/^Unsupported schema keyword /.test((error as Error).message)) failures.push({ operationId, message: (error as Error).message });
    }
  }
  return {
    status: failures.length ? 'error' : 'ok',
    operations: operations.length,
    rendered,
    namedExamples: examples,
    htmlBytes,
    markdownBytes,
    failures,
    dependencies: [...reader.dependencies].sort()
  };
}
