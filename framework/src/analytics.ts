import path from 'node:path';
import { configMappingAt } from './compiler-config.js';

/** Browser-only adapter: resolve its source without importing customer code. */
export function resolveAnalytics(value: unknown, configFile: string): string | undefined {
  if (value === undefined || value === false) return undefined;
  const config = configMappingAt(value, 'analytics');
  if (Object.keys(config).some(key => key !== 'module')) throw new Error('analytics accepts only module');
  if (typeof config.module !== 'string' || !config.module.trim() || !/\.m?js$/i.test(config.module) || /^[a-z][a-z0-9+.-]*:/i.test(config.module)) throw new Error('analytics.module must name a local .js or .mjs browser module');
  return path.resolve(path.dirname(configFile), config.module);
}
