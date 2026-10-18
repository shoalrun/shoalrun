import type { McpServer, ServerContext } from '@modelcontextprotocol/server';
import type { McpClientMetadata } from './mcp-client-metadata.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type McpAnalyticsEvent = McpClientMetadata & {
  name: 'mcp_tool_call';
  tool: string;
  durationMs: number;
  isError: boolean;
  errorCode?: string;
  pageId?: string;
  sectionId?: string;
  buildId: string;
  publication: { channel: string; version: string; language: string };
};
export type McpAnalyticsContext = {
  buildId: string;
  publication: McpAnalyticsEvent['publication'];
  clientMetadata: boolean;
  intent: boolean;
  conversationIds: boolean;
  metadata(context: ServerContext): McpClientMetadata;
  client(name: unknown, version?: unknown): McpClientMetadata['client'];
  resource(id: unknown, section: unknown): Promise<{ pageId?: string; sectionId?: string }>;
  modelName(value: unknown): string | undefined;
};
export type McpAnalyticsAdapter = {
  capture(event: McpAnalyticsEvent): void | Promise<void>;
  instrument?(server: McpServer, context: McpAnalyticsContext): boolean | Promise<boolean>;
  flush?(): void | Promise<void>;
};

// Analytics has its own small deadline and cannot reject a documentation request.
export async function attemptAnalytics(operation: () => unknown, milliseconds = 1000) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), milliseconds); }),
    ]);
  } catch { process.stderr.write('MCP analytics delivery failed or timed out\n'); }
  finally { clearTimeout(timeout); }
}

export function mcpAnalyticsLoader(directory: string, module: string | undefined) {
  let pending: Promise<McpAnalyticsAdapter | undefined> | undefined;
  return () => {
    if (!module) return Promise.resolve(undefined);
    pending ??= (async () => {
      const adapter = await import(pathToFileURL(path.join(directory, module)).href);
      if (typeof adapter.capture !== 'function' || adapter.instrument !== undefined && typeof adapter.instrument !== 'function' || adapter.flush !== undefined && typeof adapter.flush !== 'function') throw new Error('Invalid MCP analytics adapter');
      return adapter as McpAnalyticsAdapter;
    })().catch(() => {
      process.stderr.write('MCP analytics adapter could not load\n');
      return undefined;
    });
    return pending;
  };
}
