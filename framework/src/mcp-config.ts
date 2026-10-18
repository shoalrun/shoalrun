import { configMappingAt } from './compiler-config.js';

export type McpConfig = { enabled: true; access: 'public'; path: string; publication: { channel: string; version: string; language: string }; allowedHosts: string[]; allowedOrigins: string[]; analytics?: { module: string; clientMetadata?: boolean; intent?: boolean; conversationIds?: boolean; consent?: { header: string; value: string } } };
export function resolveMcp(value: unknown): McpConfig | undefined {
  if (value === undefined || value === false) return;
  const config = configMappingAt(value, 'mcp');
  if (Object.keys(config).some(key => !['enabled', 'access', 'path', 'publication', 'allowedHosts', 'allowedOrigins', 'analytics'].includes(key))) throw new Error('Unknown mcp setting');
  if (typeof config.enabled !== 'boolean') throw new Error('mcp.enabled must be a boolean');
  if (!config.enabled) return;
  if (config.access !== 'public') throw new Error('mcp.access must explicitly be public');
  const route = config.path ?? '/mcp';
  if (typeof route !== 'string' || !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(route) || route.startsWith('/__shoalrun')) throw new Error('mcp.path must be a non-reserved absolute path without a trailing slash');
  const publication = configMappingAt(config.publication, 'mcp.publication');
  if (Object.keys(publication).some(key => !['channel', 'version', 'language'].includes(key)) || ['channel', 'version', 'language'].some(key => typeof publication[key] !== 'string' || !/^[a-zA-Z0-9._-]{1,128}$/.test(publication[key] as string))) throw new Error('mcp.publication needs channel, version, and language');
  const strings = (key: string) => {
    const values = config[key] ?? [];
    if (!Array.isArray(values) || values.length > 32 || values.some(v => typeof v !== 'string' || !v || v.length > 253)) throw new Error(`mcp.${key} must be an array of explicit hostnames or origins`);
    return values as string[];
  };
  const allowedHosts = strings('allowedHosts');
  if (allowedHosts.some(host => !/^(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/.test(host))) throw new Error('mcp.allowedHosts accepts hostnames without wildcards, schemes, or ports');
  const allowedOrigins = strings('allowedOrigins');
  if (allowedOrigins.some(origin => { try { const url = new URL(origin); return url.origin !== origin || !['https:', 'http:'].includes(url.protocol); } catch { return true; } })) throw new Error('mcp.allowedOrigins accepts exact HTTP(S) origins');
  let analytics: McpConfig['analytics'];
  if (config.analytics !== undefined && config.analytics !== false) {
    const value = configMappingAt(config.analytics, 'mcp.analytics');
    if (Object.keys(value).some(key => !['module', 'clientMetadata', 'intent', 'conversationIds', 'consent'].includes(key)) || typeof value.module !== 'string' || !value.module.trim() || !/\.m?js$/i.test(value.module) || /^[a-z][a-z0-9+.-]*:/i.test(value.module)) throw new Error('mcp.analytics.module must name a local .js or .mjs server module');
    for (const key of ['clientMetadata', 'intent', 'conversationIds']) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error(`mcp.analytics.${key} must be a boolean`);
    let consent: { header: string; value: string } | undefined;
    if (value.consent !== undefined && value.consent !== false) {
      const policy = configMappingAt(value.consent, 'mcp.analytics.consent');
      if (Object.keys(policy).some(key => !['header', 'value'].includes(key)) || typeof policy.header !== 'string' || !/^x-[a-z0-9-]{1,60}$/.test(policy.header) || /^(x-forwarded-|x-vercel-|x-mcp-)/.test(policy.header) || typeof policy.value !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(policy.value)) throw new Error('mcp.analytics.consent needs a custom lowercase x- header and a short policy value');
      consent = { header: policy.header, value: policy.value };
    }
    analytics = { module: value.module, ...(consent ? { consent } : {}), ...(value.clientMetadata === true ? { clientMetadata: true } : {}), ...(value.intent === true ? { intent: true } : {}), ...(value.conversationIds === true ? { conversationIds: true } : {}) };
  }
  return { ...(analytics ? { analytics } : {}), enabled: true, access: 'public', path: route, publication: publication as McpConfig['publication'], allowedHosts: allowedHosts.map(host => host.toLowerCase()), allowedOrigins };
}
