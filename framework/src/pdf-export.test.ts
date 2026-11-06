import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { preparePdfExport, exportContent } from './content-export.js';
import { runExportCommand } from './content-export-command.js';
import { validateExportTarget } from './content-export-config.js';
import { preparePdfDocument } from './pdf-renderer.js';
import { commitArtifacts } from './output-commit.js';

const publication = { channel: 'production', version: 'current', language: 'en' };
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-pdf-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'content'));
  const config = path.join(root, 'docs.config.yaml');
  const settings: any = {
    schemaVersion: 1, site: { title: 'Documentation', origin: 'https://docs.example.com' },
    publications: { defaults: publication, channels: { production: {} }, versions: { current: {} }, enabled: [publication] },
    frontmatter: { defaults: { type: 'guide', ...publication, access: { policy: 'public' } } },
    outputs: { html: { highlighting: { provider: 'shiki' } }, pdf: { size: 'Letter', footer: '{page} / {pages}' } }
  };
  const save = () => writeFile(config, json(settings));
  const page = (id: string, body: string, extra: Record<string, unknown> = {}) => writeFile(path.join(root, 'content', `${id}.mdx`), `---\n${json({ id, title: id, summary: `Instructions for ${id}.`, slug: `/${id}`, ...extra })}---\n\n${body}\n`);
  await save();
  return { root, config, settings, save, page };
}

test('PDF selection follows navigation and appends unlisted eligible pages; internal links retain identities', async t => {
  const f = await fixture(t);
  await f.page('a', '## Shared\n\nAlpha [B section](/b#shared).');
  await f.page('b', '## Shared\n\nBeta [A page](doc:a).');
  await f.page('z', 'Unlisted but eligible.');
  await f.page('private', 'PrivateMarker', { access: { policy: 'private' } });
  f.settings.navigation = [{ id: 'b', doc: 'b' }, { id: 'group', label: 'Group', items: [{ id: 'a', doc: 'a' }, { id: 'b-again', doc: 'b' }] }];
  await f.save();
  const prepared = await preparePdfExport(f.config);
  assert.deepEqual(prepared.input.documents.map(doc => doc.id), ['b', 'a', 'z']);
  assert.equal(prepared.manifest.kind, 'shoalrun-pdf-export');
  assert.ok(prepared.manifest.diagnostics.some(item => item.code === 'pdf-unlisted-pages'));
  const [b, a] = prepared.input.documents;
  assert.match(b.html, /href="#pdf-document-2"/);
  assert.match(a.html, /href="#sr-resource-[a-f0-9]+-shared"/);
  assert.notEqual(prepared.manifest.documents[0].anchors[0].exportedId, prepared.manifest.documents[1].anchors[0].exportedId);
  const rendered = await preparePdfDocument(prepared.input);
  assert.doesNotMatch(rendered.html, /PrivateMarker/);
  await assert.rejects(preparePdfExport(f.config, { documents: ['private'] }), /missing, non-public/);
  await assert.rejects(readFile(path.join(f.root, 'manifest.json')), { code: 'ENOENT' });
});

test('PDF respects page audience default and explicit target selection without changing ordinary exports', async t => {
  const f = await fixture(t);
  f.settings.readerFilters = { facets: { audience: { label: 'Audience', options: { internal: 'Internal', external: 'External' } } } };
  f.settings.site.contentFilter = { audience: ['internal'] };
  f.settings.exports = { external: { formats: ['pdf'], contentFilter: { audience: ['external'] } } };
  await f.page('internal', 'InternalMarker', { audiences: ['internal'] });
  await f.page('external', 'ExternalMarker', { audiences: ['external'] });
  await f.page('unmarked', 'NoAudienceMarker');
  await f.save();
  assert.deepEqual((await preparePdfExport(f.config)).input.documents.map(doc => doc.id), ['internal']);
  assert.deepEqual((await preparePdfExport(f.config, { target: 'external' })).input.documents.map(doc => doc.id), ['external']);
  await assert.rejects(preparePdfExport(f.config, { documents: ['external'] }), /excluded by the export contentFilter/);
  const ordinary = await exportContent(f.config, path.join(f.root, 'portable'), { formats: ['html'] });
  assert.deepEqual(ordinary.documentIds, ['external', 'internal', 'unmarked']);
});

test('PDF pruning applies profiles before rendering; reader sections remain complete labeled content', async t => {
  const f = await fixture(t);
  f.settings.profiles = { manifest: './features.yaml', pruneNavigation: true };
  f.settings.readerFilters = { facets: { audience: { label: 'Audience', options: { operator: 'Operators', developer: 'Developers' } } } };
  await writeFile(path.join(f.root, 'features.yaml'), json({ schemaVersion: 1, features: { included: {}, excluded: {} }, skus: {} }));
  const profile = path.join(f.root, 'profile.yaml');
  await writeFile(profile, json({ schemaVersion: 1, features: ['included'] }));
  await f.page('home', 'SharedMarker\n\n<ForFeature allOf="included">\n\nGrantedMarker\n\n</ForFeature>\n\n<ForFeature allOf="excluded">\n\nExcludedFeatureMarker\n\n![Not loaded](./missing.png)\n\n</ForFeature>\n\n<ReaderSection audience="operator">\n\nOperatorSectionMarker\n\n</ReaderSection>\n\n<ReaderSection audience="developer">\n\nDeveloperSectionMarker\n\n</ReaderSection>');
  await f.page('excluded', 'ExcludedPageMarker', { requires: { allOf: ['excluded'] } });
  await f.save();
  const prepared = await preparePdfExport(f.config, { profile });
  assert.deepEqual(prepared.input.documents.map(doc => doc.id), ['home']);
  const html = prepared.input.documents[0].html;
  for (const marker of ['SharedMarker', 'GrantedMarker', 'OperatorSectionMarker', 'DeveloperSectionMarker', 'Operators', 'Developers']) assert.ok(html.includes(marker), marker);
  assert.doesNotMatch(html, /ExcludedFeatureMarker|ExcludedPageMarker|missing.png/);
  assert.ok(!JSON.stringify(prepared.manifest).includes('profile.yaml'));
});

test('PDF publication selection keeps independent product releases and languages separate', async t => {
  const f = await fixture(t);
  f.settings.publications = {
    defaults: { channel: 'production', language: 'en' }, channels: { production: {} }, versions: {},
    products: {
      payments: { pathPrefix: '/payments', defaultVersion: 'v3', versions: { v3: {} } },
      reporting: { pathPrefix: '/reporting', defaultVersion: 'v1', versions: { v1: {} } }
    },
    enabled: [{ ...publication, product: 'payments', version: 'v3' }, { ...publication, product: 'reporting', version: 'v1' }, { ...publication, product: 'payments', version: 'v3', language: 'fr' }]
  };
  delete f.settings.frontmatter.defaults.version;
  await f.page('payments-en', 'PaymentsEnglishMarker', { product: 'payments', version: 'v3' });
  await f.page('payments-fr', 'PaymentsFrenchMarker', { product: 'payments', version: 'v3', language: 'fr' });
  await f.page('reporting-en', 'ReportingEnglishMarker', { product: 'reporting', version: 'v1' });
  await f.save();
  await assert.rejects(preparePdfExport(f.config), /multiple enabled publications/);
  const selected = { ...publication, product: 'payments', version: 'v3' };
  const prepared = await preparePdfExport(f.config, { publication: selected });
  assert.deepEqual(prepared.manifest.publication, selected);
  assert.deepEqual(prepared.input.documents.map(doc => doc.id), ['payments-en']);
  assert.doesNotMatch(prepared.input.documents[0].html, /FrenchMarker|ReportingEnglishMarker/);
  await assert.rejects(preparePdfExport(f.config, { publication: { ...selected, version: 'v1' } }), /not enabled/);
});

test('PDF retains math and code presentation and uses canonical cross-page links for standalone preparation', async t => {
  const f = await fixture(t);
  await f.page('a', '## Shared\n\n[A page](doc:a) [B section](/b#shared)\n\n<Math display expression="x^2" />\n\n```python\nprint("hello")\n```');
  await f.page('b', '## Shared\n\nTarget section. [Self page](doc:b) [Self section](#shared)');
  const prepared = await preparePdfExport(f.config, { documents: ['a', 'b'], pdfLinks: 'canonical' });
  const html = prepared.input.documents[0].html;
  assert.match(html, /<math/);
  assert.match(html, /<msup>/);
  assert.match(html, /style="color:/);
  assert.match(html, /href="#pdf-document-1"/);
  assert.match(html, /href="https:\/\/docs.example.com\/b#shared"/);
  assert.match(prepared.input.documents[1].html, /href="#pdf-document-1"/);
  assert.match(prepared.input.documents[1].html, /href="#sr-resource-[a-f0-9]+-shared"/);
  // Canonical fragment validation intentionally requires selecting the target page.
  await assert.rejects(preparePdfExport(f.config, { documents: ['a'] }), /Cannot validate canonical anchor/);
});

test('PDF CSS settings resolve from inherited configuration and target overrides', async t => {
  const f = await fixture(t);
  await f.page('a', 'Instructions.');
  await mkdir(path.join(f.root, 'brand'));
  await writeFile(path.join(f.root, 'brand', 'print.css'), ':root { --pdf-accent: #234567; }');
  await writeFile(path.join(f.root, 'brand', 'outputs.yaml'), json({ pdf: { stylesheet: './print.css', size: 'A5', margins: { top: '12mm', bottom: '13mm' } } }));
  f.settings.outputs = { $include: './brand/outputs.yaml' };
  f.settings.exports = { book: { formats: ['pdf'], pdf: { margins: { top: '20mm' } } } };
  await f.save();
  const prepared = await preparePdfExport(f.config, { target: 'book' });
  assert.equal(prepared.input.config.stylesheet, path.join(f.root, 'brand', 'print.css'));
  assert.deepEqual(prepared.input.config.margins, { top: '20mm', bottom: '13mm' });
  assert.ok(prepared.inputs.includes(path.join(f.root, 'brand', 'print.css')));
  assert.match((await preparePdfDocument(prepared.input)).html, /--pdf-accent: #234567/);
});

test('PDF button style target changes only styling and preserves the caller selection', async t => {
  const f = await fixture(t);
  await f.page('a', 'SelectedPageMarker');
  await f.page('b', 'UnselectedPageMarker');
  await mkdir(path.join(f.root, 'brand'));
  await writeFile(path.join(f.root, 'brand', 'print.css'), 'h1 { color: #345678; }');
  await writeFile(path.join(f.root, 'brand', 'exports.yaml'), json({ brand: { formats: ['pdf'], documents: ['b'], publication: { ...publication, version: 'unavailable' }, pdf: { stylesheet: './print.css', size: 'A5' } } }));
  f.settings.exports = { $include: './brand/exports.yaml' };
  await f.save();
  const prepared = await preparePdfExport(f.config, { documents: ['a'], publication, pdfStyleTarget: 'brand' });
  assert.deepEqual(prepared.input.documents.map(doc => doc.id), ['a']);
  assert.deepEqual(prepared.manifest.publication, publication);
  assert.equal(prepared.input.config.size, 'A5');
  assert.equal(prepared.input.config.stylesheet, path.join(f.root, 'brand', 'print.css'));
  await assert.rejects(preparePdfExport(f.config, { pdfStyleTarget: 'missing' }), /Unknown PDF style target/);
});

test('PDF CLI selects the PDF pipeline and separate manifests are replaceable without deleting arbitrary directories', async t => {
  const f = await fixture(t);
  await f.page('a', 'Instructions.');
  await assert.rejects(runExportCommand([f.config, '--format', 'pdf', '--out', path.join(f.root, 'pdf'), '--document', 'missing']), /missing, non-public/);
  assert.throws(() => validateExportTarget({ formats: ['pdf', 'html'] }), /PDF exports use their own bundle/);
  assert.throws(() => validateExportTarget({ formats: ['pdf'], resources: [{ kind: 'section', documentId: 'a', sectionId: 'part' }] }), /whole pages/);
  const output = path.join(f.root, 'atomic');
  const artifacts = new Map<string, string | Buffer>([['manifest.json', json({ kind: 'shoalrun-pdf-export', schemaVersion: 1 })], ['page.pdf', '%PDF-test']]);
  await commitArtifacts(output, artifacts, undefined, 'pdf');
  await commitArtifacts(output, artifacts, undefined, 'pdf');
  assert.equal(await readFile(path.join(output, 'page.pdf'), 'utf8'), '%PDF-test');
  const arbitrary = path.join(f.root, 'personal');
  await mkdir(arbitrary);
  await writeFile(path.join(arbitrary, 'notes.txt'), 'Keep this.');
  await assert.rejects(commitArtifacts(arbitrary, artifacts, undefined, 'pdf'), /already exists/);
  assert.equal(await readFile(path.join(arbitrary, 'notes.txt'), 'utf8'), 'Keep this.');
});

test('PDF output may be inside the project beside its stylesheet; browser failure preserves prior output', async t => {
  const f = await fixture(t);
  await f.page('a', 'Instructions.');
  await writeFile(path.join(f.root, 'print.css'), 'h1{color:#245849}');
  f.settings.outputs.pdf.stylesheet = './print.css';
  f.settings.outputs.pdf.executablePath = '/definitely-missing-shoalrun-browser';
  await f.save();
  const destination = path.join(f.root, 'pdf/page');
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, 'manifest.json'), json({ kind: 'shoalrun-pdf-export', schemaVersion: 1 }));
  await writeFile(path.join(destination, 'page.pdf'), 'Prior PDF');
  await assert.rejects(exportContent(f.config, destination, { formats: ['pdf'], documents: ['a'] }), /Browser was not found|Failed to launch|executablePath|does not exist/i);
  assert.equal(await readFile(path.join(destination, 'page.pdf'), 'utf8'), 'Prior PDF');
});

test('PDF rejects local download attachments and remote images instead of producing incomplete output', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'content', 'data.json'), '{"public":true}');
  await f.page('a', '[Download](./data.json)');
  await assert.rejects(preparePdfExport(f.config), /explicit canonical HTTPS download URL/);
  await f.page('a', '![Remote](https://example.com/image.png)');
  await assert.rejects(preparePdfExport(f.config), /PDF images must be local staged assets/);
});
