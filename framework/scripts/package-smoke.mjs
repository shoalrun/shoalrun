import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-package-smoke-'));
const npmEnv = { ...process.env, npm_config_cache: path.join(temporary, 'npm-cache') };

function run(command, args, directory, env = npmEnv) {
  return execFileSync(command, args, { cwd: directory, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

try {
  const packed = JSON.parse(run('npm', ['pack', framework, '--pack-destination', temporary, '--json'], temporary));
  assert.equal(packed.length, 1, 'npm pack should produce one tarball');
  const paths = packed[0].files.map(file => file.path);
  assert.ok(!paths.some(file => file.endsWith('.test.js')), 'compiled development tests must stay outside the runtime package');
  assert.ok(!paths.some(file => /^(?:eval|scripts)\//.test(file)), 'repository evaluations must stay outside the package');
  assert.ok(!paths.some(file => /dist\/(?:authoring-agent|authoring-config|authoring\.|claim-|audit-claims)/.test(file)), 'retired native runtime must not survive in build output');
  const consumer = path.join(temporary, 'consumer');
  await mkdir(consumer);
  run('npm', ['install', path.join(temporary, packed[0].filename), '--no-audit', '--no-fund'], consumer, { ...npmEnv, PUPPETEER_SKIP_DOWNLOAD: '1' });
  const cli = path.join(consumer, 'node_modules', '.bin', 'shoalrun');
  const docsSearch = JSON.parse(run(cli, ['docs', 'search', 'MCP'], consumer));
  assert.equal(docsSearch.status, 'ok', 'packaged docs search should work without a project');
  assert.ok(docsSearch.results.some(result => result.id === 'guide.mcp'));
  const docsPage = JSON.parse(run(cli, ['docs', 'read', 'guide.mcp', '--json', '--max-tokens', '256'], consumer));
  assert.equal(docsPage.budget.truncated, true, 'packaged page reads should enforce token budgets');
  const mcp = await import(pathToFileURL(path.join(consumer, 'node_modules', '@shoalrun/cli', 'dist', 'docs-mcp.js')).href);
  await mcp.createDocsMcpServer().close();
  process.stdout.write('Packed documentation core and MCP runtime: passed\n');


  for (const starter of ['minimal', 'api-docs']) {
    const project = path.join(consumer, starter);
    run(cli, ['init', project, '--starter', starter], consumer);
    run(cli, ['config', 'validate', path.join(project, 'docs.config.yaml')], consumer);
    const checked = JSON.parse(run(cli, ['check', '--json'], project));
    assert.equal(checked.status, 'ok', `${starter} should pass packaged local checks`);
    assert.ok(checked.results.some(result => result.id === 'links'), 'packaged CLI should include link checks');
    for (const template of ['tutorial', 'how-to', 'reference', 'explanation', 'recipe', 'ingredient', 'cookbook']) {
      const target = path.join(project, 'content', 'drafts', `${template}.mdx`);
      const scaffolded = JSON.parse(run(cli, ['scaffold', template, '-n', target], project));
      assert.equal(scaffolded.template, template, `${template} should ship in the package`);
    }
    if (starter === 'api-docs') {
      const target = path.join(project, 'content', 'drafts', 'api-reference.mdx');
      const scaffolded = JSON.parse(run(cli, ['scaffold', 'api-reference', '-n', target, '--operation', 'cedar.createEnrollment'], project));
      assert.equal(scaffolded.template, 'api-reference', 'API reference should ship in the package');
      assert.match(await readFile(target, 'utf8'), /cedar\.createEnrollment/);
      await rm(target);
    }
    run(cli, ['build', path.join(project, 'docs.config.yaml'), path.join(project, 'site-dist')], consumer);
    const manifest = JSON.parse(await readFile(path.join(project, 'site-dist', 'documents.json'), 'utf8'));
    assert.ok(manifest.documents.length > 0, `${starter} should build published pages`);
    if (starter === 'api-docs') assert.ok(Object.keys(manifest.operations).length > 0, 'api-docs should build API operations');

    if (starter === 'minimal') {
      const configFile = path.join(project, 'docs.config.yaml');
      await writeFile(configFile, await readFile(configFile, 'utf8') + '\nauthoring:\n  directives: Use reviewed examples.\n  guideFiles: [content/welcome.mdx]\n');
      const context = JSON.parse(run(cli, ['docs', 'context', 'guide.welcome'], project));
      assert.equal(context.authoring.directives, 'Use reviewed examples.');
      const source = path.join(project, context.sources[0].file);
      const original = await readFile(source, 'utf8');
      const candidate = original + '\nA reviewed clarification.\n';
      const request = path.join(project, 'edit-request.json');
      const plan = path.join(project, 'edit-plan.json');
      await writeFile(request, JSON.stringify({ edits: [{ file: context.sources[0].file, baseDigest: context.sources[0].baseDigest, content: candidate }] }));
      run(cli, ['docs', 'plan', '--request-file', request, '--out', plan], project);
      run(cli, ['docs', 'apply', plan, '--check'], project);
      assert.equal(await readFile(source, 'utf8'), original, 'checking must not change authored sources');
      run(cli, ['docs', 'apply', plan], project);
      assert.equal(await readFile(source, 'utf8'), candidate, 'applying writes the reviewed candidate');
      const audited = JSON.parse(run(cli, ['audit'], project));
      assert.equal(audited.status, 'ok');
      process.stdout.write('Packed existing-agent context, guidance, plan, check, and apply: passed\n');
    }

    const evalTasks = path.join(project, 'eval-tasks.json');
    const evalReport = path.join(project, 'eval-results.json');
    await writeFile(evalTasks, JSON.stringify({ schemaVersion: 1, tasks: [{ id: 'find-start', prompt: 'Find the first page.', allowedTools: ['fetch'], criteria: [{ id: 'citation', description: 'Cite the first page.' }] }] }));
    const prepared = JSON.parse(run(cli, ['eval', 'prepare', path.join(project, 'site-dist'), '--tasks', evalTasks, '--out', evalReport], consumer));
    assert.equal(prepared.tasks, 1, 'packaged eval preparation should read a built starter');
    assert.equal(JSON.parse(await readFile(evalReport, 'utf8')).results[0].status, 'skipped', 'templates must never manufacture passing tasks');
    process.stdout.write(`Packed ${starter} starter: ${manifest.documents.length} pages\n`);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
