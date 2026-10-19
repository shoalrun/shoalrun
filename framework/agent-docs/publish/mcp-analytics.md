---
id: guide.mcp-analytics
title: Measure MCP tool usage
summary: Send optional server events to your analytics service without changing
  the documentation tools.
type: how-to
area: discovery
subarea: discovery-mcp
canonical: /publish/mcp-analytics
---

# Measure MCP tool usage

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > MCP > Measure MCP tool usage

**Updated: 2026-10-19.**

Add a server adapter to measure calls to your [HTTP MCP endpoint](https://www.shoalrun.com/publish/mcp.md). Analytics is off by default. Enabling MCP does not enable tracking, and the browser analytics setting does not count tool calls.

Your adapter chooses the service and sends the events. Shoalrun packages it for Node or the generated Vercel function. This setting does not instrument stdio, direct Markdown requests, or browser page views.

## Enable analytics

Add your server adapter to the MCP configuration. Readers do not need to change their client settings:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  publication: { channel: production, version: current, language: en }
  analytics:
    module: ./mcp-analytics/adapter.mjs
```

## Adapter exports

Create a local `.js` or `.mjs` server module. Export `capture(event)` and, if your service queues events, `flush()`:

```js title="mcp-analytics/adapter.mjs"
export async function capture(event) {
  // Send event to your service using its server SDK or HTTP API.
}

export async function flush() {
  // Send queued events before the HTTP response completes.
}
```

`capture` runs after each tool call, including failures. `flush` sends queued events before the response completes. Both can be asynchronous. Each has a one-second wait limit; analytics failures leave tool results unchanged. Set network timeouts in your adapter because Shoalrun cannot cancel a timed-out operation.

Module paths resolve relative to the config file. Use static imports and install SDK dependencies in your project. Keep credentials in the server environment, since adapter files are copied into the build.

## Event fields and service mappings

Every event has the following fields. Arguments, search text, returned content, raw request headers, IP addresses, and user identity are excluded:

| Field                 | Meaning                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| `name`                | Always `mcp_tool_call`.                                                          |
| `tool`                | `search_docs`, `get_page`, `get_outline`, or `get_section`.                      |
| `durationMs`          | Tool execution time before analytics delivery.                                   |
| `isError`             | Whether the documentation tool failed.                                           |
| `errorCode`           | Error category when the tool failed.                                             |
| `pageId`, `sectionId` | Published IDs when a successful read returns them.                               |
| `buildId`             | Identity of the served build.                                                    |
| `publication`         | Served `channel`, `version`, and `language`.                                     |
| `client`              | Optional normalized client name, bounded version, source, and `verified: false`. |
| `model`               | Optional model label, source, and `verified: false`.                             |

Map these fields to your service’s event and property names. A service with native MCP analytics may require its SDK or reserved event names. A general event service can receive `mcp_tool_call` with these properties. The PostHog example below uses its native MCP SDK.

Tool counts show usage, not comprehension. This adapter supplies no user or conversation identifier, so do not treat calls as unique people or agent sessions. Basic event capture leaves tool definitions and results unchanged. The optional SDK features below add analytics arguments and conversation handles.

## Optionally identify the client and model

The harness is the application running the agent, such as Cursor or Claude Code. To collect available client and model labels, explicitly enable `clientMetadata` in your adapter config:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  publication: { channel: production, version: current, language: en }
  analytics:
    module: ./mcp-analytics/adapter.mjs
    clientMetadata: true
```

This option defaults to `false`. Shoalrun recognizes a fixed set of client names from MCP identity metadata or product tokens in selected headers. It discards raw headers and unrelated metadata. Client versions must match a bounded numeric version format.

Model capture currently recognizes `model` in Codex’s `x-codex-turn-metadata`. It accepts labels from a fixed model-name registry, normalizes supported provider prefixes, and drops other values. A recognized family prefix alone does not qualify; custom deployment names and unknown models are omitted. Other clients may supply no supported model field; missing labels remain absent. The harness name does not establish which model it uses.

Both labels are unverified client claims. Use them for usage reports, never authentication, access control, or billing. No user fingerprint or cross-request identity cache is added.

OpenCode can also be recognized by the presence of its documented session metadata marker. Shoalrun discards that identifier; it records only the client label. Client-specific markers do not establish the model.

## Optionally collect intent and group calls

Intent describes why an agent called a tool. The PostHog adapter below supports separate `intent` and `conversationIds` switches, both off by default. Enable them alongside its module:

```yaml title="docs.config.yaml"
mcp:
  enabled: true
  access: public
  publication: { channel: production, version: current, language: en }
  analytics:
    module: ./mcp-analytics/posthog.mjs
    clientMetadata: true
    intent: true
    conversationIds: true
```

With intent enabled, the SDK adds a `context` argument asking for exactly one category: `discovery`, `setup`, `troubleshooting`, `configuration`, `reference_lookup`, `comparison`, `migration`, or `other`. Only these values can reach analytics. The adapter trims whitespace and normalizes case; it never stores an explanation or extracts a category from arbitrary text.

An empty, invalid, or free-text value falls back to `discovery` for `search_docs` or `reference_lookup` for reading tools. PostHog marks the fallback as `inferred`. It describes the tool action, not a verified user goal, and does not invoke a model. Accepted client categories are also unverified claims.

The SDK still accepts a string argument, so an agent might send private text despite the instruction. The outbound allowlist replaces that text before delivery. Raw queries, complete arguments, and returned documentation remain excluded.

The endpoint creates a fresh server for every HTTP request. PostHog’s SDK can carry a stable session token for legacy clients. Conversation IDs also let clients reuse a handle across requests: the SDK adds a `conversation_id` argument and can return a handle for the agent to echo. Grouping depends on the client keeping its SDK token or echoing that handle. Reconnecting or ignoring the handle can split activity.

These are analytics labels, not authentication. Client metadata capture in this SDK mode can also add an `llm_model` argument. It lets clients such as OpenCode report a model when no supported metadata field is available. Reported values remain unverified. Reconnect the client after enabling these options so it refreshes its tool schemas.

An adapter can export `instrument(server, options)` to configure its SDK before serving the request. Return `true` to let that SDK own event capture; return `false` to retain Shoalrun’s `capture(event)` path. The options include these flags, build/publication identity, and helpers for normalized client/model labels and published resource IDs. Delivery still uses the adapter’s `flush()`.

The PostHog example uses the existing low-level SDK server and resolves original tool argument names for stateless requests. Its outbound property allowlist drops raw headers, arguments, responses, and exception bodies. Other services need their own implementation of this optional hook.

## Safeguards and limits

If you need caller opt-in, the optional [`mcp.analytics.consent` header gate](https://www.shoalrun.com/config.md) records only calls with a matching header. Other callers can still use the tools. Leave it omitted for collection without client setup.

The PostHog example builds each outbound event from allowed fields. It includes tool name, duration, outcome, build/publication identity, and validated public page or section IDs. Optional harness labels come from known names; optional model labels must appear in the fixed registry.

The adapter drops raw arguments, search text, responses, headers, IP properties, error messages, and arbitrary event fields. It disables exception autocapture, requests no person profiles, and disables GeoIP enrichment. These controls apply to analytics delivery, not the documentation response or infrastructure access logs.

Conversation and session IDs support grouping when enabled. They are pseudonymous identifiers, not proof that data is anonymous or that a particular person made the call. Leave grouping off when aggregate tool counts are enough. Never use client labels or intent categories for authentication or billing.

Check PostHog’s **Settings → Project → IP data capture configuration → Discard client IP data** setting as an additional storage control. A network service still receives the source IP of its connection; this server adapter must not forward the caller’s IP. Hosting logs and other services need their own review. See [PostHog storage controls](https://posthog.com/docs/privacy/data-storage).

Test the final delivered payload with a local receiver before changing the adapter or upgrading its SDK. Include names, emails, credentials, URLs, and private text in test arguments and metadata; verify they are absent from captured events. Public page IDs remain useful for usage analysis without recording the agent’s search or explanation. These safeguards do not establish a legal basis for collection or guarantee that all infrastructure stores no personal data.

## Example: PostHog MCP analytics

This example sends native `$mcp_tool_call` events through [PostHog’s MCP analytics SDK](https://posthog.com/docs/mcp-analytics/installation/typescript). Use Node.js 22.22 or newer with these tested package versions. No PostHog dependency is required for projects that omit this adapter.

1. ### Install the SDKs

   From your documentation project, install the pinned versions used by this example:

   ```sh
   npm install --save-exact @posthog/mcp@0.22.3 posthog-node@5.56.2
   ```

   PostHog’s MCP SDK is in beta. Review its compatibility notes before changing versions.

2. ### Create the server adapter

   Save the complete adapter in your project. It supports basic capture and the optional SDK features described above, with an outbound property allowlist:

   ### Complete PostHog server adapter

   ```js title="mcp-analytics/posthog.mjs"
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
   ```

   Set `POSTHOG_PROJECT_TOKEN` on the Node process or Vercel function. Set `POSTHOG_HOST` for a different ingestion region. With no token, the example sends nothing. Keep these settings separate from the browser adapter.

3. ### Enable the adapter and verify an event

   Add `analytics` inside your enabled `mcp` configuration:

   ```yaml title="docs.config.yaml"
   mcp:
     enabled: true
     access: public
     publication: { channel: production, version: current, language: en }
     analytics:
       module: ./mcp-analytics/posthog.mjs
       clientMetadata: true
   ```

   Rebuild and serve the site, or generate its Vercel output as described in the [MCP guide](https://www.shoalrun.com/publish/mcp.md). Connect a client and call `get_page` for a known ID. In PostHog’s activity feed, filter for `$mcp_tool_call`; inspect the tool name, duration, outcome, and `page_id`.

   You can test on localhost with a development project or a local ingestion receiver. Without identity or conversation tracking, this example does not correlate requests into agent sessions. With basic capture, no prompts or tools are added. When client metadata is available, inspect `$mcp_client_name` and `$mcp_llm_model`; their source and verification properties identify them as claims.

   To stop collection, remove `mcp.analytics` or set it to `false`, rebuild, and restart the serving process or redeploy.

## Related reading

### Read first

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Enable and verify the HTTP endpoint before adding analytics.

### Related topics

- [Bring your own analytics](https://www.shoalrun.com/author/analytics.md) — Collect browser interactions through the separate browser adapter.
