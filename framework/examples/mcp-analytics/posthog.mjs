import { PostHogMCP, instrument as instrumentMcp } from '@posthog/mcp';

// Set these on the Node host or Vercel function, never in a browser module.
const token = process.env.POSTHOG_PROJECT_TOKEN;
const client = token ? new PostHogMCP(token, {
  host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
  flushInterval: 0,
  captureModel: false,
  enableConversationId: false,
  enableExceptionAutocapture: false,
  before_send(event) {
    if (event.event !== '$mcp_tool_call') return null;
    const { $mcp_error_message, ...properties } = event.properties;
    return { ...event, properties };
  },
}) : undefined;

export function capture(event) {
  client?.captureToolCall({
    toolName: event.tool,
    durationMs: event.durationMs,
    isError: event.isError,
    errorType: event.errorCode,
    ...(event.model ? { llmModel: event.model.name, llmModelSource: event.model.source } : {}),
    properties: {
      $process_person_profile: false,
      $geoip_disable: true,
      ...(event.client ? {
        $mcp_client_name: event.client.name,
        ...(event.client.version ? { $mcp_client_version: event.client.version } : {}),
        client_source: event.client.source,
        client_identity_verified: false,
      } : {}),
      ...(event.model ? { model_identity_verified: false } : {}),
      $mcp_server_build: event.buildId,
      channel: event.publication.channel,
      version: event.publication.version,
      language: event.publication.language,
      ...(event.pageId ? { page_id: event.pageId } : {}),
      ...(event.sectionId ? { section_id: event.sectionId } : {}),
    },
  });
}

export async function flush() {
  await client?.flush();
}

// Optional interactive analytics. Returning true hands event capture to the SDK,
// so Shoalrun does not also emit a second tool-call event through capture().
export function instrument(server, options) {
  if (!client || !options.intent && !options.conversationIds) return false;
  // Fresh HTTP requests have not served tools/list. Supply the original schemas
  // so the SDK strips only its own analytics arguments before strict validation.
  const common = ['channel', 'version', 'language', 'maxTokens'];
  const fields = {
    search_docs: ['query', 'limit', ...common],
    get_page: ['id', ...common],
    get_outline: ['id', ...common],
    get_section: ['id', 'section', ...common],
  };
  instrumentMcp(server.server, client, {
    resolveOriginalTool: name => fields[name] ? {
      inputSchema: { type: 'object', properties: Object.fromEntries(fields[name].map(key => [key, {}])) },
    } : undefined,
    context: options.intent ? {
      description: "Choose exactly one documentation intent category: discovery, setup, troubleshooting, configuration, reference_lookup, comparison, migration, or other. Send only the category, never an explanation, names, credentials, or copied queries.",
    } : false,
    intentFallback: options.intent ? request => fallbackIntent(request.params?.name) : undefined,
    captureModel: options.clientMetadata,
    enableConversationId: options.conversationIds,
    enableExceptionAutocapture: false,
    serverBuild: options.buildId,
    logger: () => {},
    eventProperties: async (request, extra) => {
      const metadata = options.metadata(extra);
      const args = request.params?.arguments ?? {};
      const resource = await options.resource(args.id, args.section);
      return {
        safe_page_id: resource.pageId,
        safe_section_id: resource.sectionId,
        ...(metadata.client ? {
          safe_client_name: metadata.client.name,
          safe_client_version: metadata.client.version,
          client_source: metadata.client.source,
        } : {}),
      };
    },
    beforeSend: event => {
      // Allowlist properties instead of forwarding SDK arguments, results, or headers.
      if (event.event !== '$mcp_tool_call') return null;
      const raw = event.properties;
      const tool = raw.$mcp_tool_name;
      if (!['search_docs', 'get_page', 'get_outline', 'get_section'].includes(tool)) return null;
      const properties = {
        $mcp_interface: 'mcp',
        $mcp_source: 'posthog_mcp_analytics',
        $mcp_tool_name: tool,
        $mcp_resource_name: tool,
        $mcp_server_name: 'shoalrun-docs',
        $mcp_server_build: options.buildId,
        $process_person_profile: false,
        $geoip_disable: true,
        $mcp_is_error: raw.$mcp_is_error === true,
        ...(Number.isFinite(raw.$mcp_duration_ms) ? { $mcp_duration_ms: Math.max(0, raw.$mcp_duration_ms) } : {}),
        channel: options.publication.channel,
        version: options.publication.version,
        language: options.publication.language,
      };
      if (raw.$mcp_is_error !== true) {
        if (raw.safe_page_id) properties.page_id = raw.safe_page_id;
        if (raw.safe_section_id) properties.section_id = raw.safe_section_id;
      }
      const clientLabel = options.clientMetadata ? options.client(raw.safe_client_name ?? raw.$mcp_client_name, raw.safe_client_version ?? raw.$mcp_client_version) : undefined;
      if (clientLabel) {
        properties.$mcp_client_name = clientLabel.name;
        if (clientLabel.version) properties.$mcp_client_version = clientLabel.version;
        properties.client_source = raw.client_source ?? clientLabel.source;
        properties.client_identity_verified = false;
      }
      const model = options.clientMetadata ? options.modelName(raw.$mcp_llm_model) : undefined;
      if (model) {
        properties.$mcp_llm_model = model;
        properties.$mcp_llm_model_source = raw.$mcp_llm_model_source === 'client_metadata' ? 'client_metadata' : 'self_reported';
        properties.model_identity_verified = false;
      }
      if (options.intent) {
        const intent = intentCategory(raw.$mcp_intent);
        properties.$mcp_intent = intent ?? fallbackIntent(tool);
        properties.$mcp_intent_source = intent && raw.$mcp_intent_source === 'context_parameter' ? 'context_parameter' : 'inferred';
      }
      // Only keep the SDK's validated UUIDv7 handle and derived session identifier.
      const conversation = raw.$mcp_conversation_id;
      if (options.conversationIds && typeof conversation === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversation)) {
        properties.$mcp_conversation_id = conversation;

      }
      // Legacy clients can already carry the SDK's stateless session token.
      if (options.conversationIds && typeof raw.$session_id === 'string' && /^(?:ses_)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.$session_id)) properties.$session_id = raw.$session_id;
      return { event: '$mcp_tool_call', distinct_id: properties.$session_id ?? 'anonymous', properties, ...(event.timestamp ? { timestamp: event.timestamp } : {}) };
    },
  });
  return true;
}

const intentCategories = new Set([
  'discovery', 'setup', 'troubleshooting', 'configuration',
  'reference_lookup', 'comparison', 'migration', 'other',
]);
function fallbackIntent(tool) {
  return tool === 'search_docs' ? 'discovery'
    : ['get_page', 'get_outline', 'get_section'].includes(tool) ? 'reference_lookup' : 'other';
}
function intentCategory(value) {
  // Exact vocabulary only. Never redact, summarize, or retain arbitrary text.
  if (typeof value !== 'string' || value.length > 32) return;
  const category = value.trim().toLowerCase();
  return intentCategories.has(category) ? category : undefined;
}
