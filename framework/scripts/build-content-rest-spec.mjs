// Keep HTTP metadata aligned with the published export schema.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const schema = JSON.parse(await readFile(new URL('../schemas/content-export.schema.json', import.meta.url), 'utf8'));
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const rewrite = value => JSON.parse(JSON.stringify(value).replaceAll('#/$defs/', '#/components/schemas/'));
const object = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const schemas = { ...rewrite(schema.$defs), ContentResource: rewrite(schema.properties.resources.items),
  ResourceKey: { type: 'string', pattern: '^k_[A-Za-z0-9_-]+$', description: 'Opaque stable typed-reference key. Use the returned key. It is k_ followed by unpadded base64url of UTF-8 JSON for ["page",documentId], ["section",documentId,sectionId], or ["snippet",id]. Publication and revision are separate selectors.' },
  Error: object({ error: object({ code: { enum: ['invalid_request', 'not_found', 'unsupported_format', 'stale_revision', 'method_not_allowed', 'internal_error'] }, message: { type: 'string' } }) }),
};
const identity = { schemaVersion: { const: 1 }, revision: ref('digest'), publication: ref('publication') };
schemas.ResourceEntry = object({ key: ref('ResourceKey'), resource: ref('ContentResource') });
schemas.ResourceList = object({ ...identity, resources: { type: 'array', items: ref('ResourceEntry') } });
schemas.ResourceMetadata = object({ ...identity, key: ref('ResourceKey'), resource: ref('ContentResource') });
// Illustrative complete payloads: representation digests and byte counts match
// these examples, while the revision is not a deployed or locally served release.
const hash = text => createHash('sha256').update(text).digest('hex');
const examplePublication = { channel: 'production', version: 'current', language: 'en' };
const exampleRevision = hash('illustrative-reviewed-content-revision');
const exampleContent = { html: '<p>Contact support.</p>\n', markdown: 'Contact support.\n' };
const exampleResource = { ref: { kind: 'page', documentId: 'guide.billing' }, publication: examplePublication, title: 'Billing', summary: 'Contact billing support.', type: 'guide',
  representations: Object.fromEntries(Object.entries(exampleContent).map(([format, content]) => [format, { path: `content/resource-example.${format === 'html' ? 'html' : 'md'}`, mediaType: format === 'html' ? 'text/html' : 'text/markdown', bytes: Buffer.byteLength(content), digest: hash(content), anchors: [], links: [] }])), assets: [], externalDependencies: [] };
const exampleKey = 'k_' + Buffer.from(JSON.stringify(['page', 'guide.billing'])).toString('base64url');
const exampleIdentity = { schemaVersion: 1, revision: exampleRevision, publication: examplePublication };
const example = value => ({ illustrative: { summary: 'Illustrative content; discover keys and revision from your own host.', value } });
const parameters = Object.fromEntries(['channel', 'version', 'language'].map(name => [name, { name, in: 'query', required: true, description: `Exact publication ${name}. No default or fallback.`, example: examplePublication[name], schema: { type: 'string', minLength: 1, maxLength: 2048 } }]));
parameters.revision = { name: 'revision', in: 'query', required: true, description: 'Exact revision returned by the list endpoint. A different revision returns 409; it never silently reads newer content.', schema: ref('digest'), example: exampleRevision };
parameters.optionalRevision = { ...parameters.revision, required: false, description: 'Omit to discover the currently supplied snapshot. Supply to require that exact revision.' };
parameters.key = { name: 'key', in: 'path', required: true, schema: ref('ResourceKey'), example: exampleKey };
parameters.format = { name: 'format', in: 'path', required: true, schema: { type: 'string', enum: ['html', 'markdown'] }, example: 'markdown' };
parameters.ifNoneMatch = { name: 'If-None-Match', in: 'header', required: false, description: 'An ETag, comma-separated ETags, or *. Weak comparison is supported for GET and HEAD.', schema: { type: 'string' } };
const param = name => ({ $ref: `#/components/parameters/${name}` });
const headers = { ETag: { description: 'Strong SHA-256 validator of the exact UTF-8 response bytes.', schema: { type: 'string' } }, 'Cache-Control': { description: 'Unpinned discovery uses no-cache. Revision-pinned success uses public, max-age=31536000, immutable. Errors use no-store.', schema: { type: 'string' } } };
const errorDescriptions = { 400: 'invalid_request: missing, duplicate, unknown, or malformed query parameter.', 404: 'not_found: unknown publication, resource, or route.', 405: 'method_not_allowed: only GET and HEAD are supported; Allow lists both.', 406: 'unsupported_format: unsupported or unavailable representation format.', 409: 'stale_revision: revision unavailable, or source bytes no longer match the pinned snapshot.', 500: 'internal_error: the source could not complete the request.' };
const errors = Object.fromEntries(Object.entries(errorDescriptions).map(([status, description]) => [status, { description, headers: { 'Cache-Control': { schema: { const: 'no-store' } }, ...(status === '405' ? { Allow: { schema: { const: 'GET, HEAD' } } } : {}) }, content: { 'application/json': { schema: ref('Error') } } }]));
const make = (id, summary, names, content) => {
  const get = { operationId: id, summary, description: 'Query parameters are single-valued; unknown or duplicate parameters are rejected. Publication and revision checks run before conditional ETag checks. No pagination, search, writes, authentication, or cross-origin policy is supplied by this reference adapter.', parameters: [...['channel', 'version', 'language', ...names, 'ifNoneMatch'].map(param)], responses: { 200: { description: 'The selected resource or inventory.', headers, content }, 304: { description: 'The validated selected response matches If-None-Match. No response body.', headers }, ...errors } };
  const head = structuredClone(get); head.operationId = id + 'Head'; head.summary = summary + ' headers';
  for (const response of Object.values(head.responses)) delete response.content;
  head.description += ' HEAD returns the GET status and headers without a response body.';
  return { get, head };
};
const spec = { openapi: '3.1.0', info: { title: 'Shoalrun content REST API', version: '1.0.0', description: 'Read-only delivery of reviewed content snapshots. This is HTTP contract v1, independent of the Shoalrun package version. The reference adapter serves one supplied revision per publication. It retains no revision history. Exported HTML/Markdown bytes are unchanged: host their original static asset and link mount alongside the API.' }, servers: [{ url: '/content/v1' }], paths: {
  '/resources': make('listContentResources', 'List resource metadata', ['optionalRevision'], { 'application/json': { schema: ref('ResourceList'), examples: example({ ...exampleIdentity, resources: [{ key: exampleKey, resource: exampleResource }] }) } }),
  '/resources/{key}': make('getContentResource', 'Read resource metadata', ['revision', 'key'], { 'application/json': { schema: ref('ResourceMetadata'), examples: example({ ...exampleIdentity, key: exampleKey, resource: exampleResource }) } }),
  '/resources/{key}/representations/{format}': make('getContentRepresentation', 'Read HTML or Markdown', ['revision', 'key', 'format'], { 'text/html': { schema: { type: 'string' }, examples: example(exampleContent.html) }, 'text/markdown': { schema: { type: 'string' }, examples: example(exampleContent.markdown) } }),
}, components: { schemas, parameters }, externalDocs: { description: 'HTTP conditional request semantics', url: 'https://www.rfc-editor.org/rfc/rfc9110.html#name-if-none-match' } };
const file = new URL('../schemas/content-rest.openapi.json', import.meta.url);
const output = JSON.stringify(spec, null, 2) + '\n';
if (process.argv.slice(2).some(arg => arg !== '--write')) throw new Error('Usage: node build-content-rest-spec.mjs [--write]');
if (process.argv.includes('--write')) await writeFile(file, output);
else if (await readFile(file, 'utf8') !== output) throw new Error('Content REST specification is stale. Run node framework/scripts/build-content-rest-spec.mjs --write.');
console.log('Content REST OpenAPI contract is current.');
