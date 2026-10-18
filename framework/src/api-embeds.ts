import { code, heading, link, paragraph, parsePlainMarkdown, text } from './content.js';
import type { ApiReader, NamedExample } from './api.js';

export type ApiEmbedRequest = { component: 'ApiExample' | 'ApiSchema'; operation?: string; api?: string; kind?: 'request' | 'response'; mediaType?: string; status?: string; example?: string; schema?: string };
export type ApiEmbedUse = ApiEmbedRequest & { sourceFile: string; documentKey: string };

export function apiEmbedComponent(node: any, file: string): any {
  const fail = (message: string): never => { throw new Error(`${file}: <${node.name}> ${message}`); };
  if (node.type !== 'mdxJsxFlowElement' || node.children?.length) fail('must be a standalone empty element');
  const allowed = node.name === 'ApiExample' ? ['operation', 'kind', 'mediaType', 'status', 'example'] : ['operation', 'api', 'kind', 'mediaType', 'status', 'schema'];
  const request: Record<string, string> = { component: node.name };
  for (const attribute of node.attributes ?? []) {
    if (attribute.type !== 'mdxJsxAttribute' || !allowed.includes(attribute.name) || Object.hasOwn(request, attribute.name)) fail(`has unknown or duplicate attribute ${attribute.name ?? '(spread)'}`);
    if (typeof attribute.value !== 'string' || !attribute.value.trim()) fail(`${attribute.name} must be nonempty literal text`);
    request[attribute.name] = attribute.value;
  }
  const standalone = node.name === 'ApiSchema' && !!request.api;
  if (standalone) {
    if (!request.schema || request.operation || request.kind || request.mediaType || request.status) fail('api and schema select a standalone schema or field; do not combine them with operation, kind, mediaType, or status');
  } else {
    for (const key of ['operation', 'kind', 'mediaType', ...(node.name === 'ApiExample' ? ['example'] : [])]) if (!request[key]) fail(`needs ${key}`);
    if (!['request', 'response'].includes(request.kind)) fail('kind must be request or response');
    if (request.kind === 'response' && !request.status) fail('needs status for a response');
    if (request.kind === 'request' && request.status) fail('status applies only to a response');
  }
  if (request.schema && (!/^(?:\.\.?\/[^#]+)?#\//.test(request.schema) || request.schema.includes('://'))) fail('schema must be a local OpenAPI $ref');
  return { type: 'apiEmbed', request: request as ApiEmbedRequest, sourceFile: file };
}

function exampleBlocks(example: NamedExample): any[] {
  const context = `${example.location}${example.status ? ` ${example.status}` : ''}; ${example.mediaType}`;
  const blocks = [heading(3, example.title), paragraph(text(`OpenAPI ${context}. Example key: ${example.key}. ${example.provenance}.`))];
  if (example.description) blocks.push(...parsePlainMarkdown(example.description));
  if (example.externalValue) blocks.push(paragraph(text('External example: '), link(example.externalValue, example.externalValue)));
  else blocks.push(code(typeof example.value === 'string' && example.mediaType?.startsWith('text/') ? example.value : JSON.stringify(example.value, null, 2), example.mediaType?.startsWith('text/') && typeof example.value === 'string' ? 'text' : 'json'));
  return blocks;
}

export async function resolveApiEmbedTree(tree: any, reader: ApiReader, sourceFor: (operation: string) => { file: string; sourceOperationId: string }, sourceForApi: (api: string) => { file: string }, documentKey: string, uses: ApiEmbedUse[]): Promise<any> {
  const walk = async (node: any): Promise<any[]> => {
    if (node.type !== 'apiEmbed') {
      if (!node.children) return [node];
      const children: any[] = [];
      for (const child of node.children) children.push(...await walk(child));
      return [{ ...node, children }];
    }
    const request = node.request as ApiEmbedRequest;
    let binding: { file: string; sourceOperationId?: string };
    try { binding = request.api ? sourceForApi(request.api) : sourceFor(request.operation!); }
    catch (error) { throw new Error(`${node.sourceFile}: <${request.component}> ${(error as Error).message}`); }
    let blocks: any[];
    if (request.component === 'ApiExample') {
      const generated = await reader.operation(binding.file, binding.sourceOperationId!, request.operation);
      const selected = generated.examples.filter(example => example.location === request.kind && example.status === (request.status ?? null) && example.mediaType === request.mediaType && example.key === request.example);
      if (selected.length !== 1) throw new Error(`${node.sourceFile}: <ApiExample> cannot find ${request.operation} ${request.kind}${request.status ? ` ${request.status}` : ''} ${request.mediaType} example ${request.example}`);
      blocks = exampleBlocks(selected[0]);
    } else {
      try { blocks = request.api ? await reader.schemaReference(binding.file, request.schema!, `${documentKey}-${uses.filter(use => use.documentKey === documentKey).length}`) : await reader.operationSchema(binding.file, binding.sourceOperationId!, request as { kind: 'request' | 'response'; mediaType: string; status?: string; schema?: string }, `${documentKey}-${uses.filter(use => use.documentKey === documentKey).length}`); }
      catch (error) { throw new Error(`${node.sourceFile}: <ApiSchema> ${(error as Error).message}`); }
    }
    uses.push({ ...request, sourceFile: node.sourceFile, documentKey });
    return blocks;
  };
  return (await walk(tree))[0];
}
