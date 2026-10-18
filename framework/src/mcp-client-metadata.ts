import { CLIENT_INFO_META_KEY, type ServerContext } from '@modelcontextprotocol/server';

export type McpClientMetadata = {
  client?: { name: string; version?: string; source: 'client_metadata' | 'user_agent' | 'vendor_header' | 'client_marker'; verified: false };
  model?: { name: string; source: 'client_metadata'; verified: false };
};
const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const clientNames: Array<[RegExp, string]> = [
  [/^(?:codex|openai-codex|codex-cli|codex-mcp-client)$/i, 'codex'],
  [/^(?:claude-code|claude_code|claude code)$/i, 'claude-code'],
  [/^(?:claude-desktop|claude desktop)$/i, 'claude-desktop'],
  [/^cursor$/i, 'cursor'], [/^(?:vscode|visual studio code)$/i, 'vscode'],
  [/^windsurf$/i, 'windsurf'], [/^cline$/i, 'cline'], [/^roo-code$/i, 'roo-code'],
  [/^gemini-cli$/i, 'gemini-cli'], [/^opencode$/i, 'opencode'],
];
const knownClient = (value: unknown) => typeof value === 'string' && value.length <= 64 ? clientNames.find(([pattern]) => pattern.test(value))?.[1] : undefined;
const version = (value: unknown) => typeof value === 'string' && /^\d{1,4}(?:\.\d{1,6}){0,3}(?:-(?:alpha|beta|rc|dev|canary)(?:[.-]?\d{1,6})?)?$/.test(value) && value.length <= 32 ? value : undefined;
export function normalizeMcpClient(name: unknown, clientVersion?: unknown): McpClientMetadata['client'] {
  const normalized = knownClient(name);
  return normalized ? { name: normalized, ...(version(clientVersion) ? { version: version(clientVersion) } : {}), source: 'client_metadata', verified: false } : undefined;
}

// Deliberately finite: a family prefix is not enough to exclude private labels.
// Extend this registry when supporting additional public model labels.
const modelNames = new Set([
  'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-codex', 'gpt-5.1', 'gpt-5.1-codex',
  'gpt-5.2', 'gpt-5.2-codex', 'gpt-5.3-codex', 'gpt-5.4', 'gpt-6', 'gpt-6.1',
  'o1', 'o3', 'o3-mini', 'o4-mini',
  'claude-sonnet-4', 'claude-sonnet-4-5', 'claude-sonnet-4-6',
  'claude-opus-4', 'claude-opus-4-1', 'claude-opus-4-5', 'claude-opus-4-6', 'claude-haiku-4-5',
  'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
  'gemini-3-pro', 'gemini-3-flash', 'gemini-3-pro-preview', 'gemini-3-flash-preview',
  'deepseek-chat', 'deepseek-reasoner', 'deepseek-v3', 'deepseek-v3.1', 'deepseek-v3.2',
  'deepseek-r1', 'deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4.1-flash',
  'mistral-large', 'mistral-small', 'codestral', 'grok-3', 'grok-3-mini', 'grok-4',
  'command-r', 'command-r-plus', 'command-a',
]);
export function safeMcpModelName(value: unknown) {
  if (typeof value !== 'string' || value.length > 96) return;
  const normalized = value.toLowerCase().replace(/^(?:openai|anthropic|google|meta|mistral|xai|cohere|deepseek)\//, '');
  return modelNames.has(normalized) ? normalized : undefined;
}

/** Only bounded labels leave this function. No raw headers, full metadata, or session cache. */
export function mcpClientMetadata(context: ServerContext, legacyClient?: unknown): McpClientMetadata {
  const result: McpClientMetadata = {};
  const info = record(record(context.mcpReq.envelope)?.[CLIENT_INFO_META_KEY]) ?? record(legacyClient);
  const name = knownClient(info?.name);
  if (name) result.client = { name, ...(version(info?.version) ? { version: version(info?.version) } : {}), source: 'client_metadata', verified: false };
  const headers = context.http?.req?.headers;
  if (!result.client && headers) {
    const vendor = headers.get('x-anthropic-client');
    if (vendor && vendor.length <= 128 && /^(?:claude-code|claude_code)(?:\/\d[\w.-]*)?$/i.test(vendor)) result.client = { name: 'claude-code', source: 'vendor_header', verified: false };
    const agent = headers.get('user-agent');
    if (!result.client && agent && agent.length <= 512) {
      // Recognize product tokens; discard the original header, including any paths or device details.
      const token = agent.match(/(?:^|[\s;(])((?:codex|codex-cli|claude-code|cursor|vscode|windsurf|cline|roo-code|gemini-cli|opencode))\/\d[\w.-]*(?=$|[\s;)])/i)?.[1];
      const normalized = knownClient(token);
      if (normalized) result.client = { name: normalized, source: 'user_agent', verified: false };
    }
  }
  // Presence identifies a claimed client only. Never retain or hash its session ID.
  const openCodeSession = context.mcpReq._meta?.['ai.opencode/sessionID'];
  if (!result.client && typeof openCodeSession === 'string' && /^ses_[a-zA-Z0-9]{1,128}$/.test(openCodeSession)) result.client = { name: 'opencode', source: 'client_marker', verified: false };
  const turn = record(context.mcpReq._meta?.['x-codex-turn-metadata']);
  const model = safeMcpModelName(turn?.model);
  if (model) result.model = { name: model, source: 'client_metadata', verified: false };
  return result;
}
