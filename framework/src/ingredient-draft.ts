import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { ApiReader } from './api.js';
import { explain, loadConfig } from './config.js';
import { defaultLanguage } from './frontmatter.js';
import { ingredientWorkflow, type IngredientWorkflow } from './ingredient-workflow.js';

type IngredientSpec = {
  schemaVersion: 1;
  id: string;
  title: string;
  summary: string;
  slug: string;
  operation: string;
  requestExample: string;
  workflow?: IngredientWorkflow;
};

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function parseSpec(value: unknown): IngredientSpec {
  const fields = ['schemaVersion', 'id', 'title', 'summary', 'slug', 'operation', 'requestExample'];
  if (!object(value) || value.schemaVersion !== 1 || Object.keys(value).some(key => ![...fields, 'workflow'].includes(key))) throw new Error('Ingredient spec needs schemaVersion: 1 and only supported fields');
  for (const field of fields.slice(1)) if (typeof value[field] !== 'string' || !value[field].trim()) throw new Error(`Ingredient spec needs ${field}`);
  if (!/^\/[a-z0-9/-]+$/.test(value.slug as string) || (value.slug as string).includes('//') || (value.slug as string).split('/').includes('..')) throw new Error('Ingredient slug must be a lowercase absolute path');
  const workflow = ingredientWorkflow(value.workflow, 'Ingredient workflow');
  return { ...value, ...(workflow ? { workflow } : {}) } as IngredientSpec;
}

function fence(content: string, language: string): string {
  const longest = Math.max(0, ...[...content.matchAll(/`+/g)].map(match => match[0].length));
  const marker = '`'.repeat(Math.max(3, longest + 1));
  return `${marker}${language}\n${content.trimEnd()}\n${marker}`;
}

export async function renderIngredientDraft(configFile: string, specFile: string) {
  const configPath = path.resolve(configFile);
  const root = path.dirname(configPath);
  const loaded = await loadConfig(configPath);
  const config: any = loaded.value;
  const specSource = await readFile(specFile, 'utf8');
  const document = YAML.parseDocument(specSource, { uniqueKeys: true });
  if (document.errors.length) throw new Error(`${specFile}: ${document.errors.map(error => error.message).join('; ')}`);
  const spec = parseSpec(document.toJS());
  const matching = Object.entries<any>(config.apis ?? {}).flatMap(([apiId, api]) => (api.operations ?? []).filter((operation: any) => operation.id === spec.operation).map((operation: any) => ({ apiId, api, operation })));
  if (matching.length !== 1) throw new Error(`Ingredient operation ${spec.operation} must name one explicitly configured API operation`);
  const { apiId, api, operation } = matching[0];
  if (api.source?.kind !== 'file' || typeof api.source.path !== 'string') throw new Error(`Ingredient operation ${spec.operation} needs a local OpenAPI source in the default publication`);
  const origin = explain(loaded, `apis.${apiId}.source.path`).source.file;
  const source = path.resolve(path.dirname(origin), api.source.path);
  const reader = new ApiReader(root);
  const details = await reader.operation(source, operation.sourceOperationId, spec.operation);
  const sourceDigest = digest((await Promise.all([...reader.dependencies].sort().map(async file => `${path.relative(root, file)}\n${await readFile(file, 'utf8')}`))).join('\n'));
  if (details.webhook) throw new Error('Webhook ingredients need a receiver flow; this draft generator supports outgoing requests only');
  const requests = details.examples.filter(example => example.location === 'request' && example.key === spec.requestExample);
  if (requests.length !== 1 || !requests[0].curl) throw new Error(`Request example ${spec.requestExample} needs one inline example with a generated cURL command`);
  const response = details.examples.find(example => example.location === 'response' && /^2\d\d$/.test(example.status ?? '') && example.value !== undefined);
  const defaults = config.publications?.defaults ?? {};
  if (!defaults.channel || !defaults.version) throw new Error('Ingredient draft needs a default channel and version');
  const language = defaults.language ?? defaultLanguage(config);
  const header = {
    id: spec.id, title: spec.title, summary: spec.summary, type: 'ingredient', slug: spec.slug,
    channel: defaults.channel, version: defaults.version, language,
    operations: [spec.operation], access: { policy: 'draft' }, ...(spec.workflow ? { workflow: spec.workflow } : {})
  };
  const reference = operation.reference ? `[${details.method.toUpperCase()} ${details.route}](doc:${operation.reference})` : `\`${details.method.toUpperCase()} ${details.route}\``;
  const body = [
    `> Generated draft from \`${path.relative(root, source)}\` (${sourceDigest.slice(0, 12)}). Review every instruction before publishing.`,
    spec.summary,
    '## Before you start',
    '[[TODO: State the credentials, tools, and setup needed to run this request. The OpenAPI example does not prove they work.]]',
    '## Send the request',
    `The following cURL command comes from the \`${spec.requestExample}\` request example for ${reference}. Check its host, authentication, and values before using it.`,
    fence(requests[0].curl, 'sh'),
    '## Expected response',
    response ? `The OpenAPI source gives this example for HTTP ${response.status}. It is an example, not a verified live result.\n\n${fence(JSON.stringify(response.value, null, 2), response.mediaType?.includes('json') ? 'json' : 'text')}` : '[[TODO: Add a verified success response; the OpenAPI source has no inline 2xx response example.]]',
    '## Check it worked',
    '[[TODO: Give a concrete check against a real environment, including the value that means success and what to inspect if it fails.]]'
  ].join('\n\n');
  return { content: `---\n${YAML.stringify(header).trimEnd()}\n---\n\n${body}\n`, source: path.relative(root, source), sourceDigest };
}

export async function writeIngredientDraft(configFile: string, specFile: string, outputFile: string, checkOnly = false) {
  const result = await renderIngredientDraft(configFile, specFile);
  const output = path.resolve(outputFile);
  if (checkOnly) {
    const current = await readFile(output, 'utf8').catch(error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    });
    return { status: current === undefined ? 'would-create' : current === result.content ? 'unchanged' : 'would-change', output, ...result };
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, result.content, { flag: 'wx' });
  return { status: 'created', output, source: result.source, sourceDigest: result.sourceDigest };
}
