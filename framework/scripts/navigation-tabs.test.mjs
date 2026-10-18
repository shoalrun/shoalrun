import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from '../dist/compiler.js';
import { validateProjectNavigation, resolveProjectNavigation } from '../dist/project-navigation.js';
import { auditLinks } from '../dist/link-audit.js';
import { checkOutputContract } from './check-output-contract.mjs';
import { bundleDocs } from './build-agent-docs.mjs';
import { buildHtmlPage, parse } from '../dist/content.js';
import { validateFrontmatter, declaredFrontmatterFields } from '../dist/frontmatter.js';

test('layout defaults and page overrides control only the navigation bar', () => {
  const doc = { file: 'page.md', route: '/intro', markdownRoute: '/intro.md',
    variant: { channel: 'production', version: 'current', language: 'en' },
    frontmatter: { id: 'intro', title: 'Intro', summary: 'Summary', type: 'reference', slug: '/intro', access: { policy: 'public' } } };
  const nav = [{ id: 'guides', label: 'Guides', tab: true, route: '/intro', items: [{ id: 'intro', label: 'Intro', route: '/intro' }] }];
  const tree = parse.parse('## Details\n\nPage content.');
  for (const layout of ['docs', 'wide', 'landing', 'splash']) {
    doc.frontmatter.layout = layout;
    for (const showNavigationTabs of [undefined, true, false]) {
      if (showNavigationTabs === undefined) delete doc.frontmatter.showNavigationTabs;
      else doc.frontmatter.showNavigationTabs = showNavigationTabs;
      validateFrontmatter(doc.frontmatter, {}, doc.file);
      const page = buildHtmlPage(doc, tree, doc.markdownRoute, 'Site', nav);
      const shown = showNavigationTabs ?? ['docs', 'wide'].includes(layout);
      assert.equal(page.includes('class="section-nav"'), shown, `${layout} with ${showNavigationTabs}`);
      assert.equal(page.includes('class="side"'), ['docs', 'wide'].includes(layout), 'bar suppression does not change the sidebar');
      assert.match(page, /Page content/);
      assert.ok(!buildHtmlPage(doc, tree, doc.markdownRoute, 'Site', []).includes('class="section-nav"'), 'a page flag cannot create unconfigured tabs');
    }
  }
  for (const value of ['false', null, 0]) {
    doc.frontmatter.showNavigationTabs = value;
    assert.throws(() => validateFrontmatter(doc.frontmatter, {}, doc.file), /showNavigationTabs must be true or false/);
  }
  assert.throws(() => declaredFrontmatterFields({ fields: { showNavigationTabs: { type: 'string', public: true } } }), /Cannot redefine/);
});

test('navigation tabs validate top-level placement, explicit landing pages, and unique membership', () => {
  const variant = { channel: 'production', version: 'current', language: 'en' };
  const doc = { frontmatter: { id: 'intro', title: 'Intro' }, route: '/intro', variant };
  const docs = new Map([['intro|production|current|en', doc]]);
  const tab = { id: 'guides', label: 'Guides', tab: true, landing: 'intro', items: [{ id: 'intro', doc: 'intro' }] };
  const validate = nodes => validateProjectNavigation(nodes, docs, new Map(), new Set());
  assert.throws(() => validate([{ id: 'outer', label: 'Outer', items: [tab] }]), /top-level/);
  assert.throws(() => validate([{ ...tab, tab: 'yes' }]), /must be true/);
  assert.throws(() => validate([{ ...tab, landing: 'missing' }]), /landing document/);
  assert.throws(() => validate([{ id: 'intro', doc: 'intro', landing: 'intro' }]), /requires tab/);
  assert.throws(() => validate([{ ...tab, id: '../unsafe' }]), /lowercase/);
  const duplicate = validate([tab, { ...tab, id: 'other', items: [{ id: 'other-intro', doc: 'intro' }] }]);
  assert.throws(() => resolveProjectNavigation(duplicate, variant, docs, [], new Map()), /multiple navigation sections/);
  const shared = validate([tab, { id: 'shared', doc: 'intro' }]);
  assert.throws(() => resolveProjectNavigation(shared, variant, docs, [], new Map()), /multiple navigation sections/);
  const empty = resolveProjectNavigation(validate([tab]), { ...variant, version: 'absent' }, docs, [], new Map());
  assert.deepEqual(empty, [], 'unavailable sections are omitted rather than linking to unpublished pages');
  const missingLanding = new Map([...docs, ['other|production|current|en', { ...doc, frontmatter: { id: 'other', title: 'Other' }, route: '/other' }]]);
  const wrong = validateProjectNavigation([{ ...tab, landing: 'other' }], missingLanding, new Map(), new Set());
  assert.throws(() => resolveProjectNavigation(wrong, variant, missingLanding, [], new Map()), /landing must belong/);
});

test('an agent discovers and reads across tabs through text indexes, with no browser state', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-navigation-tabs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  for (const [id, extra] of [['intro', {}], ['task', { showNavigationTabs: false, readerFilters: { product: ['payments'] } }], ['api-intro', {}], ['shared', {}], ['unlisted', {}], ['private', { access: { policy: 'draft' } }]]) {
    await writeFile(path.join(root, 'content', `${id}.md`), `---\n${JSON.stringify({ id, title: id, slug: `/${id}`, summary: `${id} summary`, ...extra })}\n---\n## Details\n\nInstructions for ${id}.\n\n\`\`\`sh\necho ${id}\n\`\`\`\n`);
  }
  await writeFile(path.join(root, 'api.json'), JSON.stringify({ openapi: '3.0.3', info: { title: 'Widgets', version: '1' }, paths: { '/widgets': { get: { operationId: 'listWidgets', tags: ['Widgets'], responses: { 200: { description: 'Widget list' } } } } } }));
  const config = {
    schemaVersion: 1, site: { title: 'Tab fixture', origin: 'https://docs.example.test', basePath: '/docs' },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current', language: 'en' }] },
    frontmatter: { defaults: { type: 'reference', channel: 'production', version: 'current', language: 'en', access: { policy: 'public' } } },
    outputs: { html: { shareImages: false } },
    readerFilters: { facets: { product: { label: 'Product', options: { payments: 'Payments', reports: 'Reports' } } } },
    apis: { widgets: { source: { kind: 'file', path: './api.json', focused: true }, generateReferences: { pathPrefix: '/reference' } } },
    navigation: [
      { id: 'shared', doc: 'shared' },
      { id: 'guides', label: 'Guides', tab: true, landing: 'intro', items: [{ id: 'intro', doc: 'intro' }, { id: 'task', doc: 'task' }] },
      { id: 'api', label: 'API', tab: true, landing: 'api-intro', items: [{ id: 'api-intro', doc: 'api-intro' }, { id: 'generated', api: 'widgets', generated: 'tags' }] }
    ]
  };
  const file = path.join(root, 'docs.config.yaml'), site = path.join(root, 'site');
  await writeFile(file, JSON.stringify(config));
  await compile(file, site, undefined, { apiReview: 'report' });
  const read = route => readFile(path.join(site, route.slice(1)), 'utf8');
  const manifest = JSON.parse(await read('/documents.json'));
  assert.equal(manifest.navigationTabs.length, 2);
  assert.equal(manifest.documents.length, 6, 'draft pages stay unpublished and unlisted public pages stay discoverable');
  const compact = await read('/docs/llms.min.txt');
  const full = await read('/docs/llms.txt');
  for (const doc of manifest.documents) assert.ok(compact.includes(doc.markdownUrl));
  const links = [...compact.matchAll(/\]\(([^)]+\/navigation\/[^)]+\.txt)\)/g)].map(match => new URL(match[1]).pathname);
  assert.equal(links.length, 2, 'agent finds scoped indexes using only Markdown links');
  for (const tab of manifest.navigationTabs) {
    assert.ok(links.includes(tab.indexUrl));
    assert.ok(full.includes(tab.indexUrl));
    const index = await read(tab.indexUrl);
    assert.ok(index.includes('/docs/llms.min.txt'));
    const members = manifest.documents.filter(doc => doc.navigationTab?.id === tab.id);
    for (const doc of members) {
      assert.ok(index.includes(doc.markdownUrl));
      const markdown = await read(doc.markdownUrl);
      assert.ok(markdown.includes('Navigation section:'));
      assert.ok(markdown.includes(tab.indexUrl));
      assert.ok(markdown.includes('/docs/llms.min.txt'));
      const html = await read(`${doc.url}/index.html`);
      if (doc.id === 'task') assert.ok(!html.includes('Documentation sections'), 'suppressed HTML tabs retain Markdown and manifest membership');
      else {
        assert.match(html, new RegExp(`href="${tab.url}" aria-current="true"`));
        assert.ok(html.includes('Documentation sections'));
      }
      const sidebar = html.match(/<nav class="side"[^]*?<\/nav>/)[0];
      assert.ok(sidebar.includes('/docs/shared'));
      assert.ok(!sidebar.includes(tab.id === 'guides' ? '/docs/api-intro' : '/docs/task'));
    }
    for (const other of manifest.documents.filter(doc => doc.navigationTab && doc.navigationTab.id !== tab.id)) assert.ok(!index.includes(other.markdownUrl));
  }
  const api = manifest.documents.find(doc => doc.type === 'api-reference');
  assert.equal(api.navigationTab.id, 'api');
  assert.ok(api.focusedContractUrl);
  for (const id of ['shared', 'unlisted']) assert.equal(manifest.documents.find(doc => doc.id === id).navigationTab, undefined);
  for (const route of ['/docs/search-index.json', '/docs/search-index.min.json']) {
    const index = JSON.parse(await read(route));
    assert.equal(index.documents.find(doc => doc.id === 'task').navigationTab.id, 'guides');
    assert.equal(index.documents.length, manifest.documents.length);
  }
  assert.equal((await auditLinks(site, config.site.origin)).status, 'ok');
  const contract = await checkOutputContract(site);
  assert.deepEqual(contract.findings, []);
  const bundled = path.join(root, 'bundle');
  await bundleDocs(site, bundled);
  for (const tab of manifest.navigationTabs) assert.equal(await readFile(path.join(bundled, tab.indexUrl.slice(1)), 'utf8'), await read(tab.indexUrl));
  // Tab URLs and Markdown never depend on the most recently selected section.
  const indexFile = manifest.navigationTabs[1].indexUrl;
  const secondSectionIndex = await read(indexFile);
  assert.ok(secondSectionIndex.includes(api.markdownUrl));
  assert.ok((await read(api.markdownUrl)).includes('Widget list'));
  await writeFile(path.join(site, indexFile.slice(1)), '# Broken index\n');
  assert.equal((await checkOutputContract(site)).status, 'error', 'missing scoped members must fail output validation');
});
