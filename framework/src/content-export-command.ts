import { exportContent, type ContentExportOptions } from './content-export.js';

export const exportHelp = `Usage: shoalrun export [config] --out DIRECTORY [--target NAME]
       [--format markdown|html|both] [--document ID]...
       [--channel C --version V --language L] [--public-base /help/] [--review]

Export whole pages as resolved Markdown and passive HTML, with a manifest and assets.
Navigation, facets, and a prior website build are not required.
--review writes an API-review candidate; status needs-review exits 2 until pinned.
`;
export async function runExportCommand(args: string[]) {
  const options: ContentExportOptions = {};
  const values = new Map<string, string>();
  let config: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--review') { if (options.review) throw new Error(exportHelp); options.review = true; continue; }
    if (arg.startsWith('--')) {
      if (!['--out', '--target', '--format', '--document', '--channel', '--version', '--language', '--public-base'].includes(arg) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(exportHelp);
      const value = args[++index];
      if (arg === '--document') { (options.documents ??= []).push(value); continue; }
      if (values.has(arg)) throw new Error(exportHelp);
      values.set(arg, value);
    } else { if (config) throw new Error(exportHelp); config = arg; }
  }
  const output = values.get('--out');
  if (!output) throw new Error(exportHelp);
  const format = values.get('--format');
  if (format && !['html', 'markdown', 'both'].includes(format)) throw new Error(exportHelp);
  if (format) options.formats = format === 'both' ? ['markdown', 'html'] : [format as 'html' | 'markdown'];
  const coordinates = ['--channel', '--version', '--language'].map(key => values.get(key));
  if (coordinates.some(Boolean)) {
    if (!coordinates.every(Boolean)) throw new Error('Select all three export publication coordinates: --channel, --version, and --language');
    options.publication = { channel: coordinates[0]!, version: coordinates[1]!, language: coordinates[2]! };
  }
  options.target = values.get('--target'); options.publicBase = values.get('--public-base');
  return exportContent(config ?? 'docs.config.yaml', output, options);
}
