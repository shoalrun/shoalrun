import { exportContent, type ContentExportOptions } from './content-export.js';

export const exportHelp = `Usage: shoalrun export [config] --out DIRECTORY [--target NAME]
       [--format markdown|html|both|pdf] [--document ID]...
       [--channel C --version V --language L [--product P]] [--public-base /help/] [--review]
       [--profile FILE] [--previous-manifest FILE] [--fail-on-removed]

Export selected pages, sections, and named snippets as Markdown and passive HTML.
Configure typed resources in an export target; --document selects whole pages.
Navigation, facets, and a prior website build are not required.
--format pdf exports one publication, or the selected whole pages, as a styled PDF.
PDF uses outputs.pdf defaults and target pdf overrides; it follows navigation order
and appends eligible unlisted pages. PDF defaults to the site's contentFilter.
--review writes an API-review candidate; status needs-review exits 2 until pinned.
--previous-manifest compares public references with an earlier reviewed export.
--fail-on-removed requires that baseline and refuses to replace output if references disappear.
`;
export async function runExportCommand(args: string[]) {
  const options: ContentExportOptions = {};
  const values = new Map<string, string>();
  let config: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--review') { if (options.review) throw new Error(exportHelp); options.review = true; continue; }
    if (arg === '--fail-on-removed') { if (options.failOnRemoved) throw new Error(exportHelp); options.failOnRemoved = true; continue; }
    if (arg.startsWith('--')) {
      if (!['--out', '--target', '--format', '--document', '--channel', '--version', '--language', '--product', '--public-base', '--previous-manifest', '--profile'].includes(arg) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(exportHelp);
      const value = args[++index];
      if (arg === '--document') { (options.documents ??= []).push(value); continue; }
      if (values.has(arg)) throw new Error(exportHelp);
      values.set(arg, value);
    } else { if (config) throw new Error(exportHelp); config = arg; }
  }
  const output = values.get('--out');
  if (!output) throw new Error(exportHelp);
  const format = values.get('--format');
  if (format && !['html', 'markdown', 'both', 'pdf'].includes(format)) throw new Error(exportHelp);
  if (format) options.formats = format === 'both' ? ['markdown', 'html'] : [format as 'html' | 'markdown' | 'pdf'];
  const coordinates = ['--channel', '--version', '--language'].map(key => values.get(key));
  if (coordinates.some(Boolean) || values.has('--product')) {
    if (!coordinates.every(Boolean)) throw new Error('Select all three export publication coordinates: --channel, --version, and --language');
    options.publication = { channel: coordinates[0]!, version: coordinates[1]!, language: coordinates[2]!, ...(values.has('--product') ? { product: values.get('--product')! } : {}) };
  }
  options.profile = values.get('--profile');
  options.target = values.get('--target'); options.publicBase = values.get('--public-base');
  options.previousManifest = values.get('--previous-manifest');
  if (options.failOnRemoved && !options.previousManifest) throw new Error('--fail-on-removed requires --previous-manifest');
  return exportContent(config ?? 'docs.config.yaml', output, options);
}
