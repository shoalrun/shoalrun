export type AgentDiscovery = {
  mode: 'focus' | 'visible' | 'disclosure' | 'off';
  label: string;
  message?: string;
  links: { article: string; index: string; markdown: string };
};

export function resolveAgentDiscovery(value: unknown): AgentDiscovery {
  const mapping = (value: unknown, where: string): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${where} must be a mapping`);
    return value as Record<string, unknown>;
  };
  const config = value === undefined ? {} : mapping(value, 'site.agentDiscovery');
  for (const key of Object.keys(config)) if (!['mode', 'label', 'message', 'links'].includes(key)) throw new Error(`site.agentDiscovery does not accept ${key}`);
  const mode = config.mode === undefined ? 'focus' : config.mode;
  if (typeof mode !== 'string' || !['focus', 'visible', 'disclosure', 'off'].includes(mode)) throw new Error('site.agentDiscovery.mode must be focus, visible, disclosure, or off');
  const label = (value: unknown, fallback: string, where: string) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${where} must be nonempty text`);
    return value.trim();
  };
  if (config.message !== undefined && typeof config.message !== 'string') throw new Error('site.agentDiscovery.message must be text');
  const links = config.links === undefined ? {} : mapping(config.links, 'site.agentDiscovery.links');
  for (const key of Object.keys(links)) if (!['article', 'index', 'markdown'].includes(key)) throw new Error(`site.agentDiscovery.links does not accept ${key}`);
  return {
    mode: mode as AgentDiscovery['mode'],
    label: label(config.label, 'For agents', 'site.agentDiscovery.label'),
    message: (config.message as string | undefined)?.trim() || undefined,
    links: {
      article: label(links.article, 'Skip to article', 'site.agentDiscovery.links.article'),
      index: label(links.index, 'Documentation index', 'site.agentDiscovery.links.index'),
      markdown: label(links.markdown, 'Read this page as Markdown', 'site.agentDiscovery.links.markdown'),
    },
  };
}
