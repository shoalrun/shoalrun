import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
if (!process.env.SHOALRUN_PDF_BROWSER && !process.env.PUPPETEER_EXECUTABLE_PATH) {
  console.error('Set SHOALRUN_PDF_BROWSER to an installed Chrome/Chromium executable, then rerun npm run pdf:check. No browser will be downloaded.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...['pdf-renderer', 'pdf-export', 'pdf-button', 'pdf-http'].map(name => `framework/dist/${name}.test.js`)], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const { exportContent } = await import('../dist/content-export.js');
const { compile } = await import('../dist/compiler.js');
const destination = path.join(root, '.shoalrun/pdf-review');
const config = path.join(root, 'framework/examples/pdf/docs.config.yaml');
await mkdir(destination, { recursive: true });
const page = await exportContent(config, path.join(destination, 'page'), { formats: ['pdf'], documents: ['guide.start'] });
const publication = await exportContent(config, path.join(destination, 'publication'), { formats: ['pdf'] });
const site = await compile(config, path.join(destination, 'site'), { releaseLabel: 'pdf-review' });
const summary = { status: 'rendered-needs-visual-review', page: path.join(destination, 'page/page.pdf'), publication: path.join(destination, 'publication/publication.pdf'), pageDigest: page.digest, publicationDigest: publication.digest, site: path.join(destination, 'site'), siteBuildId: site.buildId, review: 'Open both PDFs; check fonts, math, tables, links, bookmarks, and page breaks. Serve the site to check Print / Save as PDF; the site build generates no page PDFs.' };
await writeFile(path.join(destination, 'render-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
