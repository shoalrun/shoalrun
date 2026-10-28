import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, symlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { exportContent } from './content-export.js';
import { exportDigest, validateExportSvg } from './content-export-assets.js';
import { validateExportTarget } from './content-export-config.js';
import { compile } from './compiler.js';

const framework = fileURLToPath(new URL('..', import.meta.url));
async function fixture(t: any) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.join(framework, 'examples/help-drawer'), root, { recursive: true });
  await mkdir(path.join(root, 'node_modules/@shoalrun'), { recursive: true });
  await symlink(framework, path.join(root, 'node_modules/@shoalrun/cli'));
  return { root, config: path.join(root, 'docs.config.yaml'), output: path.join(root, 'out') };
}
async function manifest(output: string) { return JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')); }
const page = (id: string, body: string, fields = '') => `---\nid: ${id}\ntitle: ${id}\nsummary: Example help.\nslug: /${id}\n${fields}---\n${body}\n`;

test('documents sharing a route export their own images in both representations', async t => {
  const f = await fixture(t);
  const images = new Map<string, string>();
  for (const id of ['first', 'second']) {
    const directory = path.join(f.root, 'content', id);
    await mkdir(directory);
    const image = `<svg xmlns="http://www.w3.org/2000/svg"><text>${id}</text></svg>`;
    images.set(id, image);
    await writeFile(path.join(directory, 'image.svg'), image);
    const body = '![Inline](./image.svg)\n\n![Reference][picture]\n\n[picture]: ./image.svg\n\n<Image src="./image.svg" alt="Component" expand />\n\n<Hero tagline="Example images" image="./image.svg" imageAlt="Hero image" />\n';
    await writeFile(path.join(directory, 'page.mdx'), page(id, body, 'layout: landing\n').replace(`slug: /${id}`, 'slug: /shared'));
  }
  await exportContent(f.config, f.output, { documents: [...images.keys()] });
  const data = await manifest(f.output);
  assert.equal(data.assets.length, 2);
  for (const doc of data.resources) {
    const expected = `assets/${exportDigest(images.get(doc.ref.documentId)!)}.svg`;
    assert.deepEqual(doc.assets, [expected]);
    assert.equal(await readFile(path.join(f.output, expected), 'utf8'), images.get(doc.ref.documentId));
    for (const format of ['html', 'markdown']) {
      const body = await readFile(path.join(f.output, doc.representations[format].path), 'utf8');
      assert.ok(body.includes(`/${expected}`), `${doc.ref.documentId}: ${format}`);
      for (const [otherId, image] of images) if (otherId !== doc.ref.documentId) assert.ok(!body.includes(exportDigest(image)));
    }
  }
});

test('generated links retain document identity when export routes overlap', async t => {
  const f = await fixture(t);
  for (const id of ['first', 'second']) {
    await writeFile(path.join(f.root, `content/${id}.md`), page(id, 'Recipe instructions.', 'type: recipe\n').replace(`slug: /${id}`, 'slug: /shared'));
  }
  await writeFile(f.config, (await readFile(f.config, 'utf8')) + '\ncookbooks:\n  choices:\n    title: Recipes\n    options: [{ id: second, label: Second, doc: second }]\nrelationships: [{ id: next, from: notice, to: second, type: next-step, reason: Continue here. }]\n');
  await writeFile(path.join(f.root, 'content/notice.mdx'), page('notice', '<DocCard doc="second" />\n\n<RelatedReading />\n\n<CookbookChooser id="choices" />\n',
    'type: changelog-entry\ndate: "2026-10-25"\nsubjectLifecycle: deprecated\nsubjectDeprecation: { replacement: second, migration: second }\nchange: { kind: breaking, affects: [second], migration: second }\n'));
  await exportContent(f.config, f.output, { documents: ['first', 'second', 'notice'] });
  const data = await manifest(f.output);
  const notice = data.resources.find((doc: any) => doc.ref.documentId === 'notice');
  const target = data.resources.find((doc: any) => doc.ref.documentId === 'second');
  for (const format of ['html', 'markdown']) {
    const links = notice.representations[format].links;
    assert.equal(links.length, 7);
    assert.ok(links.every((link: any) => link.kind === 'resource' && link.ref?.documentId === 'second' && link.href === `/${target.representations[format].path}`));
    const body = await readFile(path.join(f.output, notice.representations[format].path), 'utf8');
    assert.ok(body.includes(`/${target.representations[format].path}`));
    assert.ok(!body.includes('/shared'));
  }
});

test('whole-page portable bundle retains meaning, rebases assets, and has stable byte identities', async t => {
  const f = await fixture(t);
  const result = await exportContent(f.config, f.output, { target: 'app-help' });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.documentIds, ['guide.billing', 'guide.keys']);
  let data = await manifest(f.output);
  assert.equal(data.kind, 'shoalrun-content-export');
  const { digest, ...payload } = data;
  assert.equal(digest, exportDigest(JSON.stringify(payload)));
  const keys = data.resources.find((doc: any) => doc.ref.documentId === 'guide.keys');
  const html = await readFile(path.join(f.output, keys.representations.html.path), 'utf8');
  const md = await readFile(path.join(f.output, keys.representations.markdown.path), 'utf8');
  for (const body of [html, md]) {
    for (const expected of ['Developers', 'Operators', 'Development', 'Production', 'Contact the workspace owner']) assert.ok(body.includes(expected), expected);
    assert.ok(!body.includes('presentationOnly'));
    assert.ok(!body.includes('data-component-module'));
  }
  assert.match(html, /src="\/help\/assets\/[a-f0-9]+\.svg"/);
  assert.match(html, /data-export-link="link-1"/);
  assert.ok(keys.representations.html.links.some((link: any) => link.kind === 'resource' && link.ref?.documentId === 'guide.billing'));
  assert.ok(keys.representations.html.links.some((link: any) => link.kind === 'canonical' && link.href === 'https://docs.example.com/account'));
  assert.ok(keys.representations.html.anchors.every((anchor: any) => anchor.exportedId.startsWith('sr-')));
  assert.equal(keys.assets.length, 2);
  for (const file of data.files) assert.equal(exportDigest(await readFile(path.join(f.output, file.path))), file.digest);
  await exportContent(f.config, f.output, { target: 'app-help' });
  assert.equal((await manifest(f.output)).digest, digest);
  await writeFile(path.join(f.root, 'content/keys.mdx'), (await readFile(path.join(f.root, 'content/keys.mdx'), 'utf8')).replace('title: API keys', 'title: Keys and scopes'));
  await exportContent(f.config, f.output, { target: 'app-help' });
  data = await manifest(f.output);
  assert.notEqual(data.digest, digest);
  assert.equal(data.resources.find((doc: any) => doc.ref.documentId === 'guide.keys').representations.html.path, keys.representations.html.path);
});

test('export ignores website nav, theme, and contentFilter but enforces independent selection', async t => {
  const f = await fixture(t);
  await writeFile(f.config, (await readFile(f.config, 'utf8')).replace('  title: Acme documentation', '  contentFilter: { audience: [developer] }') + '\nnavigation: [{ id: typo, doc: missing.page }]\ntheme: { mode: invalid }\n');
  await writeFile(path.join(f.root, 'content/keys.mdx'), (await readFile(path.join(f.root, 'content/keys.mdx'), 'utf8')).replace('slug: /api-keys', 'slug: /api-keys\naudiences: [operator]'));
  await assert.rejects(exportContent(f.config, f.output, { target: 'app-help' }), /no eligible canonical website fallback/);
  const keyFile = path.join(f.root, 'content/keys.mdx');
  await writeFile(keyFile, (await readFile(keyFile, 'utf8')).replace('[Full account guide](doc:guide.account)', 'Account guidance.'));
  const result = await exportContent(f.config, f.output, { target: 'app-help' });
  assert.equal(result.documents, 2);
  const data = await manifest(f.output);
  assert.ok(data.resources.every((doc: any) => doc.canonicalUrl === undefined));
  await assert.rejects(exportContent(f.config, path.join(f.root, 'missing'), { documents: ['guide.no-such-page'] }), /missing, non-public/);
  await writeFile(f.config, (await readFile(f.config, 'utf8')).replace('documents: [guide.keys, guide.billing]', 'documents: [guide.keys, guide.billing]\n    contentFilter: { audience: [developer] }'));
  await assert.rejects(exportContent(f.config, path.join(f.root, 'excluded'), { target: 'app-help' }), /excluded by the export contentFilter/);
});

test('unavailable fallback, anchors, private docs, and unsafe assets fail without replacing output', async t => {
  const f = await fixture(t);
  await exportContent(f.config, f.output, { target: 'app-help' });
  const before = await readFile(path.join(f.output, 'manifest.json'), 'utf8');
  const source = await readFile(path.join(f.root, 'content/account.md'), 'utf8');
  await writeFile(path.join(f.root, 'content/account.md'), source.replace('slug: /account', 'slug: /account\naccess: { policy: private }'));
  await assert.rejects(exportContent(f.config, f.output, { target: 'app-help' }), /unknown document link/);
  assert.equal(await readFile(path.join(f.output, 'manifest.json'), 'utf8'), before);
  await writeFile(path.join(f.root, 'content/account.md'), source);
  const keys = path.join(f.root, 'content/keys.mdx');
  const original = await readFile(keys, 'utf8');
  await writeFile(keys, original + '\n[Bad anchor](#does-not-exist)\n');
  await assert.rejects(exportContent(f.config, f.output, { target: 'app-help' }), /Missing export anchor/);
  await writeFile(keys, original + '\n![Escaping asset](../outside.svg)\n');
  await writeFile(path.join(f.root, 'outside.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await assert.rejects(exportContent(f.config, f.output, { target: 'app-help' }), /escapes the configured asset roots/);
  assert.equal(await readFile(path.join(f.output, 'manifest.json'), 'utf8'), before);
  await assert.rejects(exportContent(f.config, f.root, { target: 'app-help' }), /escapes|Output directory/);
});

test('publication selection and configuration errors are explicit', async t => {
  const f = await fixture(t);
  await writeFile(f.config, (await readFile(f.config, 'utf8')).replace('  channels:\n', '  channels:\n    preview: {}\n').replace('  enabled:\n', '  enabled:\n    - { channel: preview, version: current }\n'));
  await assert.rejects(exportContent(f.config, f.output), /multiple enabled publications/);
  await assert.rejects(exportContent(f.config, f.output, { publication: { channel: 'missing', version: 'current', language: 'en' } }), /not enabled/);
  await exportContent(f.config, f.output, { publication: { channel: 'production', version: 'current', language: 'en' }, target: 'app-help' });
  for (const raw of [{ publicBase: '../app/' }, { publicBase: '/help' }, { publicBase: '//host/' }, { documents: [] }, { formats: ['zip'] }, { unexpected: true }]) assert.throws(() => validateExportTarget(raw));
  for (const svg of ['<svg onload="alert(1)"/>', '<svg><script>alert(1)</script></svg>', '<svg><image href="https://example.com/a.png"/></svg>', '<svg><style>@import "https://example.com/a.css";</style></svg>']) assert.throws(() => validateExportSvg(svg));
});

test('representations remain independent and footnote/section anchors are scoped', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'content/keys.mdx'), page('guide.keys', '<Only format="html">\n\nHTML-only wording.\n\n</Only>\n\n<Only format="markdown">\n\nMarkdown-only wording.\n\n</Only>\n\n## Scopes\n\n[Scopes](#scopes) have limits.[^limit]\n\n[^limit]: Review all permissions.\n'));
  await exportContent(f.config, f.output, { target: 'app-help' });
  const keys = (await manifest(f.output)).resources.find((doc: any) => doc.ref.documentId === 'guide.keys');
  const html = await readFile(path.join(f.output, keys.representations.html.path), 'utf8');
  const md = await readFile(path.join(f.output, keys.representations.markdown.path), 'utf8');
  assert.ok(html.includes('HTML-only wording') && !html.includes('Markdown-only wording'));
  assert.ok(md.includes('Markdown-only wording') && !md.includes('HTML-only wording'));
  assert.ok(keys.representations.html.anchors.some((anchor: any) => anchor.id === 'scopes'));
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(target), target);
});

test('remote render dependencies are declared and copied assets do not expose local paths', async t => {
  const f = await fixture(t);
  const keys = path.join(f.root, 'content/keys.mdx');
  await writeFile(keys, (await readFile(keys, 'utf8')) + '\n![Remote](https://images.example.com/guide.png)\n');
  await exportContent(f.config, f.output, { target: 'app-help' });
  const data = await manifest(f.output);
  assert.deepEqual(data.resources.find((doc: any) => doc.ref.documentId === 'guide.keys').externalDependencies, [{ url: 'https://images.example.com/guide.png', kind: 'image' }]);
  assert.ok(!JSON.stringify(data).includes(f.root));
  assert.ok(data.diagnostics.some((diagnostic: any) => diagnostic.code === 'external-render-dependencies'));
});

test('CLI can export a no-navigation project and rejects malformed options', async t => {
  const f = await fixture(t);
  const cli = path.join(framework, 'dist/cli.js');
  const result = spawnSync(process.execPath, [cli, 'export', f.config, '--target', 'app-help', '--out', f.output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).documents, 2);
  for (const args of [['--out'], ['--out', f.output, '--format', 'zip'], ['--out', f.output, '--channel', 'production']]) {
    const bad = spawnSync(process.execPath, [cli, 'export', f.config, ...args], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
  }
});

test('no facets, no site shell, and no prior website build are required', async t => {
  const f = await fixture(t);
  await writeFile(f.config, `schemaVersion: 1\npublications:\n  defaults: { channel: production, version: current, language: en }\n  channels: { production: {} }\n  versions: { current: {} }\n  enabled: [{ channel: production, version: current }]\nfrontmatter:\n  defaults: { type: guide, channel: production, version: current, access: { policy: public } }\n`);
  await writeFile(path.join(f.root, 'content/keys.mdx'), page('guide.keys', '## Scopes\n\n[Scopes](#scopes) and [billing](doc:guide.billing).'));
  await writeFile(path.join(f.root, 'content/billing.mdx'), page('guide.billing', 'All help stays in the app.'));
  const result = await exportContent(f.config, f.output);
  assert.equal(result.documents, 3);
  assert.ok((await manifest(f.output)).resources.every((doc: any) => !doc.canonicalUrl));
});

test('API review candidates retain focused downloads and require explicit digest approval', async t => {
  const f = await fixture(t);
  const config = JSON.parse(JSON.stringify({
    schemaVersion: 1, site: { title: 'API export' },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current' }] },
    frontmatter: { defaults: { type: 'guide', channel: 'production', version: 'current', access: { policy: 'public' } } },
    apis: { catalog: { source: { kind: 'file', path: './api.yaml', focused: true }, generateReferences: true } },
    exports: { help: { documents: ['reference.catalog.listItems'], formats: ['html', 'markdown'], publicBase: '/help/' } }
  }));
  await rm(path.join(f.root, 'content'), { recursive: true }); await mkdir(path.join(f.root, 'content'));
  await writeFile(path.join(f.root, 'api.yaml'), 'openapi: 3.1.0\ninfo: { title: Catalog, version: "1" }\npaths:\n  /items:\n    get:\n      operationId: listItems\n      summary: List items\n      responses:\n        "200": { description: Success }\n');
  await writeFile(f.config, JSON.stringify(config));
  await assert.rejects(exportContent(f.config, f.output, { target: 'help' }), /Export API review required/);
  const candidate = await exportContent(f.config, f.output, { target: 'help', review: true });
  assert.equal(candidate.status, 'needs-review');
  assert.ok(candidate.assets > 0);
  const data = await manifest(f.output);
  assert.equal(data.review.status, 'required');
  assert.ok(data.assets.some((asset: any) => asset.mediaType === 'application/json'));
  config.exports.help.apiReview = Object.fromEntries(candidate.apiReview.map(review => [review.apiId, review.digest]));
  await writeFile(f.config, JSON.stringify(config));
  assert.equal((await exportContent(f.config, f.output, { target: 'help' })).status, 'ok');
  await writeFile(path.join(f.root, 'api.yaml'), (await readFile(path.join(f.root, 'api.yaml'), 'utf8')).replace('Success', 'Changed response'));
  await assert.rejects(exportContent(f.config, f.output, { target: 'help' }), /Export API review required/);
});

test('export preserves notices, rejects symlink escapes, and refuses unrelated output directories', async t => {
  const f = await fixture(t);
  const config = await readFile(f.config, 'utf8');
  await writeFile(f.config, config.replace('    formats:', '    notices: [./CONTENT-LICENSE.txt]\n    formats:'));
  await writeFile(path.join(f.root, 'CONTENT-LICENSE.txt'), 'Example content license.');
  await exportContent(f.config, f.output, { target: 'app-help' });
  assert.match(await readFile(path.join(f.output, 'NOTICES.txt'), 'utf8'), /Example content license/);
  const old = await readFile(path.join(f.output, 'manifest.json'), 'utf8');
  await rm(path.join(f.root, 'content/settings.svg'));
  await writeFile(path.join(f.root, 'private-image.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await symlink(path.join(f.root, 'private-image.svg'), path.join(f.root, 'content/settings.svg'));
  await assert.rejects(exportContent(f.config, f.output, { target: 'app-help' }), /escapes the configured asset roots/);
  assert.equal(await readFile(path.join(f.output, 'manifest.json'), 'utf8'), old);
  await rm(path.join(f.root, 'content/settings.svg')); await writeFile(path.join(f.root, 'content/settings.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const unrelated = path.join(f.root, 'unrelated'); await mkdir(unrelated); await writeFile(path.join(unrelated, 'notes.txt'), 'Keep me.');
  await assert.rejects(exportContent(f.config, unrelated, { target: 'app-help' }), /not an earlier Shoalrun content export/);
  assert.equal(await readFile(path.join(unrelated, 'notes.txt'), 'utf8'), 'Keep me.');
});

test('reference links and images preserve typed app routing and dependency tracking', async t => {
  const f = await fixture(t);
  const keys = path.join(f.root, 'content/keys.mdx');
  await writeFile(keys, page('guide.keys', '[Billing][billing]\n\n![Settings][settings]\n\n![Remote][remote]\n\n[billing]: doc:guide.billing\n[settings]: ./settings.svg\n[remote]: https://images.example.com/settings.png\n'));
  await exportContent(f.config, f.output, { target: 'app-help' });
  const doc = (await manifest(f.output)).resources.find((doc: any) => doc.ref.documentId === 'guide.keys');
  const html = await readFile(path.join(f.output, doc.representations.html.path), 'utf8');
  assert.match(html, /data-export-link="link-1"/);
  assert.ok(doc.representations.html.links.some((link: any) => link.ref?.documentId === 'guide.billing'));
  assert.deepEqual(doc.externalDependencies, [{ url: 'https://images.example.com/settings.png', kind: 'image' }]);
  assert.equal(doc.assets.length, 1);
});

test('D2 visuals retain embedded fonts and renderer notices without external asset fetching', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, 'content/keys.mdx');
  await writeFile(file, (await readFile(file, 'utf8')).replace('engine="mermaid"', 'engine="d2"').replace('```mermaid\nflowchart LR\n  Create --> Request', '```d2\nCreate -> Request'));
  await exportContent(f.config, f.output, { target: 'app-help' });
  assert.match(await readFile(path.join(f.output, 'NOTICES.txt'), 'utf8'), /D2 THIRD_PARTY_NOTICES/);
  const data = await manifest(f.output);
  assert.equal(data.assets.length, 2);
  assert.ok(data.resources.every((doc: any) => doc.externalDependencies.length === 0));
});

test('export manifest follows its published JSON schema', async t => {
  const f = await fixture(t);
  await exportContent(f.config, f.output, { target: 'app-help' });
  const Ajv = (await import('ajv/dist/2020.js')).default as any;
  const ajv = new Ajv({ strict: false, formats: { uri: true } });
  const schema = JSON.parse(await readFile(path.join(framework, 'schemas/content-export.schema.json'), 'utf8'));
  const validate = ajv.compile(schema);
  const data = await manifest(f.output);
  assert.ok(validate(data), JSON.stringify(validate.errors));
  assert.equal(validate({ ...data, schemaVersion: 2 }), false);
  for (const publicBase of ['/../', '/./', '/help/../', '//host/', '/help', '/help\\nested/']) {
    assert.equal(validate({ ...data, publicBase }), false, publicBase);
  }
  for (const filename of ['assets/../../outside', 'content/./page.md', 'assets/', 'assets//image.svg', '/assets/image.svg', 'assets\\image.svg', 'assets/%2e%2e/outside', 'NOTICES.txt/extra']) {
    const invalid = structuredClone(data);
    invalid.files[0].path = filename;
    assert.equal(validate(invalid), false, filename);
  }
  for (const filename of ['content/page.html', 'assets/nested/image.svg', 'NOTICES.txt']) {
    const valid = structuredClone(data);
    valid.files[0].path = filename;
    assert.equal(validate(valid), true, filename);
  }
});

test('one authored edit updates both the website and application export', async t => {
  const f = await fixture(t);
  const site = path.join(f.root, 'website');
  await compile(f.config, site);
  await exportContent(f.config, f.output, { target: 'app-help' });
  const file = path.join(f.root, 'content/keys.mdx');
  await writeFile(file, (await readFile(file, 'utf8')).replace('Create a key for each integration.', 'Create a separate key for each application.'));
  await compile(f.config, site);
  await exportContent(f.config, f.output, { target: 'app-help' });
  const doc = (await manifest(f.output)).resources.find((doc: any) => doc.ref.documentId === 'guide.keys');
  for (const file of [path.join(site, 'api-keys/index.html'), path.join(f.output, doc.representations.html.path), path.join(f.output, doc.representations.markdown.path)]) {
    assert.match(await readFile(file, 'utf8'), /Create a separate key for each application/);
  }
});

test('native static output keeps disclosure and definition content without hidden controls', async t => {
  const f = await fixture(t);
  const content = `<Callout type="warning">\nReview permissions before continuing.\n</Callout>\n\n<Tooltip label="Quota">100 requests</Tooltip>\n\n<InfoHint label="Allowance">\n\n100 requests per workspace.\n\n</InfoHint>\n\n<Table filter sticky>\n\n| Key | Value |\n| --- | --- |\n| Limit | 100 |\n\n</Table>\n\n<DefinitionList filter>\n<Term>Budget</Term>\n<Definition>100 requests for each workspace.</Definition>\n</DefinitionList>\n\n<Collapsible title="More details">\n\nPermissions apply to every request.\n\n</Collapsible>\n`;
  await writeFile(path.join(f.root, 'content/keys.mdx'), page('guide.keys', content));
  await exportContent(f.config, f.output, { target: 'app-help' });
  const doc = (await manifest(f.output)).resources.find((doc: any) => doc.ref.documentId === 'guide.keys');
  for (const format of ['html', 'markdown']) {
    const body = await readFile(path.join(f.output, doc.representations[format].path), 'utf8');
    for (const phrase of ['Review permissions', '100 requests per workspace', 'Budget', 'Permissions apply']) assert.ok(body.includes(phrase), `${format}: ${phrase}`);
    assert.doesNotMatch(body, /\bhidden\b|type="search"|data-table-filter|data-definition-filter/);
  }
});

test('exports lower component content without bundling browser-only imports or styles', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'components/components.json'), JSON.stringify({ apiVersion: 1, components: { SupportNote: { module: './support.mjs', browser: './browser.jsx', styles: ['./browser.css'] } } }));
  await writeFile(path.join(f.root, 'components/browser.jsx'), "import 'not-installed-browser-dependency';\nexport default function mount() {}\n");
  await writeFile(path.join(f.root, 'components/browser.css'), 'body { color: red; }');
  await exportContent(f.config, f.output, { target: 'app-help' });
  const data = await manifest(f.output);
  assert.ok(data.files.every((file: any) => !/\.(?:js|css)$/.test(file.path)));
  const doc = data.resources.find((doc: any) => doc.ref.documentId === 'guide.keys');
  const html = await readFile(path.join(f.output, doc.representations.html.path), 'utf8');
  assert.match(html, /Contact the workspace owner/);
  assert.doesNotMatch(html, /browser\.css|data-component|<script/);
});
