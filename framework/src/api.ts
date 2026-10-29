import { readFile, realpath } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { STATUS_CODES } from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseYaml } from './yaml-value.js';
import { code, heading, link, list, paragraph, parsePlainMarkdown, text } from './content.js';
import { requestSamples, type CodeSample, type RequestAuth, type RequestSample } from './code-samples.js';

export type ApiSource = { file: string; value: any };
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
type OpenApiSchemaVersion = '3.0' | '3.1';
export const supportedSchemaKeywords = new Set(['$ref', 'type', 'format', 'nullable', 'enum', 'const', 'default', 'minLength', 'maxLength', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties', 'pattern', 'readOnly', 'writeOnly', 'deprecated', 'description', 'example', 'examples', 'allOf', 'oneOf', 'anyOf', 'items', 'properties', 'required', 'additionalProperties', 'title', 'discriminator']);
const inline = (s: string): any => ({ type: 'inlineCode', value: s });
export type NamedExample = { id: string; key: string; title: string; description: string; location: string; mediaType: string | null; status: string | null; value?: unknown; externalValue?: string; curl?: string; samples?: CodeSample[]; provenance: string };
export type ApiShape = { location: 'request' | 'response'; status: string | null; mediaType: string; value: unknown };
export type QuerySyntaxRule = { parameter: string; pathPrefixes: string[]; style: 'unwrapped'; example: string };
export function querySyntaxRules(value: unknown): QuerySyntaxRule[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('api.querySyntax must be a list');
  return value.map((item, index) => {
    const where = `api.querySyntax[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${where} must be a mapping`);
    const rule = item as Record<string, unknown>;
    if (Object.keys(rule).some(key => !['parameter', 'pathPrefixes', 'style', 'example'].includes(key))) throw new Error(`${where} accepts parameter, pathPrefixes, style, and example`);
    if (typeof rule.parameter !== 'string' || !rule.parameter.trim()) throw new Error(`${where}.parameter must be a name`);
    if (!Array.isArray(rule.pathPrefixes) || !rule.pathPrefixes.length || rule.pathPrefixes.some(prefix => typeof prefix !== 'string' || !prefix.startsWith('/') || /[?#]/.test(prefix))) throw new Error(`${where}.pathPrefixes must be absolute path prefixes`);
    if (rule.style !== 'unwrapped') throw new Error(`${where}.style must be unwrapped`);
    if (typeof rule.example !== 'string' || !/^[^?&#\s]+=[^?&#\s]+$/.test(rule.example)) throw new Error(`${where}.example must be one query expression such as FIELD(eq)=VALUE`);
    return rule as QuerySyntaxRule;
  });
}
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'value';
export function exampleTitle(key: string, summary?: unknown): string {
  if (typeof summary === 'string' && summary.trim()) return summary.trim();
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Example';
}
const schemaName = (reference: string) => reference.split('/').at(-1)?.replaceAll('~1', '/').replaceAll('~0', '~') || reference;
const sameProse = (a: string, b?: string) => a.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '') === (b ?? '').trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
const anchorFor = (parts: string[]) => `field-${parts.map(slug).join('-')}-${createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 7)}`;
const marked = (node: any): any => ({ ...node, data: { ...node.data, exampleOnly: true } });
const disclosure = (label: string, children: any[], open = false, properties = false): any => ({
  type: 'docApiDisclosure', data: { hName: 'details', hProperties: { className: ['api-schema-disclosure', ...(properties ? ['api-properties-disclosure'] : [])], ...(open ? { open: true } : {}) } },
  children: [{ ...paragraph(text(label)), data: { hName: 'summary' } }, ...children]
});
// HTML-only hooks: remark-rehype turns hName/hProperties into elements, while the Markdown twin keeps the plain text.
const tagged = (node: any, className: string, properties: Record<string, unknown> = {}): any => ({ ...node, data: { ...node.data, hProperties: { ...node.data?.hProperties, className: [className], ...properties } } });
const span = (value: string, className: string): any => ({ type: 'text', value, data: { hName: 'span', hProperties: { className: [className] } } });
const infoCard = (children: any[]): any => ({ type: 'docApiInfoCard', data: { hName: 'div', hProperties: { className: ['api-info-card'] } }, children });
const infoCards = (kind: 'server' | 'auth', cards: any[]): any => ({ type: 'docApiInfoCards', data: { hName: 'div', hProperties: { className: [`api-${kind}-list`] } }, children: cards });

export class ApiReader {
  private files = new Map<string, ApiSource>();
  private allowedRoots = new Set<string>();
  readonly dependencies = new Set<string>();
  constructor(projectRoot?: string) {
    if (projectRoot) this.allowedRoots.add(realpathSync(path.resolve(projectRoot)));
  }
  async load(file: string): Promise<ApiSource> {
    file = path.resolve(file);
    // A source explicitly selected by the caller may resolve sibling files. References
    // cannot grant themselves access to another directory on the build machine.
    this.allowedRoots.add(path.dirname(await realpath(file)));
    return this.loadFile(file);
  }
  private async loadReference(file: string): Promise<ApiSource> {
    const resolved = await realpath(file);
    const allowed = [...this.allowedRoots].some(root => {
      const relative = path.relative(root, resolved);
      return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    });
    if (!allowed) throw new Error(`Local $ref escapes the configured project or OpenAPI source directory: ${file}`);
    return this.loadFile(path.resolve(file));
  }
  private async loadFile(file: string): Promise<ApiSource> {
    const cached = this.files.get(file);
    if (cached) return cached;
    const source = await readFile(file, 'utf8');
    const value = parseYaml(source, file);
    const item = { file, value };
    this.files.set(file, item);
    this.dependencies.add(file);
    return item;
  }
  async ref(source: ApiSource, reference: string): Promise<{ value: any; source: ApiSource; label: string; identity: string }> {
    const separator = reference.indexOf('#');
    const name = separator < 0 ? reference : reference.slice(0, separator);
    const pointer = separator < 0 ? '' : reference.slice(separator + 1);
    if (name.includes('://')) throw new Error(`Remote $ref requires a pinned snapshot: ${reference}`);
    if (name && (path.isAbsolute(name) || path.win32.isAbsolute(name))) throw new Error(`Absolute local $ref is not allowed: ${reference}`);
    const target = name ? await this.loadReference(path.resolve(path.dirname(source.file), name)) : source;
    if (pointer && !pointer.startsWith('/')) throw new Error(`Unsupported $ref pointer: ${reference}`);
    const value = pointer ? pointer.slice(1).split('/').reduce((at, key) => at?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], target.value) : target.value;
    if (value === undefined) throw new Error(`Broken $ref ${reference} in ${source.file}`);
    return { value, source: target, label: `${path.basename(target.file)}#${pointer}`, identity: `${target.file}#${pointer}` };
  }
  async collectReferences(file: string): Promise<string[]> {
    const visited = new Set<string>();
    const files = new Set<string>();
    const source = await this.load(file);
    async function walk(reader: ApiReader, current: ApiSource, value: any, kind: 'object' | 'schema' | 'example' = 'object'): Promise<void> {
      files.add(current.file);
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { for (const item of value) await walk(reader, current, item, kind); return; }
      if (typeof value.$ref === 'string') {
        const resolved = await reader.ref(current, value.$ref);
        const key = `${resolved.identity}|${kind}`;
        if (!visited.has(key)) { visited.add(key); await walk(reader, resolved.source, resolved.value, kind); }
      }
      if (kind === 'schema' && value.discriminator?.mapping) for (const target of Object.values(value.discriminator.mapping)) {
        if (typeof target !== 'string' || !(target.startsWith('.') || target.startsWith('/') || target.startsWith('#') || target.includes('/') || /\.(?:ya?ml|json)(?:#|$)/i.test(target))) continue;
        const resolved = await reader.ref(current, target);
        const key = `${resolved.identity}|schema`;
        if (!visited.has(key)) { visited.add(key); await walk(reader, resolved.source, resolved.value, 'schema'); }
      }
      for (const [key, child] of Object.entries(value)) {
        // Examples and schema literals are payload data, including any $ref keys.
        if (key === '$ref' || key.startsWith('x-') || ['example', 'default', 'enum', 'const', 'security'].includes(key) ||
          (kind === 'example' && key === 'value') || (kind === 'schema' && key === 'examples')) continue;
        const childKind = kind === 'schema' || key === 'schema' || key === 'schemas' ? 'schema' : key === 'examples' ? 'example' : kind;
        const isMap = kind === 'schema'
          ? ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas'].includes(key)
          : ['paths', 'webhooks', 'schemas', 'responses', 'parameters', 'requestBodies', 'headers', 'links', 'callbacks', 'pathItems', 'securitySchemes', 'examples', 'content', 'encoding', 'variables', 'flows', 'scopes'].includes(key);
        if (isMap && child && typeof child === 'object' && !Array.isArray(child)) {
          for (const entry of Object.values(child)) await walk(reader, current, entry, childKind);
        } else await walk(reader, current, child, childKind);
      }
    }
    await walk(this, source, source.value);
    return [...files].sort();
  }
  async operation(file: string, sourceOperationId: string, stableOperationId = sourceOperationId, querySyntax: QuerySyntaxRule[] = [], pageTitle?: string): Promise<{ blocks: any[]; examples: NamedExample[]; shapes: ApiShape[]; curl?: string; samples?: CodeSample[]; method: string; route: string; webhook: boolean; deprecated: boolean; tags: string[] }> {
    const source = await this.load(file);
    const api = source.value;
    if (!/^3\.(0|1)\./.test(String(api.openapi))) throw new Error(`${file}: OpenAPI 3.0.x or 3.1.x required`);
    const schemaVersion: OpenApiSchemaVersion = String(api.openapi).startsWith('3.0.') ? '3.0' : '3.1';
    let found: { method: string; route: string; op: any; pathItem: any; pathSource: ApiSource; webhook: boolean } | undefined;
    for (const [collection, webhook] of [[api.paths ?? {}, false], [api.webhooks ?? {}, true]] as const) for (const [route, initial] of Object.entries<any>(collection)) {
      const { value: pathItem, source: pathSource } = await this.deref(source, initial);
      for (const [method, op] of Object.entries<any>(pathItem)) {
        if (!methods.has(method)) continue;
        if (op.operationId === sourceOperationId) {
          if (found) throw new Error(`Duplicate OpenAPI operationId ${sourceOperationId}`);
          found = { method, route, op, pathItem, pathSource, webhook };
        }
      }
    }
    if (!found) throw new Error(`Missing OpenAPI operationId ${sourceOperationId}`);
    const { method, route, op, pathItem, pathSource, webhook } = found;
    for (const unsupported of ['callbacks', 'webhooks']) if (op[unsupported]) throw new Error(`Unsupported operation feature ${unsupported} on ${sourceOperationId}`);
    const blocks: any[] = [tagged(heading(2, webhook ? `Webhook: ${route}` : `${method.toUpperCase()} ${route}`), 'api-operation-heading')];
    if (webhook) blocks.push(paragraph(text(`The provider sends a ${method.toUpperCase()} request for this event to the receiver's webhook URL.`)));
    const examples: NamedExample[] = [];
    const shapes: ApiShape[] = [];
    let buildRequest: ((mediaType?: string, body?: unknown, formFields?: string[]) => RequestSample) | undefined;
    let queryRule: QuerySyntaxRule | undefined;
    let queryExpression: string | undefined;
    const exampleIds = new Set<string>();
    const addExamples = async (source: ApiSource, holder: any, location: string, mediaType: string | null, status: string | null, targetBlocks = blocks) => {
      if (holder.example !== undefined && holder.examples !== undefined) throw new Error(`${source.file}: ${location} cannot define both example and examples`);
      const entries: Array<[string, any]> = holder.examples ? Object.entries(holder.examples) : holder.example !== undefined ? [['default', { value: holder.example, summary: 'Default example' }]] : [];
      for (const [key, initial] of entries) {
        if (initial?.$ref && Object.keys(initial).length !== 1) throw new Error(`${source.file}: example reference ${key} has unsupported siblings`);
        const { value: resolved } = await this.deref(source, initial);
        if (!resolved || typeof resolved !== 'object') throw new Error(`${source.file}: invalid Example Object ${key}`);
        if ('value' in resolved && 'externalValue' in resolved) throw new Error(`${source.file}: example ${key} cannot define both value and externalValue`);
        if (!('value' in resolved) && !('externalValue' in resolved)) throw new Error(`${source.file}: example ${key} needs value or externalValue`);
        const identity = `${stableOperationId}|${location}|${status ?? ''}|${mediaType ?? ''}|${key}`;
        const id = `example-${slug(stableOperationId)}-${slug(location)}-${slug(status ?? '')}-${slug(mediaType ?? '')}-${slug(key)}-${createHash('sha256').update(identity).digest('hex').slice(0, 7)}`;
        if (exampleIds.has(id)) throw new Error(`Duplicate named example ${identity}`);
        exampleIds.add(id);
        const example: NamedExample = { id, key, title: exampleTitle(key, resolved.summary), description: String(resolved.description ?? '').trim(), location, mediaType, status, provenance: initial?.$ref ? `OpenAPI component ${initial.$ref}` : 'Authored in OpenAPI' };
        if ('value' in resolved) example.value = resolved.value;
        else {
          if (typeof resolved.externalValue !== 'string' || !/^https:\/\//.test(resolved.externalValue)) throw new Error(`${source.file}: local externalValue needs a pinned adapter for ${key}`);
          example.externalValue = resolved.externalValue;
        }
        examples.push(example);
        if (queryRule && queryExpression === queryRule.example && location === `parameter:query:${queryRule.parameter}` && example.value && typeof example.value === 'object' && !Array.isArray(example.value)) {
          const entries = Object.entries(example.value);
          if (entries.length === 1 && /^[^?&#\s=]+$/.test(entries[0][0]) && ['string', 'number', 'boolean'].includes(typeof entries[0][1])) queryExpression = `${entries[0][0]}=${encodeURIComponent(String(entries[0][1]))}`;
        }
        if (location.startsWith('parameter:') || location.startsWith('response-header:')) {
          const value = example.externalValue ? link(example.externalValue, 'Open external example') : inline(queryRule && location === `parameter:query:${queryRule.parameter}` ? queryExpression ?? JSON.stringify(example.value) : JSON.stringify(example.value));
          const sample = paragraph({ type: 'strong', children: [text(example.title)] }, text(': '), value, ...(example.description ? [text(` — ${example.description}`)] : []));
          sample.data = { hProperties: { className: ['api-parameter-example'] } };
          targetBlocks.push(sample);
          continue;
        }
        targetBlocks.push(marked(heading(5, `Example: ${example.title}`)));
        targetBlocks.push(marked(paragraph(text(`Key: ${key}. Location: ${location}${status ? ` ${status}` : ''}${mediaType ? `; ${mediaType}` : ''}. ${example.provenance}.`))));
        if (example.description) targetBlocks.push(marked(paragraph(text(example.description))));
        if (example.externalValue) targetBlocks.push(marked(paragraph(text('External example: '), link(example.externalValue, example.externalValue))));
        else targetBlocks.push(marked(code(typeof example.value === 'string' && mediaType?.startsWith('text/') ? example.value : JSON.stringify(example.value, null, 2), mediaType?.includes('json') || typeof example.value !== 'string' ? 'json' : 'text')));
        if (location === 'request' && !webhook && !example.externalValue && buildRequest && mediaType?.toLowerCase() !== 'multipart/form-data') {
          example.samples = requestSamples(buildRequest(mediaType ?? undefined, example.value));
          example.curl = example.samples[0].code;
          targetBlocks.push(marked(paragraph(text('Example request (cURL):'))));
          targetBlocks.push(marked(code(example.curl, 'bash')));
        }
      }
    };
    if (op.summary) blocks.push(...parsePlainMarkdown(op.summary).map(node => sameProse(String(op.summary), pageTitle) && node.type === 'paragraph' ? tagged(node, 'api-operation-summary') : node));
    if (op.description) blocks.push(...parsePlainMarkdown(op.description));
    if (op.deprecated) blocks.push(tagged(paragraph(text('Deprecated operation.')), 'api-deprecated-note'));
    if (op.externalDocs) {
      if (typeof op.externalDocs.url !== 'string') throw new Error(`Invalid externalDocs on ${sourceOperationId}`);
      blocks.push(paragraph(text('Additional documentation: '), link(op.externalDocs.url, op.externalDocs.description ?? op.externalDocs.url)));
    }
    const servers = op.servers ?? pathItem.servers ?? api.servers;
    if (!webhook && servers?.length) {
      blocks.push(heading(3, 'Servers'));
      const serverItems: any[] = [];
      for (const server of servers) {
        if (typeof server.url !== 'string') throw new Error(`Invalid server on ${sourceOperationId}`);
        const item = [paragraph(inline(server.url), ...(server.description ? [text(` — ${server.description}`)] : []))];
        for (const [name, variable] of Object.entries<any>(server.variables ?? {})) {
          if (variable.default === undefined) throw new Error(`Server variable ${name} needs a default`);
          item.push(paragraph(inline(name), text(` defaults to ${variable.default}${variable.enum ? `; allowed: ${variable.enum.join(', ')}` : ''}.`)));
        }
        serverItems.push(infoCard(item));
      }
      blocks.push(infoCards('server', serverItems));
    }
    const security = op.security ?? api.security;
    if (security) {
      blocks.push(heading(3, 'Authentication'));
      if (!security.length) blocks.push(paragraph(text('No authentication required.')));
      else {
        if (security.length > 1) blocks.push(paragraph(text('Use one of these authentication options:')));
        const authItems: any[] = [];
        for (const [index, alternative] of security.entries()) {
        const names = Object.keys(alternative);
        const onlyScheme = names.length === 1 ? api.components?.securitySchemes?.[names[0]] : undefined;
        const label = !names.length ? 'No authentication' : names.length > 1 ? `Option ${index + 1} · all required` : onlyScheme?.type === 'apiKey' ? 'API key' : onlyScheme?.type === 'http' && onlyScheme.scheme?.toLowerCase() === 'bearer' ? 'Bearer token' : onlyScheme?.type === 'http' ? `HTTP ${onlyScheme.scheme} authentication` : onlyScheme?.type === 'oauth2' ? 'OAuth2' : onlyScheme?.type === 'openIdConnect' ? 'OpenID Connect' : onlyScheme?.type === 'mutualTLS' ? 'Client certificate' : `Option ${index + 1}`;
        const item: any[] = [paragraph({ type: 'strong', children: [text(label)] })];
        if (!names.length) { authItems.push(infoCard(item)); continue; }
        for (const name of names) {
          const scheme = api.components?.securitySchemes?.[name];
          if (!scheme) throw new Error(`Unknown security scheme ${name}`);
          let detail: string;
          if (scheme.type === 'apiKey') {
            if (!['header', 'query', 'cookie'].includes(scheme.in) || typeof scheme.name !== 'string') throw new Error(`Invalid API key security scheme ${name}`);
            detail = `API key in ${scheme.in} ${scheme.name}`;
          } else if (scheme.type === 'http') {
            if (typeof scheme.scheme !== 'string') throw new Error(`Invalid HTTP security scheme ${name}`);
            detail = `HTTP ${scheme.scheme}${scheme.bearerFormat ? ` (${scheme.bearerFormat})` : ''}`;
          } else if (scheme.type === 'oauth2') {
            const flows = Object.keys(scheme.flows ?? {});
            if (!flows.length) throw new Error(`OAuth2 security scheme ${name} has no flows`);
            detail = `OAuth2 flows: ${flows.join(', ')}`;
          } else if (scheme.type === 'openIdConnect') {
            if (typeof scheme.openIdConnectUrl !== 'string') throw new Error(`OpenID Connect security scheme ${name} has no discovery URL`);
            detail = `OpenID Connect discovery: ${scheme.openIdConnectUrl}`;
          } else if (scheme.type === 'mutualTLS') detail = 'Mutual TLS client certificate';
          else throw new Error(`Unsupported security scheme type ${scheme.type} on ${name}`);
          const scopes = alternative[name];
          if (!Array.isArray(scopes)) throw new Error(`Security requirement ${name} needs a scopes array`);
          item.push(paragraph(text(`${detail}${scopes.length ? `; scopes: ${scopes.join(', ')}` : ''}.`)));
          if (scheme.description) item.push(...parsePlainMarkdown(scheme.description));
        }
        authItems.push(infoCard(item));
        }
        blocks.push(infoCards('auth', authItems));
      }
    }
    const parameters: Array<{ value: any; source: ApiSource }> = [];
    const parameterPositions = new Map<string, number>();
    for (const initial of [...(pathItem.parameters ?? []), ...(op.parameters ?? [])]) {
      const resolved = await this.deref(pathSource, initial);
      const parameter = resolved.value;
      const key = `${parameter.in}|${parameter.name}`;
      if (!parameter.in || !parameter.name) throw new Error(`Invalid parameter on ${sourceOperationId}`);
      const position = parameterPositions.get(key);
      if (position === undefined) { parameterPositions.set(key, parameters.length); parameters.push(resolved); }
      else parameters[position] = resolved;
    }
    const applicableQueryRules = webhook ? [] : querySyntax.filter(rule => rule.pathPrefixes.some(prefix => route.startsWith(prefix)) && parameters.some(({ value: parameter }) => parameter.in === 'query' && parameter.name === rule.parameter));
    if (applicableQueryRules.length > 1) throw new Error(`Multiple query syntax rules apply to ${sourceOperationId}`);
    queryRule = applicableQueryRules[0];
    queryExpression = queryRule?.example;
    buildRequest = (mediaType?: string, body?: unknown, formFields: string[] = []) => {
      const server = servers?.[0];
      const serverUrl = typeof server?.url === 'string' ? server.url.replace(/\{([^}]+)\}/g, (_: string, name: string) => String(server.variables?.[name]?.default ?? `YOUR_${name.toUpperCase()}`)) : 'https://YOUR_API_HOST';
      const base = serverUrl.startsWith('/') ? `https://YOUR_API_HOST${serverUrl}` : serverUrl;
      let url = `${base.replace(/\/$/, '')}${route}`;
      for (const { value: parameter } of parameters) if (parameter.in === 'path') url = url.replaceAll(`{${parameter.name}}`, `YOUR_${String(parameter.name).replace(/[^a-z0-9]/gi, '_').toUpperCase()}`);
      const requiredQuery = parameters.filter(({ value: parameter }) => parameter.in === 'query' && parameter.required && parameter.name !== queryRule?.parameter);
      const query = requiredQuery.map(({ value: parameter }) => `${encodeURIComponent(parameter.name)}=YOUR_${String(parameter.name).replace(/[^a-z0-9]/gi, '_').toUpperCase()}`);
      if (queryExpression) query.unshift(queryExpression);
      const auth: RequestAuth[] = [];
      const alternative = security?.[0] ?? {};
      for (const name of Object.keys(alternative)) {
        const scheme = api.components?.securitySchemes?.[name];
        if (scheme?.type === 'apiKey') {
          if (scheme.in === 'header') auth.push({ kind: 'header', name: scheme.name, value: 'YOUR_API_KEY' });
          if (scheme.in === 'cookie') auth.push({ kind: 'cookie', name: scheme.name, value: 'YOUR_API_KEY' });
          if (scheme.in === 'query') query.push(`${encodeURIComponent(scheme.name)}=YOUR_API_KEY`);
        } else if (scheme?.type === 'http' && scheme.scheme?.toLowerCase() === 'basic') auth.push({ kind: 'basic', user: 'YOUR_USERNAME', pass: 'YOUR_PASSWORD' });
        else if (scheme?.type === 'http' && scheme.scheme?.toLowerCase() === 'digest') auth.push({ kind: 'digest', user: 'YOUR_USERNAME', pass: 'YOUR_PASSWORD' });
        else if (scheme?.type === 'http' && scheme.scheme?.toLowerCase() !== 'bearer') auth.push({ kind: 'authorization', value: 'YOUR_AUTHORIZATION_VALUE' });
        else if (scheme?.type === 'http' || scheme?.type === 'oauth2' || scheme?.type === 'openIdConnect') auth.push({ kind: 'bearer', token: 'YOUR_TOKEN' });
        else if (scheme?.type === 'mutualTLS') auth.push({ kind: 'mtls', cert: 'CLIENT_CERT.pem', key: 'CLIENT_KEY.pem' });
      }
      const headers = parameters.filter(({ value: parameter }) => parameter.in === 'header' && parameter.required)
        .map(({ value: parameter }) => ({ name: parameter.name, value: `YOUR_${String(parameter.name).replace(/[^a-z0-9]/gi, '_').toUpperCase()}` }));
      const fullUrl = url + (query.length ? `${url.includes('?') ? '&' : '?'}${query.join('&')}` : '');
      const request: RequestSample = { method, url: fullUrl, headers, auth };
      if (mediaType && !formFields.length) request.contentType = mediaType;
      if (formFields.length) request.body = { mediaType: mediaType ?? '', text: '', formFields };
      else if (body !== undefined) request.body = { mediaType: mediaType ?? '', text: typeof body === 'string' && mediaType?.startsWith('text/') ? body : JSON.stringify(body), formFields: [] };
      return request;
    };
    if (parameters.length) {
      blocks.push(heading(3, 'Parameters'));
      for (const { value: parameter, source } of parameters) {
        if (parameter.content) throw new Error(`Parameter content needs an adapter: ${parameter.name}`);
        const unwrapped = queryRule?.parameter === parameter.name && parameter.in === 'query';
        const detail = [{ ...heading(4, unwrapped ? 'Filters' : parameter.name), children: [unwrapped ? text('Filters') : { ...text(parameter.name), data: { hName: 'code' } }, span(` (${parameter.in})`, 'api-parameter-in')] }];
        const presence = paragraph(text(parameter.required ? 'Required' : 'Optional'));
        presence.data = { hProperties: { className: ['api-parameter-presence'], 'data-required': parameter.required ? 'true' : 'false' } };
        detail.push(presence);
        if (unwrapped) {
          detail.push(paragraph(text('OpenAPI calls this placeholder '), inline(parameter.name), text('. Send a filter expression directly in the query string, without '), inline(`${parameter.name}=`), text('.')));
          detail.push(paragraph(text('Query form: '), inline(`?${queryRule.example}`), text('. Replace the field, operator, and value for your filter.')));
          if (parameter.description) detail.push(disclosure('Source notes, accepted fields, and operators', parsePlainMarkdown(parameter.description)));
        } else if (parameter.description) detail.push(...parsePlainMarkdown(parameter.description));
        if (parameter.style || parameter.explode !== undefined) detail.push(paragraph(text(`Serialization: ${parameter.style ?? 'default'}; explode: ${parameter.explode ?? 'default'}.`)));
        if (parameter.schema !== undefined) detail.push(...await this.schemaBlocks(source, parameter.schema, schemaVersion, 5, new Set(), ['parameter', parameter.in, parameter.name], [], parameter.description));
        await addExamples(source, parameter, `parameter:${parameter.in}:${parameter.name}`, null, null, detail);
        blocks.push({ type: 'docApiParameter', data: { hName: 'section', hProperties: { className: ['api-parameter'] } }, children: detail });
      }
    }
    let multipartRequest: RequestSample | undefined;
    if (op.requestBody) {
      const { value: requestBody, source: requestSource } = await this.deref(pathSource, op.requestBody);
      blocks.push(heading(3, 'Request body'));
      blocks.push(tagged(paragraph(text(requestBody.required ? 'Required' : 'Optional'), span('.', 'api-separator')), 'api-body-presence', { 'data-required': requestBody.required ? 'true' : 'false' }));
      if (requestBody.description) blocks.push(...parsePlainMarkdown(requestBody.description));
      for (const [mediaType, media] of Object.entries<any>(requestBody.content ?? {})) {
        if (media.encoding) throw new Error(`Request encoding needs an adapter: ${mediaType}`);
        blocks.push(tagged(heading(4, mediaType), 'api-media-heading'));
        if (media.schema !== undefined) {
          blocks.push(...await this.schemaBlocks(requestSource, media.schema, schemaVersion, 5, new Set(), ['request', mediaType]));
          if (mediaType.toLowerCase().includes('json')) shapes.push({ location: 'request', status: null, mediaType, value: await this.schemaShape(requestSource, media.schema, new Set()) });
          if (mediaType.toLowerCase() === 'multipart/form-data') {
            const { value: schema } = await this.deref(requestSource, media.schema);
            const required = schema?.required;
            if (Array.isArray(required) && required.length && required.every((name: unknown) => typeof name === 'string' && schema.properties?.[name]?.type === 'string' && schema.properties[name].format === 'binary')) {
              if (!webhook) multipartRequest = buildRequest(mediaType, undefined, required);
            }
          }
        }
        await addExamples(requestSource, media, 'request', mediaType, null);
      }
    }
    const samples = webhook || (op.requestBody && !multipartRequest) ? undefined : requestSamples(!op.requestBody ? buildRequest!() : multipartRequest!);
    const curl = samples?.[0]?.code;
    if (curl) { blocks.push(marked(heading(3, 'Example request'))); blocks.push(marked(code(curl, 'bash'))); }
    blocks.push(heading(3, 'Responses'));
    for (const [status, initial] of Object.entries<any>(op.responses ?? {})) {
      const { value: response, source: responseSource } = await this.deref(pathSource, initial);
      if (response.links) throw new Error(`Response links need an adapter: ${status}`);
      const description = String(response.description ?? '').trim();
      const mediaEntries = Object.entries<any>(response.content ?? {});
      const responseBlocks: any[] = [];
      const responseHeading = { ...heading(4, ''), children: [span(status, 'api-status-code'), span(': ', 'api-separator'), text(status === 'default' ? 'Default response' : STATUS_CODES[Number(status)] ?? 'Response')] };
      responseBlocks.push({ type: 'docApiResponseHeader', data: { hName: 'div', hProperties: { className: ['api-response-header'] } }, children: [responseHeading, ...mediaEntries.map(([mediaType]) => ({ ...paragraph(inline(mediaType)), data: { hProperties: { className: ['api-response-media'] } } }))] });
      if (description) responseBlocks.push(...parsePlainMarkdown(description));
      if (response.headers !== undefined && (!response.headers || typeof response.headers !== 'object' || Array.isArray(response.headers))) throw new Error(`Response headers must be a mapping: ${status}`);
      const headerNames = new Set<string>();
      const headers: any[] = [];
      for (const [name, initialHeader] of Object.entries<any>(response.headers ?? {})) {
        // OpenAPI explicitly excludes Content-Type: response.content describes it.
        if (name.toLowerCase() === 'content-type') continue;
        if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new Error(`Invalid response header name: ${name}`);
        if (headerNames.has(name.toLowerCase())) throw new Error(`Duplicate response header name (case-insensitive): ${name}`);
        headerNames.add(name.toLowerCase());
        let header = initialHeader, headerSource = responseSource;
        let overrideDescription: string | undefined;
        const seen = new Set<string>();
        while (header?.$ref) {
          if (typeof header.$ref !== 'string') throw new Error(`Response header reference must be a string: ${name}`);
          const allowed = schemaVersion === '3.1' ? ['$ref', 'description', 'summary'] : ['$ref'];
          if (Object.keys(header).some(key => !allowed.includes(key))) throw new Error(`Response header reference ${name} has unsupported siblings`);
          for (const field of ['description', 'summary']) if (header[field] !== undefined && typeof header[field] !== 'string') throw new Error(`Invalid response header reference ${field}: ${name}`);
          // Reference summary has no Header Object counterpart; OAS ignores it.
          if (overrideDescription === undefined && header.description !== undefined) overrideDescription = header.description;
          const resolved = await this.ref(headerSource, header.$ref);
          if (seen.has(resolved.identity)) throw new Error(`Recursive response header reference: ${name}`);
          seen.add(resolved.identity);
          header = resolved.value; headerSource = resolved.source;
        }
        if (!header || typeof header !== 'object' || Array.isArray(header)) throw new Error(`Invalid response Header Object: ${name}`);
        if (header.content !== undefined) throw new Error(`Response header content needs an adapter: ${name}`);
        const fields = new Set(['description', 'required', 'deprecated', 'schema', 'style', 'explode', 'example', 'examples']);
        for (const field of Object.keys(header)) if (!fields.has(field) && !field.startsWith('x-')) throw new Error(`Unsupported response header field ${field}: ${name}`);
        for (const field of ['required', 'deprecated', 'explode']) if (header[field] !== undefined && typeof header[field] !== 'boolean') throw new Error(`Response header ${field} must be boolean: ${name}`);
        if (header.description !== undefined && typeof header.description !== 'string') throw new Error(`Response header description must be a string: ${name}`);
        if (header.style !== undefined && header.style !== 'simple') throw new Error(`Response header style must be simple: ${name}`);
        if (header.schema === undefined) throw new Error(`Response header requires a schema: ${name}`);
        if (header.examples !== undefined && (!header.examples || typeof header.examples !== 'object' || Array.isArray(header.examples))) throw new Error(`Response header examples must be a mapping: ${name}`);
        const headerDescription = overrideDescription ?? header.description;
        const detail = [heading(6, name), tagged(paragraph(text(header.required ? 'Required' : 'Optional')), 'api-parameter-presence', { 'data-required': header.required ? 'true' : 'false' })];
        if (header.deprecated) detail.push(tagged(paragraph(text('Deprecated response header.')), 'api-deprecated-note'));
        if (headerDescription) detail.push(...parsePlainMarkdown(headerDescription));
        detail.push(paragraph(text(`Serialization: simple; explode: ${header.explode ?? false}.`)));
        detail.push(...await this.schemaBlocks(headerSource, header.schema, schemaVersion, 6, new Set(), ['response', status, 'header', name], [], headerDescription));
        await addExamples(headerSource, header, `response-header:${name}`, null, status, detail);
        headers.push({ type: 'docApiParameter', data: { hName: 'section', hProperties: { className: ['api-parameter', 'api-response-header-field'] } }, children: detail });
      }
      if (headers.length) responseBlocks.push(heading(5, 'Response headers'), ...headers);
      for (const [mediaType, media] of mediaEntries) {
        if (mediaEntries.length > 1) responseBlocks.push(tagged(heading(5, mediaType), 'api-media-heading'));
        if (media.schema !== undefined) {
          responseBlocks.push(...await this.schemaBlocks(responseSource, media.schema, schemaVersion, 5, new Set(), ['response', status, mediaType]));
          if (mediaType.toLowerCase().includes('json')) shapes.push({ location: 'response', status, mediaType, value: await this.schemaShape(responseSource, media.schema, new Set()) });
        }
        await addExamples(responseSource, media, 'response', mediaType, status, responseBlocks);
      }
      blocks.push({ type: 'docApiResponse', data: { hName: 'section', hProperties: { className: ['api-response'], 'data-status': /^[1-5]\d\d$/.test(status) ? `${status[0]}xx` : status.toLowerCase() } }, children: responseBlocks });
    }
    if (op.tags !== undefined && (!Array.isArray(op.tags) || op.tags.some((tag: unknown) => typeof tag !== 'string'))) throw new Error(`Invalid OpenAPI tags on ${sourceOperationId}`);
    return { blocks, examples, shapes, curl, samples, method, route, webhook, deprecated: op.deprecated === true, tags: op.tags ?? [] };
  }
  private async schemaShape(source: ApiSource, schema: any, seen: Set<string>, depth = 0): Promise<unknown> {
    if (schema === true) return '<any value>';
    if (schema === false) return '<no valid value>';
    if (!schema || typeof schema !== 'object') return 'unknown';
    if (depth > 12) return '<nested schema>';
    if (schema.$ref) {
      const resolved = await this.ref(source, schema.$ref);
      if (seen.has(resolved.identity)) return `<recursive ${schemaName(resolved.label)}>`;
      const next = new Set(seen); next.add(resolved.identity);
      return this.schemaShape(resolved.source, resolved.value, next, depth + 1);
    }
    if (schema.allOf?.length) {
      const parts = await Promise.all(schema.allOf.map((part: any) => this.schemaShape(source, part, seen, depth + 1)));
      if (parts.every(part => part && typeof part === 'object' && !Array.isArray(part))) {
        const own = await this.schemaShape(source, { ...schema, allOf: undefined }, seen, depth + 1);
        return Object.assign({}, ...parts, own && typeof own === 'object' && !Array.isArray(own) ? own : {});
      }
      return { allOf: parts };
    }
    for (const kind of ['oneOf', 'anyOf']) if (schema[kind]?.length) return { [kind]: await Promise.all(schema[kind].map((part: any) => this.schemaShape(source, part, seen, depth + 1))) };
    if (schema.const !== undefined) return schema.const;
    const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
    if (schema.properties || types.includes('object') || schema.additionalProperties) {
      const value: Record<string, unknown> = {};
      for (const [name, child] of Object.entries<any>(schema.properties ?? {})) value[name] = await this.schemaShape(source, child, seen, depth + 1);
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') value['<key>'] = await this.schemaShape(source, schema.additionalProperties, seen, depth + 1);
      return value;
    }
    if (schema.items !== undefined || types.includes('array')) return [schema.items !== undefined ? await this.schemaShape(source, schema.items, seen, depth + 1) : 'unknown'];
    const label = types.length ? types.join(' | ') : schema.enum?.length ? typeof schema.enum[0] : 'unknown';
    return `${label}${schema.format ? ` (${schema.format})` : ''}${schema.nullable && !types.includes('null') ? ' | null' : ''}`;
  }
  private async schemaAllowsNull(source: ApiSource, schema: any, seen = new Set<string>()): Promise<boolean> {
    if (typeof schema === 'boolean') return schema;
    if (!schema || typeof schema !== 'object') return false;
    if (schema.nullable === true || schema.type === 'null' || (Array.isArray(schema.type) && schema.type.includes('null')) || schema.const === null || schema.enum?.includes(null)) return true;
    if (schema.type !== undefined || schema.const !== undefined || schema.enum !== undefined) return false;
    if (schema.$ref) {
      const resolved = await this.ref(source, schema.$ref);
      if (seen.has(resolved.identity)) return false;
      return this.schemaAllowsNull(resolved.source, resolved.value, new Set([...seen, resolved.identity]));
    }
    if (schema.oneOf?.length || schema.anyOf?.length) {
      for (const child of [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]) if (await this.schemaAllowsNull(source, child, seen)) return true;
    }
    if (schema.allOf?.length) {
      for (const child of schema.allOf) if (!await this.schemaAllowsNull(source, child, seen)) return false;
      return true;
    }
    return false;
  }
  private async schemaTypeLabel(source: ApiSource, schema: any, seen = new Set<string>()): Promise<string> {
    if (schema === true) return 'any value';
    if (schema === false) return 'no valid value';
    if (!schema || typeof schema !== 'object') return 'unknown';
    if (schema.$ref) {
      const resolved = await this.ref(source, schema.$ref);
      if (seen.has(resolved.identity)) return 'object';
      return this.schemaTypeLabel(resolved.source, resolved.value, new Set([...seen, resolved.identity]));
    }
    const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
    if (schema.items !== undefined || types.includes('array')) return `list of ${schema.items !== undefined ? await this.schemaTypeLabel(source, schema.items, seen) : 'unknown'}`;
    if (schema.properties || types.includes('object') || schema.additionalProperties) return 'object';
    if (schema.enum?.length) return `enum<${types.find((type: string) => type !== 'null') ?? typeof schema.enum.find((value: unknown) => value !== null)}>`;
    if (types.length) return types.filter((type: string) => type !== 'null').join(' | ') || 'null';
    if (schema.oneOf?.length || schema.anyOf?.length) return 'one of several types';
    if (schema.allOf?.length) return this.schemaTypeLabel(source, schema.allOf[0], seen);
    return schema.const !== undefined ? typeof schema.const : 'unknown';
  }
  async operationSchema(file: string, sourceOperationId: string, selection: { kind: 'request' | 'response'; mediaType: string; status?: string; schema?: string }, anchorScope = ''): Promise<any[]> {
    const source = await this.load(file);
    if (!/^3\.(0|1)\./.test(String(source.value.openapi))) throw new Error(`${file}: OpenAPI 3.0.x or 3.1.x required`);
    const schemaVersion: OpenApiSchemaVersion = String(source.value.openapi).startsWith('3.0.') ? '3.0' : '3.1';
    let operation: { value: any; source: ApiSource } | undefined;
    for (const collection of [source.value.paths ?? {}, source.value.webhooks ?? {}]) for (const initial of Object.values<any>(collection)) {
      const pathItem = await this.deref(source, initial);
      for (const [method, candidate] of Object.entries<any>(pathItem.value)) if (methods.has(method) && candidate.operationId === sourceOperationId) {
        if (operation) throw new Error(`duplicate OpenAPI operationId ${sourceOperationId}`);
        operation = { value: candidate, source: pathItem.source };
      }
    }
    if (!operation) throw new Error(`unknown OpenAPI operationId ${sourceOperationId}`);
    const holder = selection.kind === 'request' ? operation.value.requestBody : operation.value.responses?.[selection.status!];
    if (!holder) throw new Error(`missing ${selection.kind}${selection.status ? ` ${selection.status}` : ''} on ${sourceOperationId}`);
    const resolved = await this.deref(operation.source, holder);
    const media = resolved.value.content?.[selection.mediaType];
    if (!media) throw new Error(`missing ${selection.mediaType} in ${selection.kind}${selection.status ? ` ${selection.status}` : ''} on ${sourceOperationId}`);
    if (media.schema === undefined) throw new Error(`missing schema for ${selection.mediaType} on ${sourceOperationId}`);
    const schema = selection.schema ? { $ref: selection.schema } : media.schema;
    const schemaSource = selection.schema ? source : resolved.source;
    const label = `${selection.kind === 'request' ? 'Request' : `Response ${selection.status}`} schema · ${selection.mediaType}`;
    return [heading(3, label), ...await this.schemaBlocks(schemaSource, schema, schemaVersion, 4, new Set(), [selection.kind, 'embedded', anchorScope, sourceOperationId, selection.status ?? '', selection.mediaType])];
  }
  async schemaReference(file: string, reference: string, anchorScope = ''): Promise<any[]> {
    const source = await this.load(file);
    if (!/^3\.(0|1)\./.test(String(source.value.openapi))) throw new Error(`${file}: OpenAPI 3.0.x or 3.1.x required`);
    const schemaVersion: OpenApiSchemaVersion = String(source.value.openapi).startsWith('3.0.') ? '3.0' : '3.1';
    const selected = await this.ref(source, reference);
    if (selected.value === null || !['object', 'boolean'].includes(typeof selected.value) || Array.isArray(selected.value)) throw new Error(`${file}: ${reference} must select a schema`);
    const field = /\/properties\/[^/]+$/.test(reference);
    const label = `${field ? 'Field' : 'Schema'} · ${schemaName(reference)}`;
    return [heading(3, label), ...await this.schemaBlocks(selected.source, selected.value, schemaVersion, 4, new Set(), ['standalone', 'embedded', anchorScope, reference])];
  }
  private async deref(source: ApiSource, value: any): Promise<{ value: any; source: ApiSource }> {
    const seen = new Set<string>();
    while (value?.$ref) {
      const identity = `${source.file}#${value.$ref}`;
      if (seen.has(identity)) throw new Error(`Recursive reference object ${value.$ref} in ${source.file}`);
      seen.add(identity);
      ({ value, source } = await this.ref(source, value.$ref));
    }
    return { value, source };
  }
  private async schemaBlocks(source: ApiSource, schema: any, schemaVersion: OpenApiSchemaVersion, depth: number, seen: Set<string>, scope: string[], trail: string[] = [], omitRootDescription?: string, omitRootType = false): Promise<any[]> {
    const location = `${[...scope, ...trail].join('/')} in ${source.file}`;
    if (typeof schema === 'boolean') {
      if (schemaVersion === '3.0') throw new Error(`Boolean schemas require OpenAPI 3.1 at ${location}`);
      return [paragraph(text(schema ? 'Any value is allowed.' : 'No value is allowed.'))];
    }
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error(`Invalid schema at ${location}`);
    for (const key of Object.keys(schema)) if (!supportedSchemaKeywords.has(key) && !key.startsWith('x-')) throw new Error(`Unsupported schema keyword ${key} at ${location}`);
    if (schema.examples !== undefined && (schemaVersion === '3.0' || !Array.isArray(schema.examples))) throw new Error(`Schema examples need an array in OpenAPI 3.1 at ${location}`);
    for (const key of ['exclusiveMinimum', 'exclusiveMaximum'] as const) if (schema[key] !== undefined) {
      if (schemaVersion === '3.0' && (typeof schema[key] !== 'boolean' || typeof schema[key === 'exclusiveMinimum' ? 'minimum' : 'maximum'] !== 'number')) throw new Error(`${key} in OpenAPI 3.0 needs a boolean and its numeric ${key === 'exclusiveMinimum' ? 'minimum' : 'maximum'} at ${location}`);
      if (schemaVersion === '3.1' && (typeof schema[key] !== 'number' || !Number.isFinite(schema[key]))) throw new Error(`${key} in OpenAPI 3.1 needs a number at ${location}`);
    }
    if (schema.$ref) {
      const resolved = await this.ref(source, schema.$ref);
      const { $ref, description: localDescription, ...adjacent } = schema;
      const annotations = Object.keys(adjacent).length ? [tagged(paragraph(text('Additional schema keywords at this use:')), 'api-schema-label'), ...await this.schemaBlocks(source, adjacent, schemaVersion, depth, seen, scope, [...trail, 'adjacent'])] : [];
      const description = typeof localDescription === 'string' ? localDescription : resolved.value?.description;
      const visibleDescription = typeof description === 'string' && !sameProse(description, omitRootDescription) ? parsePlainMarkdown(description) : [];
      if (seen.has(resolved.identity)) return [...visibleDescription, paragraph(text('Recursive reference: '), inline(schemaName(resolved.label)), text('.')), ...annotations];
      const next = new Set(seen); next.add(resolved.identity);
      const array = resolved.value?.items || resolved.value?.type === 'array';
      const object = resolved.value?.properties || resolved.value?.additionalProperties || resolved.value?.allOf || resolved.value?.oneOf || resolved.value?.anyOf || resolved.value?.type === 'object';
      const detail = [...await this.schemaBlocks(resolved.source, resolved.value, schemaVersion, depth, next, scope, trail, resolved.value?.description, omitRootType || Boolean(object)), ...annotations];
      return array ? [...visibleDescription, disclosure('Items', detail, depth <= 5)] : [...visibleDescription, ...detail];
    }
    const parts: string[] = [];
    if (schema.type && !omitRootType) parts.push(Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type);
    if (schema.format) parts.push(`format: ${schema.format}`);
    if (schema.nullable) parts.push('nullable');
    if (schema.const !== undefined) parts.push(`const: ${JSON.stringify(schema.const)}`);
    if (schema.default !== undefined) parts.push(`default: ${JSON.stringify(schema.default)}`);
    for (const key of ['minLength', 'maxLength', 'minimum', 'maximum', 'multipleOf', 'minItems', 'maxItems', 'minProperties', 'maxProperties', 'pattern']) if (schema[key] !== undefined) parts.push(`${key}: ${schema[key]}`);
    for (const key of ['exclusiveMinimum', 'exclusiveMaximum'] as const) if (schema[key] !== undefined) parts.push(`${key}: ${schema[key]}`);
    if (schema.uniqueItems !== undefined) parts.push(`uniqueItems: ${schema.uniqueItems}`);
    if (schema.readOnly) parts.push('read only');
    if (schema.writeOnly) parts.push('write only');
    if (schema.deprecated) parts.push('deprecated');
    if (schema.title) parts.push(`title: ${schema.title}`);
    const blocks: any[] = [];
    if (parts.length) blocks.push(tagged(paragraph(...parts.flatMap((part, index) => index ? [span('; ', 'api-separator'), span(part, 'api-constraint')] : [span(part, 'api-constraint')])), 'api-schema-constraints'));
    if (schema.description && !sameProse(schema.description, omitRootDescription)) blocks.push(...parsePlainMarkdown(schema.description));
    if (schema.enum) {
      const options = paragraph(span('Available options: ', 'api-enum-label'), ...schema.enum.flatMap((value: unknown, index: number) => index ? [span(', ', 'api-separator'), inline(JSON.stringify(value))] : [inline(JSON.stringify(value))]));
      options.data = { hProperties: { className: ['api-enum-options'] } };
      blocks.push(options);
    }
    if (schema.example !== undefined) blocks.push(tagged(paragraph(text('Example (authored in OpenAPI):')), 'api-schema-label'), code(JSON.stringify(schema.example, null, 2), 'json'));
    for (const [index, example] of (schema.examples ?? []).entries()) blocks.push(tagged(paragraph(text(`Example ${index + 1} (authored in OpenAPI):`)), 'api-schema-label'), code(JSON.stringify(example, null, 2), 'json'));
    if (schema.discriminator) {
      const discriminator = schema.discriminator;
      if (typeof discriminator.propertyName !== 'string' || (discriminator.mapping && (typeof discriminator.mapping !== 'object' || Object.values(discriminator.mapping).some(value => typeof value !== 'string')))) throw new Error(`Invalid discriminator in ${source.file}`);
      blocks.push(paragraph(text('Discriminator property: '), inline(discriminator.propertyName)));
      if (discriminator.mapping) blocks.push(list(Object.entries<string>(discriminator.mapping).map(([name, reference]) => [paragraph(inline(name), text(' selects '), inline(reference))])));
    }
    for (const composition of ['allOf', 'oneOf', 'anyOf']) if (schema[composition]) {
      blocks.push(tagged(paragraph(text(composition === 'allOf' ? 'All of these parts apply:' : composition === 'oneOf' ? scope[0] === 'response' ? 'The response has exactly one of these shapes:' : 'Use exactly one of these shapes:' : 'Use one or more of these shapes:')), 'api-schema-label'));
      for (const [index, child] of schema[composition].entries()) {
        const label = typeof child.title === 'string' && child.title.trim() ? child.title.trim() : `${composition === 'allOf' ? 'Part' : 'Shape'} ${index + 1}`;
        let shape = child;
        if (child && typeof child === 'object') {
          const { title: _title, ...withoutTitle } = child;
          shape = withoutTitle;
        }
        const detail = await this.schemaBlocks(source, shape, schemaVersion, depth + 1, seen, scope, [...trail, composition, String(index + 1)]);
        const resolved = await this.deref(source, child);
        const count = Object.keys(resolved.value?.properties ?? {}).length;
        const metadata = count ? ` · ${count} ${count === 1 ? 'property' : 'properties'}` : '';
        blocks.push({ type: 'docApiVariant', data: { hName: 'div', hProperties: { className: ['api-schema-variant'] } }, children: [tagged(paragraph({ type: 'strong', children: [text(label)] }, ...(metadata ? [span(metadata, 'api-variant-count')] : [])), 'api-schema-variant-title'), ...detail] });
      }
    }
    if (schema.items !== undefined) {
      blocks.push(tagged(paragraph(text('Array items:')), 'api-schema-label'));
      blocks.push(...await this.schemaBlocks(source, schema.items, schemaVersion, depth + 1, seen, scope, [...trail, 'items']));
    }
    const entries = Object.entries<any>(schema.properties ?? {});
    if (entries.length) {
      const items: any[][] = [];
      for (const [name, child] of entries) {
        const required = schema.required?.includes(name) ?? false;
        const nullable = await this.schemaAllowsNull(source, child);
        const requirement = scope[0] === 'response' ? (required ? 'always present' : 'may be absent') : (required ? 'required' : 'optional');
        const anchor = anchorFor([...scope, ...trail, name]);
        const typeLabel = await this.schemaTypeLabel(source, child);
        const fieldPath = [...trail, name].join('.');
        const pathHint = { type: 'docApiPathHint', data: { hName: 'span', hProperties: { className: ['api-field-path'], 'data-path': fieldPath, 'aria-label': `Field path: ${fieldPath}`, tabIndex: 0 } }, children: [text('ⓘ')] };
        const field = paragraph(inline(name), text(' '), { ...inline(typeLabel), data: { hProperties: { className: ['api-field-type'] } } }, text(' '), { type: 'strong', children: [text(requirement)] }, ...(nullable ? [text(' '), { type: 'strong', data: { hProperties: { className: ['nullability-badge'] } }, children: [text('nullable')] }] : []), text(' '), pathHint);
        field.data = { hProperties: { id: anchor, 'data-field': '', 'data-presence': required ? 'present' : 'optional' } };
        const nested = await this.schemaBlocks(source, child, schemaVersion, depth + 1, seen, scope, [...trail, name], undefined, true);
        items.push([field, ...nested]);
      }
      blocks.push(disclosure(`${entries.length} ${entries.length === 1 ? 'property' : 'properties'}`, [list(items)], depth <= 5, true));
    }
    if (schema.additionalProperties !== undefined) {
      if (typeof schema.additionalProperties === 'boolean') blocks.push(paragraph(text(`Additional properties: ${schema.additionalProperties ? 'allowed' : 'not allowed'}.`)));
      else {
        blocks.push(tagged(paragraph(text('Additional-key schema:')), 'api-schema-label'));
        blocks.push(...await this.schemaBlocks(source, schema.additionalProperties, schemaVersion, depth + 1, seen, scope, [...trail, 'additionalProperties']));
      }
    }
    return blocks;
  }
}
