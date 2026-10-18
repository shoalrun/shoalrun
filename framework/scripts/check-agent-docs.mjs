import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChecks, computeScore } from 'afdocs';
import { createSiteServer } from '../dist/server.js';
import { loadConfig } from '../dist/config.js';

// Run the whole scorecard; gate the contracts Shoalrun promises. Parity and
// size findings remain visible for review rather than enforcing identical text.
const args = process.argv.slice(2);
if (args.length && (args.length !== 1 || args[0] !== '--site-only')) throw new Error('Usage: node check-agent-docs.mjs [--site-only]');
const siteOnly = args.includes('--site-only');
const discoveryChecks = ['llms-txt-exists', 'llms-txt-valid', 'llms-txt-links-resolve', 'llms-txt-coverage'];
const pageChecks = ['llms-txt-directive-html', 'llms-txt-directive-md',
  'markdown-url-support', 'content-negotiation', 'rendering-strategy',
  'markdown-code-fence-validity', 'http-status-codes',
  'cache-header-hygiene', 'auth-gate-detection'];
const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.dirname(framework);
const output = path.join(framework, '.shoalrun', 'afdocs');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-afdocs-'));
let failed = false;

async function audit(label, site, canonicalOrigin) {
  const server = await createSiteServer(site);
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const target = `http://127.0.0.1:${server.address().port}`;
    const report = await runChecks(target, { canonicalOrigin,
      samplingStrategy: 'deterministic', requestDelay: 0 });
    const scoring = computeScore(report);
    // AFDocs' default discovery also treats JSON catalogs and OpenAPI downloads
    // as HTML pages on small sites. Keep that unmodified scorecard, then check
    // every manifest page explicitly for the release gate, across all versions.
    const manifest = JSON.parse(await readFile(path.join(site, 'documents.json'), 'utf8'));
    const pages = await runChecks(target, { canonicalOrigin, requestDelay: 0,
      samplingStrategy: 'curated', curatedPages: manifest.documents.map(page => target + page.url),
      maxLinksToTest: 10000 });
    const unacceptable = result => !result || result.status !== 'pass';
    const failures = [
      ...discoveryChecks.filter(id => unacceptable(pages.results.find(result => result.id === id))),
      ...pageChecks.filter(id => unacceptable(pages.results.find(result => result.id === id)))
    ];
    failed ||= failures.length > 0;
    await writeFile(path.join(output, `${label}.json`), JSON.stringify({ ...report, scoring, requiredFailures: failures }, null, 2) + '\n');
    await writeFile(path.join(output, `${label}-pages.json`), JSON.stringify({ ...pages, scoring: computeScore(pages), requiredFailures: failures }, null, 2) + '\n');
    console.log(`${label}: ${scoring.overall}/100 (${scoring.grade}); ${report.testedPages} tested pages`);
    for (const result of report.results.filter(result => result.status !== 'pass')) {
      console.log(`  ${result.id}: ${result.status} — ${result.message}`);
    }
    if (failures.length) console.error(`  Required checks failed: ${failures.join(', ')}`);
    console.log(`  Manifest page gate: ${manifest.documents.length} pages; ${failures.length ? 'failed' : 'passed'}`);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

try {
  await mkdir(output, { recursive: true });
  const { value: config } = await loadConfig(path.join(framework, 'example/docs.config.yaml'));
  const canonicalOrigin = config.site?.origin;
  if (!canonicalOrigin) throw new Error('Docs audit requires site.origin');
  await audit('docs', path.join(repository, 'framework/example/dist'), canonicalOrigin);
  for (const starter of siteOnly ? [] : ['minimal', 'api-docs']) {
    const project = path.join(temporary, starter);
    const cli = path.join(framework, 'dist/cli.js');
    const run = args => execFileSync(process.execPath, [cli, ...args], { stdio: 'pipe' });
    run(['init', project, '--starter', starter]);
    const configFile = path.join(project, 'docs.config.yaml');
    let source = await readFile(configFile, 'utf8');
    // A production origin enables sitemap/coverage checks on the minimal
    // starter too. AFDocs rewrites it to this run's local server.
    if (starter === 'minimal') source = source.replace('  title: Acme handbook', '  title: Acme handbook\n  origin: https://docs.example.com');
    await writeFile(configFile, source);
    const site = path.join(project, 'site-dist');
    run(['build', configFile, site]);
    const { value: starterConfig } = await loadConfig(configFile);
    if (!starterConfig.site?.origin) throw new Error(`${starter} audit requires site.origin`);
    await audit(starter, site, starterConfig.site.origin);
  }
  console.log(`Full reports: ${path.relative(repository, output)}/`);
  if (failed) process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
