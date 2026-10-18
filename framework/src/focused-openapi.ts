import { createHash } from 'node:crypto';
import path from 'node:path';
import { ApiReader, ApiSource } from './api.js';

const componentKinds = new Set(['schemas', 'responses', 'parameters', 'examples', 'requestBodies', 'headers', 'securitySchemes', 'links', 'callbacks', 'pathItems']);
const kindByField: Record<string, string> = { schema: 'schemas', schemas: 'schemas', parameters: 'parameters', requestBody: 'requestBodies', requestBodies: 'requestBodies', responses: 'responses', examples: 'examples', headers: 'headers', links: 'links', callbacks: 'callbacks', securitySchemes: 'securitySchemes', pathItems: 'pathItems' };
const escapePointer = (value: string) => value.replaceAll('~', '~0').replaceAll('/', '~1');
const unescapePointer = (value: string) => value.replaceAll('~1', '/').replaceAll('~0', '~');
const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 10);

export async function focusedOpenApi(reader: ApiReader, sourceFile: string, sourceOperationId: string): Promise<any> {
  const source = await reader.load(sourceFile);
  const api = source.value;
  if (!/^3\.(0|1)\./.test(String(api.openapi))) throw new Error('Focused OpenAPI export supports 3.0.x and 3.1.x');
  let match: { route: string; method: string; pathItem: any; pathSource: ApiSource; operation: any; webhook: boolean } | undefined;
  for (const [collection, webhook] of [[api.paths ?? {}, false], [api.webhooks ?? {}, true]] as const) for (const [route, initial] of Object.entries<any>(collection)) {
    const selected = initial?.$ref ? await reader.ref(source, initial.$ref) : { value: initial, source };
    const pathItem = selected.value;
    for (const [method, operation] of Object.entries<any>(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method) || operation?.operationId !== sourceOperationId) continue;
      if (match) throw new Error(`Duplicate OpenAPI operationId ${sourceOperationId}`);
      match = { route, method, pathItem, pathSource: selected.source, operation, webhook };
    }
  }
  if (!match) throw new Error(`Missing OpenAPI operationId ${sourceOperationId}`);
  if (match.pathItem.$ref) throw new Error(`Focused OpenAPI does not yet support Path Item references: ${sourceOperationId}`);
  const components: Record<string, Record<string, any>> = {};
  const names = new Map<string, { kind: string; name: string }>();

  const register = async (from: ApiSource, reference: string, inferredKind?: string): Promise<string> => {
    const separator = reference.indexOf('#');
    const relative = separator < 0 ? reference : reference.slice(0, separator);
    const pointer = separator < 0 ? '' : reference.slice(separator + 1);
    const parsed = /^\/components\/([^/]+)\/([^/]+)(\/.*)?$/.exec(pointer);
    const declaredKind = parsed?.[1];
    if (declaredKind && !componentKinds.has(declaredKind)) throw new Error(`Unsupported component kind ${declaredKind}`);
    const kind = declaredKind ?? inferredKind;
    if (!kind || !componentKinds.has(kind)) throw new Error(`Cannot classify focused OpenAPI reference ${reference}`);
    const basePointer = parsed ? `/components/${parsed[1]}/${parsed[2]}` : pointer;
    const baseReference = `${relative}#${basePointer}`;
    const resolved = await reader.ref(from, baseReference);
    const identity = `${resolved.source.file}#${basePointer}|${kind}`;
    let target = names.get(identity);
    if (!target) {
      const originalName = parsed ? unescapePointer(parsed[2]) : '';
      const portableIdentity = `${path.relative(path.dirname(source.file), resolved.source.file).split(path.sep).join('/')}#${basePointer}|${kind}`;
      const localName = resolved.source.file === source.file && parsed ? originalName : `Focused_${hash(portableIdentity)}`;
      if (!/^[A-Za-z0-9._-]+$/.test(localName)) throw new Error(`Invalid focused component name ${localName}`);
      target = { kind, name: localName };
      names.set(identity, target);
      const bucket = (components[kind] ??= {});
      if (bucket[localName] !== undefined) throw new Error(`Focused component collision ${kind}/${localName}`);
      bucket[localName] = null;
      bucket[localName] = await walk(resolved.value, resolved.source, kind);
    }
    return `#/components/${target.kind}/${escapePointer(target.name)}${parsed?.[3] ?? ''}`;
  };

  const walk = async (value: any, from: ApiSource, kind?: string): Promise<any> => {
    if (Array.isArray(value)) return Promise.all(value.map(item => walk(item, from, kind)));
    if (!value || typeof value !== 'object') return value;
    if (kind === 'schemas' && (value.$id || value.$anchor || value.$dynamicRef || value.$dynamicAnchor)) throw new Error(`Focused OpenAPI needs an adapter for JSON Schema IDs or anchors in ${from.file}`);
    const result: Record<string, any> = {};
    for (const [key, child] of Object.entries<any>(value)) {
      if (key.startsWith('x-')) continue;
      if (key === '$ref') {
        if (typeof child !== 'string') throw new Error(`Invalid $ref in ${from.file}`);
        result.$ref = await register(from, child, kind);
      } else if (key === 'discriminator' && child?.mapping && kind === 'schemas') {
        const mapping: Record<string, string> = {};
        for (const [name, target] of Object.entries<any>(child.mapping)) {
          if (typeof target !== 'string') throw new Error(`Invalid discriminator mapping ${name}`);
          if (from.value.components?.schemas?.[target]) mapping[name] = await register(from, `#/components/schemas/${escapePointer(target)}`, 'schemas');
          else if (target.includes('#') || target.startsWith('.') || target.includes('/') || /\.(?:ya?ml|json)$/i.test(target)) mapping[name] = await register(from, target, 'schemas');
          else throw new Error(`Unresolved discriminator mapping ${name}: ${target}`);
        }
        result[key] = { ...child, mapping };
      } else if (['example', 'default', 'enum', 'const', 'security'].includes(key) || (kind === 'examples' && key === 'value') || (kind === 'schemas' && key === 'examples')) {
        // Payloads and requirement names are data, not OpenAPI objects.
        result[key] = child;
      } else {
        const childKind = kind === 'schemas' ? 'schemas' : kindByField[key] ?? kind;
        const isMap = kind === 'schemas'
          ? ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas'].includes(key)
          : ['content', 'responses', 'examples', 'headers', 'links', 'callbacks', 'variables', 'flows', 'scopes'].includes(key);
        // Map keys are user-defined names, including names such as x-trace or $ref.
        result[key] = isMap && child && typeof child === 'object' && !Array.isArray(child)
          ? Object.fromEntries(await Promise.all(Object.entries(child).map(async ([name, entry]) => [name, await walk(entry, from, childKind)])))
          : await walk(child, from, childKind);
      }
    }
    return result;
  };

  const { route, method, pathItem, pathSource, operation, webhook } = match;
  const operationFields = ['tags', 'summary', 'description', 'externalDocs', 'operationId', 'parameters', 'requestBody', 'responses', 'deprecated', 'security', 'servers'];
  const selectedOperation = Object.fromEntries(operationFields.filter(key => operation[key] !== undefined).map(key => [key, operation[key]]));
  const selectedPath = Object.fromEntries(['summary', 'description', 'parameters', 'servers'].filter(key => pathItem[key] !== undefined).map(key => [key, pathItem[key]]));
  const focusedPath = { ...await walk(selectedPath, pathSource), [method]: await walk(selectedOperation, pathSource) };
  const effectiveSecurity = operation.security ?? api.security;
  for (const requirement of effectiveSecurity ?? []) {
    for (const name of Object.keys(requirement)) {
      if (!api.components?.securitySchemes?.[name]) throw new Error(`Unknown security scheme ${name}`);
      await register(source, `#/components/securitySchemes/${escapePointer(name)}`, 'securitySchemes');
    }
  }
  const info = { title: String(api.info?.title ?? 'API'), version: String(api.info?.version ?? 'unspecified') };
  const output: Record<string, any> = { openapi: api.openapi, info };
  if (api.jsonSchemaDialect) output.jsonSchemaDialect = api.jsonSchemaDialect;
  if (!webhook && api.servers && !pathItem.servers && !operation.servers) output.servers = await walk(api.servers, source);
  if (operation.security === undefined && api.security !== undefined) output.security = api.security;
  if (Array.isArray(api.tags) && Array.isArray(operation.tags)) output.tags = api.tags.filter((tag: any) => operation.tags.includes(tag.name));
  output[webhook ? 'webhooks' : 'paths'] = { [route]: focusedPath };
  if (Object.keys(components).length) output.components = Object.fromEntries(
    Object.entries(components).sort(([a], [b]) => a.localeCompare(b)).map(([kind, bucket]) => [
      kind, Object.fromEntries(Object.entries(bucket).sort(([a], [b]) => a.localeCompare(b)))
    ])
  );
  return output;
}
