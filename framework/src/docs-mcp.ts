import { mcpClientMetadata } from './mcp-client-metadata.js';
import type { ServerContext, StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { attemptAnalytics, type McpAnalyticsEvent } from './mcp-analytics.js';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { bundledDocumentation, DocumentationError, documentationFailure, getDocumentationOutline, getDocumentationSection, getDocumentationPage, searchDocumentation } from './documentation-core.js';

export function createDocsMcpServer(directory = bundledDocumentation, publication?: { channel: string; version: string; language: string }, analytics?: { clientMetadata?: boolean; buildId: string; capture(event: McpAnalyticsEvent): unknown }, discardAnalyticsArguments = false) {
  const server = new McpServer({ name: 'shoalrun-docs', version: '0.0.0' }, { maxToolInputElements: 1024 });
  const scope = <T extends { channel?: string; version?: string; language?: string }>(filters: T): T => {
    if (!publication) return filters;
    for (const key of ['channel', 'version', 'language'] as const) if (filters[key] !== undefined && filters[key] !== publication[key]) throw new DocumentationError('invalid_input', 'This MCP endpoint serves a different publication');
    return { ...filters, ...publication };
  };
  const coordinate = (key: 'channel' | 'version' | 'language') => z.string().optional().describe(publication ? `This endpoint serves ${key}=${publication[key]}; omit this argument or pass that exact value.` : `Select the documentation ${key}.`);
  const options = {
    channel: coordinate('channel'), version: coordinate('version'), language: coordinate('language'),
    maxTokens: z.number().int().min(256).max(100_000).default(4096).describe('Maximum serialized result tokens, counted with cl100k_base, including metadata.'),
  };
  // A client may cache the instrumented schema after withdrawing consent.
  // Discard only analytics-owned fields while preserving strict tool validation.
  const schema = <T extends z.ZodObject>(original: T): StandardSchemaWithJSON<z.input<T>, z.output<T>> => {
    if (!discardAnalyticsArguments) return original;
    return { '~standard': { ...original['~standard'], validate(value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const { context: _context, llm_model: _model, conversation_id: _conversation, ...clean } = value as Record<string, unknown>;
        return original['~standard'].validate(clean);
      }
      return original['~standard'].validate(value);
    } } };
  };
  const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  const respond = async (tool: string, context: ServerContext, operation: () => Promise<object>) => {
    const start = performance.now();
    let isError = false;
    let errorCode: string | undefined;
    let pageId: string | undefined;
    let sectionId: string | undefined;
    try {
      const result = await operation();
      const data = result as { id?: string; section?: { id?: string } };
      pageId = data.id;
      sectionId = data.section?.id;
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent: result as Record<string, unknown> };
    } catch (error) {
      const result = documentationFailure(error);
      isError = true;
      errorCode = result.error.code;
      return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent: result };
    } finally {
      if (analytics && publication) await attemptAnalytics(() => analytics.capture({ name: 'mcp_tool_call', ...(analytics.clientMetadata ? mcpClientMetadata(context, server.server.getClientVersion()) : {}), tool, durationMs: Math.max(0, performance.now() - start), isError, ...(errorCode ? { errorCode } : {}), ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}), buildId: analytics.buildId, publication: { ...publication } }));
    }
  };
  server.registerTool('search_docs', {
    description: 'Search the documentation by keyword. Partial fallback favors field relevance among results within one meaningful term of the best coverage (at least two matched). Complete lexical matches normally precede partial fallback; stronger near-complete matches can outrank body-only complete matches (matchMode: mixed). Search covers titles, summaries, headings, and bounded article text. For each chosen result, call read.tool with read.arguments exactly. Section recommendations require an author declaration of self-contained content. The result markdownUrl fetches the recommended section or full page; pageMarkdownUrl is always the full-page fallback. Do not guess a section ID or request an outline first.',
    inputSchema: schema(z.object({ query: z.string(), limit: z.number().int().min(1).max(100).default(8), ...options }).strict()),
    annotations,
  }, ({ query, ...filters }, context) => respond('search_docs', context, () => searchDocumentation(directory, query, scope(filters))));
  server.registerTool('get_page', {
    description: 'Read a published Markdown page by the stable document ID returned from search_docs. Includes all reader-marked sections. Check budget.truncated; increase maxTokens if needed.',
    inputSchema: schema(z.object({ id: z.string(), ...options }).strict()),
    annotations,
  }, ({ id, ...filters }, context) => respond('get_page', context, () => getDocumentationPage(directory, id, scope(filters))));
  server.registerTool('get_outline', {
    description: 'List top-level Markdown sections, exact digests, sizes, and fetch URLs for a page. IDs can change on rename or reorder; retain publication and parent digest when citing.',
    inputSchema: schema(z.object({ id: z.string(), ...options }).strict()), annotations,
  }, ({ id, ...filters }, context) => respond('get_outline', context, () => getDocumentationOutline(directory, id, scope(filters))));
  server.registerTool('get_section', {
    description: 'Read one complete Markdown section by page ID and section ID from get_outline. Includes parent preamble and all nested reader-marked content; other sections may contain prerequisites. Increase maxTokens if it does not fit; never truncates blocks.',
    inputSchema: schema(z.object({ id: z.string(), section: z.string(), ...options }).strict()), annotations,
  }, ({ id, section, ...filters }, context) => respond('get_section', context, () => getDocumentationSection(directory, id, section, scope(filters))));
  return server;
}

export function serveDocsMcp(directory = bundledDocumentation) {
  return serveStdio(() => createDocsMcpServer(directory), { onerror: error => process.stderr.write(`MCP: ${error.message}\n`) });
}
