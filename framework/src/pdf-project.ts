import path from 'node:path';
import { explainSegments, type loadConfig } from './config.js';
import { configField, isConfigMapping, resolvedCompilerConfig } from './compiler-config.js';
import { mergePdfConfig } from './pdf-config.js';

/** Resolve print assets from the configuration that declares each setting. */
export function projectPdfSettings(loaded: Awaited<ReturnType<typeof loadConfig>>, configFile: string, targetName?: string) {
  const resolved = resolvedCompilerConfig(loaded.value);
  const target = targetName && isConfigMapping(resolved.exports) ? resolved.exports[targetName] : undefined;
  const override = isConfigMapping(target) ? target.pdf : undefined;
  const config = mergePdfConfig(configField(resolved.outputs, 'pdf'), override);
  const files: string[] = [];
  const owner = (field: string, index?: number) => explainSegments(loaded, [
    ...(targetName && isConfigMapping(override) && Object.hasOwn(override, field) ? ['exports', targetName, 'pdf'] : ['outputs', 'pdf']),
    field, ...(index === undefined ? [] : [String(index), 'source'])
  ]).source.file;
  for (const field of ['stylesheet', 'logo'] as const) if (config[field]) {
    config[field] = path.resolve(path.dirname(owner(field)), config[field]!);
    files.push(config[field]!);
  }
  if (config.fonts) config.fonts = config.fonts.map((font, index) => {
    const source = path.resolve(path.dirname(owner('fonts', index)), font.source);
    files.push(source);
    return { ...font, source };
  });
  // The browser executable is a host tool, never an asset to publish or capture.
  if (config.executablePath) config.executablePath = path.resolve(path.dirname(owner('executablePath')), config.executablePath);
  return { config, files };
}
