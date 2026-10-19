// Packed public contracts against isolated consumers. Default mode shares the
// installed dependencies; --clean-install installs production dependencies anew.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || args.length === 1 && args[0] !== '--clean-install') throw new Error('Usage: node package-authoring-smoke.mjs [--clean-install]');
const cleanInstall = args.includes('--clean-install');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-packed-authoring-'));
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|TOKEN|SECRET|PROVIDER|^NODE_PATH$/i.test(key))), PUPPETEER_EXECUTABLE_PATH: path.join(temporary, 'no-browser'), npm_config_cache: path.join(temporary, 'npm-cache'), ...(cleanInstall ? { npm_config_registry: 'https://registry.npmjs.org', npm_config_userconfig: '/dev/null' } : {}) };
const run = (command, args, cwd) => execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const [pack] = JSON.parse(run('npm', ['pack', framework, '--ignore-scripts', '--pack-destination', temporary, '--json'], temporary));
  assert.ok(pack.files.some(file => file.path === 'dist/authoring-project.js'));
  assert.ok(pack.files.some(file => file.path === 'skills/shoalrun-component-author/SKILL.md'));
  assert.ok(pack.files.some(file => file.path === 'examples/components/comparison.mjs'));
  for (const name of ['components.json', 'plugin.mjs', 'browser.jsx', 'package-lock.json', 'LICENSE.react.txt']) assert.ok(pack.files.some(file => file.path === `examples/components/copy-text/${name}`));
  for (const name of ['components.json', 'plugin.mjs', 'model.js', 'policy.json', 'browser.jsx', 'style.css', 'package-lock.json', 'LICENSE.react.txt']) assert.ok(pack.files.some(file => file.path === `examples/components/retry-budget/${name}`));
  assert.ok(!pack.files.some(file => file.path.includes('/node_modules/')));
  assert.ok(pack.files.some(file => file.path === 'dist/components.d.ts'));
  assert.ok(!pack.files.some(file => file.path.endsWith('.test.js')), 'runtime tarballs must exclude compiled development tests');
  assert.ok(!pack.files.some(file => /experiments|langgraph/.test(file.path)));
  const consumer = path.join(temporary, 'consumer');
  await mkdir(path.join(consumer, 'node_modules'), { recursive: true });
  const name = JSON.parse(await readFile(path.join(framework, 'package.json'), 'utf8')).name;
  let installed;
  if (cleanInstall) {
    await writeFile(path.join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    console.log('Installing the packed framework with fresh production dependencies and an empty npm cache.');
    console.log(run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', path.join(temporary, pack.filename)], consumer).trim());
    installed = path.join(consumer, 'node_modules', name);
  } else {
    run('tar', ['-xzf', path.join(temporary, pack.filename), '-C', path.join(consumer, 'node_modules')], temporary);
    installed = path.join(consumer, 'node_modules/package');
    await mkdir(path.dirname(path.join(consumer, 'node_modules', name)), { recursive: true });
    await symlink(installed, path.join(consumer, 'node_modules', name));
    await symlink(path.join(framework, 'node_modules'), path.join(installed, 'node_modules'));
  }
  // A component package owns its React dependency. The framework does not.
  if (!cleanInstall) for (const dependency of ['react', 'react-dom', 'scheduler']) await cp(path.join(framework, 'node_modules', dependency), path.join(consumer, 'node_modules', dependency), { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies.pele, '1.6.0');
  assert.ok(!manifest.dependencies.puppeteer && !manifest.dependencies['@mermaid-js/mermaid-cli']);
  assert.ok(!Object.keys(manifest.dependencies).some(name => /langgraph|anthropic|openai|jev/i.test(name)));
  if (!cleanInstall) await writeFile(path.join(consumer, 'package.json'), JSON.stringify({ type: 'module' }));
  await writeFile(path.join(consumer, 'inspect.mjs'), `import { inspectAuthoringProject, searchDocumentation, getDocumentationPage, bundledDocumentation, authoringApiVersion, authoringCapabilities, validateAuthoringChanges, authoringValidationStatus, authoringReview, startAuthoringPreview } from '@shoalrun/cli/authoring';
import assert from 'node:assert/strict';
import { componentApiVersion } from '@shoalrun/cli/components';
assert.equal(componentApiVersion, 1);
assert.equal(authoringApiVersion, 1);
assert.ok(authoringCapabilities.includes('project-discovery'));
const project = await inspectAuthoringProject(process.argv[2]);
assert.ok(project.entries.length > 0);
assert.ok((await searchDocumentation(bundledDocumentation, 'Steps')).results.some(result => result.id === 'guide.component.steps'));
assert.match((await getDocumentationPage(bundledDocumentation, 'guide.component.steps')).content, /<Step title=/);
assert.ok((await getDocumentationPage(bundledDocumentation, 'guide.custom-components')).content.includes('content('));
const validation = await validateAuthoringChanges(process.argv[2], { files: ['content/snapshot.mdx'] });
try {
  assert.equal(validation.status, 'ok', JSON.stringify(validation.findings));
  assert.ok(validation.coverage.rendered.some(document => document.id === 'consumer.snapshot'));
  assert.equal((await authoringValidationStatus(validation.artifacts.report)).current, true);
  const review = await authoringReview(validation.artifacts.report);
  assert.equal(review.kind, 'shoalrun-authoring-review');
  assert.equal(review.pages.length, 1);
  const preview = await startAuthoringPreview(validation.artifacts.report, { port: 0 });
  try {
    assert.equal((await fetch(preview.pages[0].htmlUrl)).status, 200);
    assert.match(await (await fetch(preview.pages[0].markdownUrl)).text(), /Inspect the result/);
    assert.equal((await (await fetch(preview.statusUrl)).json()).snapshotId, validation.snapshotId);
  } finally { await preview.close(); }
} finally { await (await import('node:fs/promises')).rm(validation.artifacts.directory, { recursive: true, force: true }); }
console.log(JSON.stringify({ pages: project.entries.length, schemaVersion: project.schemaVersion }));
`);
  assert.match(await readFile(path.join(installed, 'skills/shoalrun-component-author/SKILL.md'), 'utf8'), /name: shoalrun-component-author/);
  const cli = path.join(installed, manifest.bin.shoalrun);
  const runCli = (args, cwd) => cleanInstall ? run(path.join(consumer, 'node_modules/.bin/shoalrun'), args, cwd) : run(process.execPath, [cli, ...args], cwd);
  assert.match(runCli(['--help'], consumer), /docs validate/);
  const skills = JSON.parse(runCli(['skills', 'list', '--json'], consumer)).skills;
  assert.ok(skills.some(skill => skill.name === 'shoalrun-author'));
  for (const skill of skills) {
    assert.ok((await realpath(skill.file)).startsWith(await realpath(installed) + path.sep));
    const read = JSON.parse(runCli(['skills', 'read', skill.name, '--json'], consumer));
    assert.equal(read.content, await readFile(skill.file, 'utf8'));
  }
  for (const starter of ['minimal', 'api-docs']) {
    const project = path.join(consumer, starter);
    // Use the public packaged initializer, rather than a dist implementation import.
    runCli(['init', project, '--starter', starter], consumer);
    const config = path.join(project, 'docs.config.yaml');
    await mkdir(path.join(project, 'node_modules', 'comparison', 'dist'), { recursive: true });
    await writeFile(path.join(project, 'node_modules/comparison/package.json'), '{"name":"comparison","exports":"./dist/components.json","type":"module"}');
    await writeFile(path.join(project, 'node_modules/comparison/dist/comparison.mjs'), `import 'component-dependency';\n${await readFile(path.join(installed, 'examples/components/comparison.mjs'), 'utf8')}`);
    await mkdir(path.join(project, 'node_modules/component-dependency/dist'), { recursive: true });
    await writeFile(path.join(project, 'node_modules/component-dependency/package.json'), '{"name":"component-dependency","exports":"./dist/index.js","type":"module"}');
    await writeFile(path.join(project, 'node_modules/component-dependency/dist/index.js'), 'export const version = 1;');
    await writeFile(path.join(project, 'node_modules/comparison/dist/components.json'), await readFile(path.join(installed, 'examples/components/components.json')));
    await cp(path.join(installed, 'examples/components/retry-budget'), path.join(project, 'components/retry-budget'), { recursive: true });
    await cp(path.join(installed, 'examples/components/copy-text'), path.join(project, 'components/copy-text'), { recursive: true });
    if (cleanInstall) for (const component of ['retry-budget', 'copy-text']) run('npm', ['ci', '--prefix', path.join(project, 'components', component), '--no-audit', '--no-fund'], project);
    await writeFile(config, `${await readFile(config, 'utf8')}\ncomponents:\n  - comparison\n  - ./components/retry-budget/components.json\n  - ./components/copy-text/components.json\n`);

    await writeFile(path.join(project, 'AGENTS.md'), 'Procedures require a reviewed component example.\n');
    await writeFile(path.join(project, 'dirty.txt'), 'pre-existing local edits\n');
    const baseline = await readFile(path.join(project, 'dirty.txt'));
    const context = JSON.parse(runCli(['docs', 'project'], project));
    assert.equal(context.summary.policyStatus, 'requires-interpretation');
    const guidance = JSON.parse(runCli(['docs', 'project', '--section', 'guidance'], project));
    assert.ok(guidance.entries.some(entry => entry.file === 'AGENTS.md'));
    const source = JSON.parse(runCli(['docs', 'source', 'AGENTS.md'], project));
    assert.match(source.content, /reviewed component example/);
    const reference = JSON.parse(runCli(['docs', 'read', 'guide.component.steps', '--json'], project));
    assert.match(reference.content, /semantic ordered list/);
    const taskBaseline = path.join(consumer, `${starter}-baseline.json`);
    runCli(['docs', 'baseline', '--out', taskBaseline], project);
    await writeFile(path.join(project, 'content/snapshot.mdx'), '---\nid: consumer.snapshot\ntitle: Snapshot procedure\nsummary: Validate both representations.\ntype: how-to\nslug: /snapshot\naccess: { policy: draft }\n---\n\n<Steps>\n<Step title="Read">Read the source.</Step>\n<Step title="Inspect">Inspect the result.</Step>\n</Steps>\n');
    await writeFile(path.join(project, 'content/snapshot.mdx'), `${await readFile(path.join(project, 'content/snapshot.mdx'), 'utf8')}\n<Diagram title="Review flow" summary="Read, then inspect." engine="mermaid" width="520">\n\n\`\`\`mermaid\nflowchart LR\nRead --> Inspect\n\`\`\`\n\n</Diagram>\n`);
    await writeFile(path.join(project, 'content/snapshot.mdx'), `${await readFile(path.join(project, 'content/snapshot.mdx'), 'utf8')}\n<Comparison title="Hosting choices">\n<Tab label="Local">\nLocal keeps your files. [Read setup](https://example.com/setup)\n\n\`\`\`sh\nrun local\n\`\`\`\n</Tab>\n<Tab label="Hosted">\nHosted requires an account.\n</Tab>\n</Comparison>\n`);
    await writeFile(path.join(project, 'content/snapshot.mdx'), `${await readFile(path.join(project, 'content/snapshot.mdx'), 'utf8')}\n<RetryBudget />\n`);
    await writeFile(path.join(project, 'content/snapshot.mdx'), `${await readFile(path.join(project, 'content/snapshot.mdx'), 'utf8')}\n<CopyText>\nContact support@example.com for help.\n</CopyText>\n`);
    const validation = JSON.parse(runCli(['docs', 'validate', '--baseline', taskBaseline, '--artifacts', path.join(consumer, `${starter}-validation`)], project));
    assert.equal(validation.status, 'ok', JSON.stringify(validation.findings));
    assert.match(await readFile(path.join(validation.artifacts.site, 'snapshot.md'), 'utf8'), /Hosted requires an account/);
    assert.match(await readFile(path.join(validation.artifacts.site, 'snapshot.md'), 'utf8'), /retryDelayBounds/);
    assert.match(await readFile(path.join(validation.artifacts.site, 'snapshot.md'), 'utf8'), /Contact <support@example.com> for help\./);
    assert.match(await readFile(path.join(validation.artifacts.site, 'snapshot/index.html'), 'utf8'), /data-shoalrun-component="CopyText"/);
    assert.match(await readFile(path.join(validation.artifacts.site, 'snapshot/index.html'), 'utf8'), /data-component-module/);
    assert.ok(validation.changed.some(change => change.file === 'content/snapshot.mdx' && change.operation === 'created'));
    assert.equal(JSON.parse(runCli(['docs', 'validation-status', validation.artifacts.report], project)).current, true);
    const cliReview = JSON.parse(runCli(['docs', 'review', validation.artifacts.report], project));
    assert.equal(cliReview.snapshotId, validation.snapshotId);
    assert.ok(cliReview.pages.some(page => page.id === 'consumer.snapshot'));
    assert.match(runCli(['docs', 'review', validation.artifacts.report, '--format', 'markdown'], project), /# Authoring review/);
    const library = JSON.parse(run(process.execPath, [path.join(consumer, 'inspect.mjs'), config], consumer));
    assert.equal(library.schemaVersion, 1);
    assert.deepEqual(await readFile(path.join(project, 'dirty.txt')), baseline);
    process.stdout.write(`${cleanInstall ? 'Clean-installed' : 'Packed'} ${starter} project/reference, snapshot, review and preview CLI/public library: passed (${library.pages} pages)\n`);
  }
} finally { await rm(temporary, { recursive: true, force: true }); }
