// Maintainer-only coordinated release driver. It is not shipped in the CLI.
import { existsSync, readFileSync, writeFileSync, mkdirSync, openSync, closeSync, readdirSync, lstatSync, readlinkSync, cpSync } from 'node:fs';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createServer } from 'node:net';
import { digest, json, save, directorySeal, verifyArchive, approvalId, requireApproval, publishOnce, deployOnce, releaseTag, releaseTags, withCompilerLock } from './release-state.mjs';
import { checkPackageInventory } from './package-inventory.mjs';
import { completeRelease } from './complete-release.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const node = process.execPath;
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');
export function sourceFingerprint(root) {
  const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))].sort();
  const hash = createHash('sha256');
  for (const relative of files) {
    const file = path.join(root, relative);
    if (!existsSync(file)) { hash.update(JSON.stringify([relative, 'deleted'])); continue; }
    const info = lstatSync(file);
    const bytes = info.isSymbolicLink() ? Buffer.from(readlinkSync(file)) : readFileSync(file);
    hash.update(JSON.stringify([relative, info.mode & 0o777, bytes.length])).update(bytes);
  }
  return hash.digest('hex');
}
const checkpoint = docs => ({ framework: sourceFingerprint(repo), frameworkHead: git(repo, 'rev-parse', 'HEAD'), docs: sourceFingerprint(docs), docsHead: git(docs, 'rev-parse', 'HEAD') });
export const releaseFrameworkFile = file => file === 'README.md' || /^framework\/(?:package(?:-lock)?\.json|README\.md|CHANGELOG\.md)$/.test(file) || file.startsWith('framework/agent-docs/');
export function auditReleaseDependencies(frameworkDirectory, docsDirectory, run) {
  for (const [name, directory] of [['Framework', frameworkDirectory], ['Documentation', docsDirectory]]) {
    run(`${name} full dependency advisory check`, 'npm', ['audit', '--json'], directory);
    run(`${name} production dependency advisory check`, 'npm', ['audit', '--omit=dev', '--json'], directory);
  }
}
export function recordSuccessfulCheck(stateFile, name, evidence) {
  const state = json(stateFile);
  if (!['source-checks', 'clean-install', 'site-checks'].includes(name)) throw new Error('Unknown verification phase');
  if (!evidence?.log || !existsSync(evidence.log)) throw new Error('Keep the successful check log as release evidence');
  state.steps[name] = { status: 'done', completedAt: new Date().toISOString(), data: { ...evidence, logDigest: digest(readFileSync(evidence.log)) } };
  state.checkpoint = checkpoint(state.docs);
  save(stateFile, state);
}
function changedFiles(root) {
  return [...new Set([
    ...execFileSync('git', ['diff', '--name-only', '-z', 'HEAD'], { cwd: root, encoding: 'utf8' }).split('\0'),
    ...execFileSync('git', ['ls-files', '-z', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0')
  ].filter(Boolean))];
}
function commit(root, message, allowed = () => true) {
  const files = changedFiles(root);
  if (!files.length) return git(root, 'rev-parse', 'HEAD');
  for (const file of files) {
    if (!allowed(file) || /(?:^|\/)(?:\.env(?:\.|$)|node_modules|dist|\.shoalrun|\.vercel)(?:\/|$)|\.(?:local|override)\.md$|\.(?:tgz|log)$/.test(file)) throw new Error(`Review unexpected source before committing: ${file}`);
  }
  git(root, 'diff', '--check');
  git(root, 'add', '--', ...files);
  git(root, 'diff', '--cached', '--check');
  git(root, 'commit', '-m', message);
  return git(root, 'rev-parse', 'HEAD');
}
function rewriteInstalls(root) {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of files) {
    if (!/\.(?:md|mdx)$/.test(file) || file.includes('/changelog/') || file.includes('/agent-docs/') || !existsSync(path.join(root, file))) continue;
    const absolute = path.join(root, file), old = readFileSync(absolute, 'utf8');
    const next = old.replace(/^(npm install[^\n]*@shoalrun\/cli@)\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/gm, `$1${targetVersion}`);
    if (next !== old) writeFileSync(absolute, next);
  }
}
let targetVersion;
export async function release(argv = process.argv.slice(2)) {
  const args = [...argv], version = args.shift();
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) throw new Error('Use: npm run release -- VERSION [--prepare | --publish --approve PLAN_ID] [--status] [--docs PATH]');
  targetVersion = version;
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (['--docs', '--approve', '--retry'].includes(key)) { if (!args[0] || args[0].startsWith('--')) throw new Error(`Missing ${key} value`); options[key] = args.shift(); }
    else if (['--prepare', '--publish', '--status', '--plan', '--resume', '--new-attempt'].includes(key)) options[key] = true;
    else throw new Error(`Unknown release option: ${key}`);
  }
  if (options['--prepare'] && options['--publish']) throw new Error('Choose --prepare or --publish');
  const docs = path.resolve(options['--docs'] ?? path.join(repo, '../docs'));
  const releaseRoot = path.join(repo, '.shoalrun/releases', version), latest = path.join(releaseRoot, 'latest.json');
  if (options['--plan']) {
    console.log(JSON.stringify({ version, docs, phases: ['versions', 'bootstrap compiler', 'reviewed documentation snapshot', 'final package checks', 'exact dependency pin', 'production site checks', 'approval', 'npm publication', 'GitHub synchronization', 'prebuilt deployment', 'live verification'], sourceFiles: changedFiles(repo).length, docsFiles: changedFiles(docs).length }, null, 2));
    return;
  }
  let stateFile, state;
  if (existsSync(latest) && !options['--new-attempt']) { stateFile = json(latest).stateFile; state = json(stateFile); }
  else {
    const directory = path.join(releaseRoot, timestamp());
    stateFile = path.join(directory, 'state.json');
    state = { schemaVersion: 1, version, docs, directory, createdAt: new Date().toISOString(), steps: {}, checkpoint: checkpoint(docs) };
    save(stateFile, state); save(latest, { stateFile });
  }
  if (state.version !== version || state.docs !== docs) throw new Error('Release state belongs to different inputs');
  if (options['--status']) { console.log(JSON.stringify({ stateFile, version, steps: state.steps, approval: state.plan ? approvalId(state.plan) : undefined }, null, 2)); return; }
  if (JSON.stringify(checkpoint(docs)) !== JSON.stringify(state.checkpoint)) throw new Error('Source changed after the release checkpoint. Review it and use --new-attempt; previous evidence is preserved.');
  if (options['--retry']) {
    const names = Object.keys(state.steps), from = names.indexOf(options['--retry']);
    if (from < 0) throw new Error('Unknown cached phase');
    if (state.steps.publication?.status === 'done' || existsSync(path.join(state.directory, 'publication-attempted.json'))) throw new Error('After publication, resume verification instead of rebuilding this version');
    for (const name of names.slice(from)) delete state.steps[name];
    delete state.plan; save(stateFile, state);
  }
  if (process.platform === 'darwin') {
    const awake = spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' });
    awake.on('error', () => console.warn('Could not inhibit idle sleep; keep this Mac awake until the release finishes.'));
    awake.unref();
    process.once('exit', () => { awake.kill(); });
  }
  const env = { ...process.env };
  if (existsSync(path.join(docs, '.env.local'))) {
    // Read credentials in-process; never put values in arguments or release records.
    const before = { ...process.env }; process.loadEnvFile(path.join(docs, '.env.local'));
    Object.assign(env, process.env); Object.assign(process.env, before);
  }
  env.PUPPETEER_EXECUTABLE_PATH ??= '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let active;
  const run = (label, command, commandArgs, cwd = repo, capture = false, extraEnv = {}) => {
    const logfile = path.join(state.directory, 'logs', `${timestamp()}-${label.replace(/[^a-z0-9]+/gi, '-')}.log`);
    mkdirSync(path.dirname(logfile), { recursive: true });
    const fd = openSync(logfile, 'wx');
    let result;
    try { result = spawnSync(command, commandArgs, { cwd, env: { ...env, ...extraEnv }, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: capture ? ['ignore', 'pipe', fd] : ['ignore', fd, fd] }); }
    finally { closeSync(fd); }
    if (capture && result.stdout) writeFileSync(logfile, result.stdout, { flag: 'a' });
    if (result.error || result.status !== 0) throw new Error(`${label} failed. See ${logfile}. Rerun the same release command to resume.`);
    return result.stdout ?? logfile;
  };
  const step = async (name, action) => {
    if (state.steps[name]?.status === 'done') { console.log(`${name}: reused`); return state.steps[name].data; }
    active = name; state.steps[name] = { status: 'running', startedAt: new Date().toISOString() }; save(stateFile, state);
    console.log(`${name}...`);
    try { const data = await action(); state.steps[name] = { ...state.steps[name], status: 'done', completedAt: new Date().toISOString(), data }; console.log(`${name}: passed`); return data; }
    catch (error) { state.steps[name].status = 'failed'; state.steps[name].message = error.message; throw error; }
    finally { state.checkpoint = checkpoint(docs); save(stateFile, state); active = undefined; }
  };
  const pack = label => {
    const directory = path.join(state.directory, label, timestamp()); mkdirSync(directory, { recursive: true });
    const [metadata] = JSON.parse(run(label, 'npm', ['pack', './framework', '--ignore-scripts', '--json', '--pack-destination', directory], repo, true));
    checkPackageInventory(metadata.files.map(item => item.path));
    const file = path.join(directory, metadata.filename), bytes = readFileSync(file);
    const result = { file, filename: metadata.filename, version: metadata.version, sha256: digest(bytes), integrity: metadata.integrity, files: metadata.files.length };
    if (result.version !== version) throw new Error('Packed package has a different version');
    verifyArchive(file, result); return result;
  };
  const install = archive => {
    const log = withCompilerLock(docs, version, archive, () => run('Install exact reviewed archive and dependency lock', 'npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], docs));
    const actual = json(path.join(docs, 'node_modules/.package-lock.json')).packages?.['node_modules/@shoalrun/cli'];
    const integrity = `sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`;
    if (actual?.version !== version || actual.integrity !== integrity) throw new Error('npm did not install the exact reviewed compiler archive');
    return log;
  };
  const output = path.join(docs, '.vercel/output'), staticSite = path.join(output, 'static'), privateSite = path.join(output, 'functions/__shoalrun/ask.func/site');
  await step('versions', () => {
    const pkgFile = path.join(repo, 'framework/package.json'), lockFile = path.join(repo, 'framework/package-lock.json');
    const pkg = json(pkgFile), lock = json(lockFile); pkg.version = version; lock.version = version; lock.packages[''].version = version;
    save(pkgFile, pkg); save(lockFile, lock);
    rewriteInstalls(repo); rewriteInstalls(docs);
    const changelog = path.join(repo, 'framework/CHANGELOG.md');
    writeFileSync(changelog, readFileSync(changelog, 'utf8').replace(/^## Unreleased$/m, `## ${version} — ${new Date().toISOString().slice(0, 10)}`));
    return { version };
  });
  await step('compiler-build', () => run('Build release compiler', 'npm', ['run', 'build', '--prefix', 'framework']));
  const bootstrap = await step('bootstrap-package', () => pack('bootstrap'));
  verifyArchive(bootstrap.file, bootstrap);
  await step('bootstrap-install', () => install(bootstrap.file));
  await step('snapshot-build', () => run('Build documentation snapshot', 'npm', ['run', 'docs:build'], docs));
  await step('snapshot-checks', () => {
    run('Documentation format', 'npm', ['run', 'docs:format'], docs);
    run('Documentation static contracts', node, ['scripts/check-built-docs.mjs', 'docs/docs.config.yaml', 'docs/dist'], docs);
    run('Documentation editorial contracts', 'npm', ['run', 'docs:editorial'], docs);
    run('Recipe source freshness', 'npm', ['run', 'docs:recipes:check'], docs);
  });
  const snapshotCommit = await step('snapshot-source', () => commit(docs, `Prepare documentation for ${version}`, file => /^(?:docs\/|scripts\/|tests\/|\.agents\/|\.vale\/|\.vale(?:-format)?\.ini$|package(?:-lock)?\.json$|AGENTS\.md$|README\.md$)/.test(file)));
  await step('snapshot-import', () => {
    run('Export reviewed candidate snapshot', node, ['scripts/export-agent-docs.mjs', 'docs/dist', '--compiler-package', bootstrap.file], docs);
    return run('Import pinned documentation snapshot', node, ['framework/scripts/import-docs-snapshot.mjs', path.join(docs, 'agent-docs'), '--source-commit', snapshotCommit]);
  });
  await step('source-checks', async () => {
    await new Promise((resolve, reject) => {
      const server = createServer();
      server.once('error', () => reject(new Error('This environment blocks local server checks. Run the same release command in a normal terminal; completed preparation is saved.')));
      server.listen(0, '127.0.0.1', () => server.close(resolve));
    });
    return run('Framework regression and skill checks', 'npm', ['run', 'test:compiled']);
  });
  const frameworkCommit = await step('framework-source', () => commit(repo, `Release ${version}`, releaseFrameworkFile));
  const archive = await step('final-package', () => pack('final'));
  verifyArchive(archive.file, archive);
  await step('compiler-equivalence', () => {
    const seals = [bootstrap, archive].map((item, index) => {
      const directory = path.join(state.directory, `inspect-${index}-${timestamp()}`); mkdirSync(directory, { recursive: true });
      run('Inspect compiler archive', 'tar', ['-xzf', item.file, '-C', directory]);
      return directorySeal(path.join(directory, 'package'), name => name === 'agent-docs' || name.startsWith('agent-docs' + path.sep));
    });
    if (seals[0].digest !== seals[1].digest) throw new Error('Final compiler differs from the one used to build the reviewed documentation snapshot');
    return seals[1];
  });
  await step('clean-install', () => run('Clean production package certification', node, ['framework/scripts/package-authoring-smoke.mjs', '--clean-install']));
  await step('docs-pin', () => {
    const pkgFile = path.join(docs, 'package.json'), lockFile = path.join(docs, 'package-lock.json');
    const pkg = json(pkgFile), lock = json(lockFile), dependency = lock.packages['node_modules/@shoalrun/cli'];
    pkg.dependencies['@shoalrun/cli'] = version; lock.packages[''].dependencies['@shoalrun/cli'] = version;
    dependency.version = version; dependency.resolved = `https://registry.npmjs.org/@shoalrun/cli/-/cli-${version}.tgz`; dependency.integrity = archive.integrity;
    save(pkgFile, pkg); save(lockFile, lock); install(archive.file);
    return run('Exact release input check', 'npm', ['run', 'docs:release-check'], docs);
  });
  await step('docs-settle', () => run('Settle final generated documentation dates', 'npm', ['run', 'docs:build'], docs));
  const docsCommit = await step('docs-source', () => commit(docs, `Use ${version} for the documentation site`, file => ['package.json', 'package-lock.json', 'docs/config/content-updates.json'].includes(file)));
  await step('production-build', async () => {
    for (const key of ['VOYAGE_API_KEY', 'OPENROUTER_API_KEY', 'JEV_API_KEY']) if (!env[key]) throw new Error(`Production build needs ${key} in the environment or the docs .env.local; no secret value was logged`);
    try {
      const response = await fetch('https://registry.npmjs.org/@shoalrun%2fcli', { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Registry unavailable');
    } catch { throw new Error('This environment cannot reach the registry/providers. Run the same release command in a normal terminal; local preparation is saved.'); }
    auditReleaseDependencies(path.join(repo, 'framework'), docs, run);
    return run('Build full production documentation', 'npm', ['run', 'docs:build-all'], docs);
  });
  await step('site-checks', () => {
    const extra = { SHOALRUN_BUILT_SITE: staticSite };
    try {
      run('Production documentation checks', 'npm', ['run', 'docs:check'], docs, false, extra);
      return run('Production site integration tests', 'npm', ['run', 'test:integration'], docs, false, extra);
    } finally {
      const reports = path.join(docs, '.shoalrun/afdocs');
      if (existsSync(reports)) cpSync(reports, path.join(state.directory, 'evidence', `afdocs-${timestamp()}`), { recursive: true, force: false, errorOnExist: true });
    }
  });
  const candidate = await step('sealed-site', async () => {
    if (changedFiles(repo).length || changedFiles(docs).length) throw new Error('Build changed source. Review those changes before approving the release');
    const { verifyDocsBundle } = await import(path.join(docs, 'scripts/build-docs-all.mjs')); await verifyDocsBundle(output);
    const project = json(path.join(docs, '.vercel/project.json'));
    if (project.projectName !== 'shoalrun') throw new Error('Expected the existing shoalrun Vercel project');
    const info = json(path.join(staticSite, 'build-info.json'));
    const cardsFile = path.join(privateSite, 'ai/answers.json'), cards = json(cardsFile), chunks = json(path.join(privateSite, 'ai/chunks.json'));
    const byId = new Map(chunks.chunks.map(chunk => [chunk.id, chunk]));
    save(path.join(state.directory, 'answer-review.json'), cards.cards.map(card => ({ id: card.id, question: card.question, answer: card.answer, sources: card.sources, passages: Object.keys(card.digests).map(id => byId.get(id)) })));
    return { ...directorySeal(output), buildId: info.buildId, cards: cards.cards.length, cardsDigest: digest(readFileSync(cardsFile)), documents: json(path.join(staticSite, 'documents.json')).documents.length };
  });
  const plan = { version, filename: archive.filename, sha256: archive.sha256, integrity: archive.integrity, frameworkCommit, docsCommit, buildId: candidate.buildId, bundleDigest: candidate.digest, cardsDigest: candidate.cardsDigest };
  state.plan = plan; save(stateFile, state);
  const planFile = path.join(path.dirname(archive.file), 'plan.json'); save(planFile, plan);
  save(path.join(path.dirname(archive.file), 'verified.json'), { ...plan, verifiedAt: new Date().toISOString() });
  console.log(`Ready: ${version}; ${candidate.documents} pages; ${candidate.cards} answer cards.\nReview: ${path.join(state.directory, 'answer-review.json')}\nApproval ID: ${approvalId(plan)}`);
  let approval = options['--approve'];
  if (!options['--prepare'] && !approval && process.stdin.isTTY) {
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    try { if ((await terminal.question(`After reviewing the package, site, and answers, type "ship ${version}" to publish, push both repositories, and deploy: `)).trim() === `ship ${version}`) approval = approvalId(plan); }
    finally { terminal.close(); }
  }
  if (!approval) { console.log(`No publication performed. Resume with: npm run release -- ${version} --publish --approve ${approvalId(plan)}`); return; }
  requireApproval(plan, approval);
  if (!options['--publish'] && !process.stdin.isTTY) throw new Error('Noninteractive publication needs --publish and --approve');
  verifyArchive(archive.file, plan);
  if (directorySeal(output).digest !== plan.bundleDigest) throw new Error('Reviewed site bundle changed');
  for (const [root, commit] of [[repo, frameworkCommit], [docs, docsCommit]]) {
    if (git(root, 'rev-parse', 'HEAD') !== commit || changedFiles(root).length) throw new Error('Source changed after review');
    git(root, 'fetch', '--no-tags', 'origin', 'refs/heads/main');
    git(root, 'merge-base', '--is-ancestor', 'FETCH_HEAD', commit);
  }
  const lookup = async () => {
    const response = await fetch(`https://registry.npmjs.org/@shoalrun%2fcli/${version}`, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Registry check failed: HTTP ${response.status}`);
    return response.json();
  };
  await step('publication', async () => {
    const marker = path.join(state.directory, 'publication-attempted.json');
    let tag;
    if (!existsSync(marker) && !await lookup()) {
      run('Public registry authentication', 'npm', ['whoami', '--registry=https://registry.npmjs.org', '--@shoalrun:registry=https://registry.npmjs.org']);
      const response = await fetch('https://registry.npmjs.org/@shoalrun%2fcli', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Cannot determine the existing npm distribution tag');
      const tags = (await response.json())['dist-tags'] ?? {};
      tag = releaseTag(version, tags.latest);
      if (!releaseTags(version, tags).includes(tag)) throw new Error(`Release would move npm ${tag} backwards; no upload performed`);
    }
    const result = await publishOnce({ marker, expected: plan, lookup, publish: async () => {
      const registry = ['--registry=https://registry.npmjs.org', '--@shoalrun:registry=https://registry.npmjs.org'];
      // The upload can need an npm OTP. Keep its terminal interaction intact.
      const child = spawnSync('npm', ['publish', archive.file, '--access', 'public', '--tag', tag, '--ignore-scripts', ...registry], { cwd: repo, env, stdio: 'inherit' });
      if (child.error || child.status !== 0) throw new Error('Upload did not complete normally. Resume registry verification; do not upload this version again blindly.');
    } });
    for (let at = 0; at < 12; at++) {
      const registered = await lookup();
      if (registered?.dist?.integrity === plan.integrity && registered.version === version) return { verifiedAt: new Date().toISOString() };
      if (registered) throw new Error('Registry checksum differs from the reviewed archive');
      console.log(`Registry confirmation pending (${result}); no second upload will occur.`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Registry confirmation is pending. Rerun the same command; it will not upload again.');
  });
  await step('distribution-tags', async () => {
    const registered = await lookup();
    if (registered?.version !== version || registered?.dist?.integrity !== plan.integrity) throw new Error('Verify the reviewed registry artifact before changing distribution tags');
    const metadata = async () => {
      const response = await fetch('https://registry.npmjs.org/@shoalrun%2fcli', { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Distribution tag lookup failed: HTTP ${response.status}`);
      return (await response.json())['dist-tags'] ?? {};
    };
    const current = await metadata();
    const tags = releaseTags(version, current);
    if (!tags.length) throw new Error('Newer distribution tags already exist; review the release without moving them backwards');
    for (const tag of tags) if (current[tag] !== version) {
      const child = spawnSync('npm', ['dist-tag', 'add', `@shoalrun/cli@${version}`, tag, '--registry=https://registry.npmjs.org', '--@shoalrun:registry=https://registry.npmjs.org'], { cwd: repo, env, stdio: 'inherit' });
      if (child.error || child.status !== 0) throw new Error(`npm ${tag} update did not finish; rerun the same command to resume tagging without uploading again`);
    }
    const verified = await metadata();
    for (const tag of tags) if (verified[tag] !== version) throw new Error(`npm ${tag} confirmation is pending; rerun the same command to resume`);
    return { tags, verifiedAt: new Date().toISOString() };
  });
  await step('framework-sync', () => completeRelease(repo, planFile));
  await step('docs-sync', () => {
    git(docs, 'push', '--atomic', 'origin', `${docsCommit}:refs/heads/main`);
    if (git(docs, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0] !== docsCommit) throw new Error('Docs main differs from the reviewed commit');
    return { docsCommit };
  });
  const origin = 'https://www.shoalrun.com/';
  const liveMatches = async () => {
    try { const response = await fetch(new URL('build-info.json', origin), { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000) }); return response.ok && (await response.json()).buildId === candidate.buildId; }
    catch { return false; }
  };
  await step('deployment', async () => {
    const marker = path.join(state.directory, 'deployment-attempted.json');
    await deployOnce({ marker, buildId: candidate.buildId, live: liveMatches,
      authenticate: async () => run('Vercel authentication', 'vercel', ['whoami'], docs),
      deploy: async () => run('Upload reviewed prebuilt production bundle', 'vercel', ['deploy', '--prebuilt', '--prod', '--archive=tgz'], docs) });
    for (let at = 0; at < 24; at++) { if (await liveMatches()) return { buildId: candidate.buildId }; await new Promise(resolve => setTimeout(resolve, 5000)); }
    throw new Error('Production has not converged on this build. Resume verification; no repeat upload will be attempted.');
  });
  await step('live-verification', async () => {
    if (!await liveMatches()) throw new Error('Live build identity differs from the reviewed bundle');
    run('Live deployment contract checks', node, ['scripts/check-deployment.mjs', origin, '--chat'], docs);
    const response = await fetch(new URL('__shoalrun/search', origin), { method: 'POST', headers: { Origin: new URL(origin).origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'independent product versions', variant: 'production|current|en', limit: 5 }), signal: AbortSignal.timeout(20000) });
    const search = await response.json();
    if (!response.ok || search.mode !== 'vector') throw new Error(`Live search did not return vector mode: ${search.fallbackReason ?? response.status}`);
    return { url: origin, buildId: candidate.buildId, searchMode: search.mode, verifiedAt: new Date().toISOString() };
  });
  console.log(`Complete: @shoalrun/cli@${version}, GitHub source/tag, and ${origin} are verified.\nEvidence: ${state.directory}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) release().catch(error => { console.error(error.message); process.exitCode = 1; });
