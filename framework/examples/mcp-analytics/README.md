# MCP analytics adapter

This server-only example uses PostHog's native MCP analytics SDK. It emits
`$mcp_tool_call`, rather than renaming a browser event. Other services can use
the same `capture(event)` and optional `flush()` exports.

1. Copy `posthog.mjs` into a dedicated `mcp-analytics/` directory in your project.
2. Install the example's tested dependencies in that project:
   `npm install --save-exact @posthog/mcp@0.22.3 posthog-node@5.56.2`.
   This SDK requires Node.js 22.22+ on the Node 22 release line.
3. Add `analytics: { module: ./mcp-analytics/posthog.mjs }` inside your enabled
   `mcp` configuration. Add `clientMetadata: true` alongside `module` if you want
   normalized client/model labels when available. This separate option defaults
   to `false`. Set `intent: true` and `conversationIds: true` separately to use
   the SDK instrumentation hook. Both also default off. The top-level browser `analytics` setting is separate.
4. Set `POSTHOG_PROJECT_TOKEN` and optionally `POSTHOG_HOST` on the serving
   process or Vercel function. The example does nothing without a token.
5. Build, connect an MCP client, and call a documentation tool. Look for
   `$mcp_tool_call` in PostHog's activity feed and MCP analytics views.

Shoalrun packages the module and its dependencies without importing it at build
time. Keep local imports within the module's directory. Use static imports
and read credentials from runtime environment variables. Don't put credentials
or private data in module files: the build copies those files.

The event contains the tool, duration, error flag, build ID, publication,
and the page/section IDs for successful reads. It excludes arguments, search
text, result content, raw request headers, IP addresses, and user identity.
With client metadata enabled, the PostHog example also maps the normalized
client name/version and supported model label to native MCP properties. Both
are unverified claims; unknown or unsafe labels are omitted. The adapter adds no person identity. Basic capture leaves tool schemas and
responses unchanged. Enabling
intent/grouping uses the native SDK: it adds context, conversation, and (when
client metadata is enabled) model arguments. Session tokens or echoed
conversation handles group calls without a shared server session store. It does not count direct Markdown fetches, browser views, or transport errors.
Basic capture includes error categories but excludes schema-validation failures before the tool handler. Native instrumentation can record rejected tool calls; it currently retains the error flag without an error category.

Shoalrun attempts delivery and flushes before completing each HTTP response,
with a one-second bound on each adapter operation. Failures log a generic
warning and don't change the MCP result. Delivery is best effort. Use bounded
provider timeouts; a timed-out promise isn't cancelled automatically. Removing
`mcp.analytics` or setting it to `false` disables collection after rebuilding
and restarting the host. Stdio is not instrumented by this setting.

Intent capture asks for exactly one fixed category: discovery, setup,
troubleshooting, configuration, reference_lookup, comparison, migration, or other.
Only these categories can leave the adapter. Empty or invalid context, including
free text with names or secrets, is replaced with a per-tool fallback marked
inferred. It does not infer the user's real goal or run a model. Harness names
are normalized; model names must match the framework's fixed registry. Unknown
or custom deployment labels are omitted. All client labels remain unverified.
The adapter disables exception autocapture, GeoIP enrichment, and person profiles.
Session handles remain pseudonymous identifiers when grouping is enabled; this
is not a guarantee of anonymous data. Check PostHog's project-level Discard client
IP data setting too. Infrastructure access logs are outside this adapter.
An outbound property allowlist excludes raw arguments, results, headers, and
exception details in SDK mode. SDK mode uses the low-level server with original
argument names so analytics fields can be removed before strict validation.
Reconnect clients after changing these options to refresh their tool listing.
