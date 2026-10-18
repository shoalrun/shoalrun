import { createServer, type Server } from 'node:http';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSiteServer } from './server.js';
import { validationArtifactDigest } from './authoring-validation.js';
import { assembleAuthoringReview, loadPinnedReview, pinnedValidationStatus, type AuthoringReview } from './authoring-review.js';
import { SnapshotError } from './authoring-snapshot.js';

export type AuthoringPreviewOptions = { port?: number };
export type AuthoringPreview = {
  schemaVersion: 1; kind: 'shoalrun-authoring-preview'; snapshotId: string; origin: string;
  reviewUrl: string; statusUrl: string; pages: Array<AuthoringReview['pages'][number] & { htmlUrl: string; markdownUrl: string }>;
  directory: string; lifecycle: string; server: Server;
  review: () => Promise<AuthoringReview>; close: () => Promise<void>;
};
const prefix = '/__shoalrun/authoring';
const escape = (text: string) => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const htmlUrl = (route: string) => route === '/' ? '/' : `${route.replace(/\/+$/, '')}/`;
const link = (route: string, label: string) => `<a href="${escape(route)}">${escape(label)}</a>`;
const message = (review: AuthoringReview) => `Snapshot ${review.snapshotId.slice(0, 12)} · ${review.status} · ${review.freshness.current ? 'current' : 'stale; this preview does not verify current edits'}. ${review.nextAction}`;
const banner = (review: AuthoringReview) => `<aside class="shoalrun-preview-status" aria-label="Snapshot preview"><span id="shoalrun-preview-status" role="status" aria-live="polite">${escape(message(review))}</span> ${link(`${prefix}/review`, 'Review this snapshot')}</aside>`;
const previewScript = `const status=document.getElementById('shoalrun-preview-status');let timer;async function refresh(){try{const response=await fetch('${prefix}/status',{cache:'no-store'});if(!response.ok)throw Error();const review=await response.json();status.textContent='Snapshot '+review.snapshotId.slice(0,12)+' · '+review.status+' · '+(review.freshness.current?'current':'stale; this preview does not verify current edits')+'. '+review.nextAction;}catch{status.textContent='Preview status unavailable. Confirm freshness before accepting this snapshot.';}timer=setTimeout(refresh,2000);}refresh();addEventListener('pagehide',()=>clearTimeout(timer));`;
const css = `body.shoalrun-review{font-family:system-ui,sans-serif}body.shoalrun-review{max-width:72rem;margin:2rem auto;padding:0 1rem}.shoalrun-review table{border-collapse:collapse;width:100%}.shoalrun-review th,.shoalrun-review td{padding:.5rem;text-align:left;border-bottom:1px solid #888;vertical-align:top;overflow-wrap:anywhere}.shoalrun-review code{overflow-wrap:anywhere}.shoalrun-preview-status{position:sticky;top:0;z-index:10000;padding:.75rem;background:#fff3cd;color:#332600;border-bottom:2px solid #8a6400;font:14px/1.5 system-ui,sans-serif}.shoalrun-preview-status a{color:#332600;text-decoration:underline}.shoalrun-review section{margin:2rem 0}`;
function reviewHtml(review: AuthoringReview) {
  const table = (headings: string[], rows: string[][]) => `<table><thead><tr>${headings.map(heading => `<th scope="col">${escape(heading)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Authoring review</title><link rel="stylesheet" href="${prefix}/preview.css"><script src="${prefix}/preview.js" defer></script></head><body class="shoalrun-review">${banner(review)}<main><h1>Authoring review</h1><p>Validation result: ${escape(review.validationStatus)}. Snapshot: <code>${escape(review.snapshotId)}</code>.</p>
<section><h2>Task scope</h2><p>Baseline: ${escape(review.baseline.kind)}${review.baseline.file ? ` · ${escape(review.baseline.file)} · ${escape(review.baseline.digest ?? '')}` : ''}.</p><p>${escape(review.diff.explanation)}</p>${table(['Source', 'Change', 'Before digest', 'Snapshot digest'], review.changed.map(change => [escape(change.file), escape(change.operation), escape(change.beforeDigest ?? 'unknown'), escape(change.digest ?? 'deleted')]))}</section>
<section><h2>Affected pages</h2>${table(['Source / ID', 'Origin', 'HTML', 'Markdown'], review.pages.map(page => [escape(`${page.file} / ${page.id}`), escape(page.origin), link(htmlUrl(page.route), page.route), link(page.markdown, page.markdown)]))}<p>Not rendered: ${escape(review.coverage.notRendered.join(', ') || 'none')}.</p><p>Page selection: ${escape(review.pageSelection)}.</p><p>Coverage: ${review.coverage.affected.length} affected sources; ${review.coverage.authored.length} authored sources in the captured project. Unchanged public pages may also be present in the site.</p></section>
<section><h2>Checks</h2>${table(['Check', 'Status', 'Explanation'], review.checks.map(check => [escape(check.id), escape(check.status), escape(check.explanation ?? '')]))}</section>
<section><h2>Findings</h2>${review.findings.length ? review.findings.map(finding => `<article><h3>${escape(finding.severity)}: ${escape(finding.code)}</h3><p>${escape(finding.file ?? 'Project')}${finding.location ? `:${finding.location.line}:${finding.location.column}${finding.location.key ? ` (${escape(finding.location.key)})` : ''}` : ''}</p><p>${escape(finding.explanation)}</p><p>Next: ${escape(finding.nextAction)}</p>${finding.reference ? `<p>Framework reference: <code>${escape(finding.reference)}</code> (read with docs read).</p>` : ''}${finding.relatedFiles?.length ? `<p>Related sources: ${escape(finding.relatedFiles.join(', '))}.</p>` : ''}</article>`).join('') : '<p>No findings reported. Review coverage and skipped checks before accepting the result.</p>'}</section>
<section><h2>Dependencies</h2>${table(['Source', 'Digest', 'Role'], review.dependencies.map(dependency => [escape(dependency.file), escape(dependency.digest ?? 'unavailable'), escape(dependency.source)]))}</section>
<section><h2>Artifacts and review limits</h2><p>Captured project: ${escape(review.artifacts.project)}</p><p>Built site: ${escape(review.artifacts.site)}</p><p>Report: ${escape(review.artifacts.report)}</p><p>${escape(review.artifacts.lifecycle)}</p><p>Evidence gathering remains with your harness. No semantic reviewer ran; no author dispositions are recorded. Compiler success does not establish factual accuracy or reader usefulness.</p><p>Stop this foreground preview with Ctrl-C. Its private serving copy is removed; validation artifacts remain. After revisions, validate again and start a new preview with the new report.</p></section></main></body></html>`;
}

async function copySite(source: string, destination: string) {
  let bytes = 0, count = 0;
  const visit = async (from: string, to: string) => {
    if (!(await lstat(from)).isDirectory()) throw new SnapshotError('unsafe_path', 'Preview site must be a regular directory');
    await mkdir(to, { mode: 0o700 });
    for (const entry of await readdir(from, { withFileTypes: true })) {
      const input = path.join(from, entry.name), output = path.join(to, entry.name);
      if (entry.isDirectory()) await visit(input, output);
      else if (entry.isFile()) {
        const content = await readFile(input); bytes += content.length; count++;
        if (bytes > 512 * 1024 * 1024 || count > 20000) throw new SnapshotError('capture_limit', 'Preview copy exceeds 20000 files or 512 MiB.');
        await writeFile(output, content, { flag: 'wx', mode: 0o400 });
      } else throw new SnapshotError('unsafe_path', 'Preview artifacts must not contain symlinks or special files');
    }
  };
  await visit(source, destination);
}

/** Local foreground preview of one pinned snapshot; no watch, rebuild or provider. */
export async function startAuthoringPreview(reportFile: string, options: AuthoringPreviewOptions = {}): Promise<AuthoringPreview> {
  const port = options.port ?? 8771;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new SnapshotError('invalid_input', 'Preview port must be an integer from 0 to 65535');
  const pinned = await loadPinnedReview(reportFile);
  if (!pinned.report.artifacts.digest || pinned.review.freshness.changed.artifacts || pinned.review.freshness.reportChanged) throw new SnapshotError('stale_input', 'Validation artifacts are missing or changed. Validate again before previewing.');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-authoring-preview-'));
  await chmod(directory, 0o700);
  const siteDirectory = path.join(directory, 'site');
  let server: Server | undefined;
  try {
    await copySite(pinned.report.artifacts.site, siteDirectory);
    if (await validationArtifactDigest(siteDirectory) !== pinned.report.artifacts.digest) throw new SnapshotError('stale_input', 'Site changed while copying the preview. Validate again.');
    const after = await pinnedValidationStatus(reportFile, pinned.report, pinned.digest);
    if (after.changed.artifacts || after.reportChanged) throw new SnapshotError('stale_input', 'Validation artifacts changed while starting preview. Validate again.');
    const site = await createSiteServer(siteDirectory);
    const review = async () => {
      const freshness = await pinnedValidationStatus(reportFile, pinned.report, pinned.digest);
      if (await validationArtifactDigest(siteDirectory) !== pinned.report.artifacts.digest) {
        freshness.current = false; freshness.status = 'stale'; freshness.changed.artifacts = true;
        freshness.nextAction = 'The private preview copy changed or was removed. Stop it, validate again and start a new preview.';
      }
      return assembleAuthoringReview(pinned.report, freshness);
    };
    let pending: Promise<AuthoringReview> | undefined;
    const sharedReview = () => pending ??= review().finally(() => { pending = undefined; });
    server = createServer(async (request, response) => {
      response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('X-Robots-Tag', 'noindex'); response.setHeader('X-Shoalrun-Snapshot', pinned.report.snapshotId);
      const expectedHost = `127.0.0.1:${(server!.address() as { port: number }).port}`;
      if (request.headers.host !== expectedHost) { response.writeHead(421); response.end('Use the returned loopback preview URL.'); return; }
      try {
        const url = new URL(request.url ?? '/', `http://${expectedHost}`);
        if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
        const send = (type: string, body: string) => { response.writeHead(200, { 'Content-Type': type }); response.end(request.method === 'HEAD' ? undefined : body); };
        if (url.pathname === `${prefix}/preview.js`) { send('text/javascript; charset=utf-8', previewScript); return; }
        if (url.pathname === `${prefix}/preview.css`) { send('text/css; charset=utf-8', css); return; }
        const current = await sharedReview();
        if (url.pathname === `${prefix}/status`) { send('application/json; charset=utf-8', JSON.stringify(current)); return; }
        if (url.pathname === `${prefix}/review`) { send('text/html; charset=utf-8', reviewHtml(current)); return; }
        // Invalidated original artifacts never become replacement preview content.
        if (current.freshness.changed.artifacts) { response.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Preview artifacts changed. Stop, validate again, and start a new preview.'); return; }
        const end = response.end.bind(response);
        response.end = ((chunk: any, ...args: any[]) => {
          if (request.method !== 'HEAD' && response.statusCode === 200 && String(response.getHeader('Content-Type')).startsWith('text/html') && chunk) {
            const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            chunk = Buffer.from(text.replace(/<body([^>]*)>/i, `<body$1>${banner(current)}<link rel="stylesheet" href="${prefix}/preview.css"><script src="${prefix}/preview.js" defer></script>`));
          }
          return (end as any)(chunk, ...args);
        }) as typeof response.end;
        site.emit('request', request, response);
      } catch {
        response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Preview freshness unavailable. Stop and validate again before accepting this snapshot.');
      }
    });
    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject);
      server!.listen(port, '127.0.0.1', () => { server!.off('error', reject); resolve(); });
    });
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    let closing: Promise<void> | undefined;
    const close = () => closing ??= (async () => {
      await new Promise<void>(resolve => { server!.close(() => resolve()); server!.closeAllConnections(); });
      await rm(directory, { recursive: true, force: true });
    })();
    return { schemaVersion: 1, kind: 'shoalrun-authoring-preview', snapshotId: pinned.report.snapshotId, origin, reviewUrl: `${origin}${prefix}/review`, statusUrl: `${origin}${prefix}/status`,
      pages: pinned.review.pages.map(page => ({ ...page, htmlUrl: `${origin}${htmlUrl(page.route)}`, markdownUrl: `${origin}${page.markdown}` })), directory,
      lifecycle: 'Foreground loopback service. Ctrl-C/SIGTERM closes the server and removes only its private serving copy. Validation artifacts remain; remove only their reported directory when finished. Revalidate and restart after edits; this preview never rebuilds.', server, review, close };
  } catch (error) {
    if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
