import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHtmlPage } from './page-renderer.js';
import { pdfPageAction, pdfPageKey, resolvePdfButton } from './pdf-button.js';
import { validateFrontmatter } from './frontmatter.js';
import type { Document } from './content-source.js';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from './compiler.js';
import { loadPdfRuntime } from './pdf-http.js';
import { buildVercel } from './vercel.js';

const doc: Document = { file: 'test.mdx', body: '', tree: { type: 'root', children: [] }, route: '/guide', markdownRoute: '/guide.md', variant: { product: 'core', channel: 'stable', version: 'v1', language: 'en' }, frontmatter: { id: 'guide', title: 'Guide', summary: 'A guide.', type: 'how-to', slug: '/guide' } };

test('page printing is opt-in, defaults to the browser, and is independently suppressible', () => {
  assert.equal(pdfPageAction(doc, undefined), undefined);
  const action = pdfPageAction(doc, { html: { pdf: {} } }, '/help')!;
  assert.equal(action.mode, 'print');
  assert.equal(action.href, undefined);
  assert.equal(action.label, 'Print PDF');
  assert.notEqual(pdfPageKey('guide', doc.variant), pdfPageKey('guide', { ...doc.variant, product: 'other' }));
  assert.equal(pdfPageAction({ ...doc, frontmatter: { ...doc.frontmatter, pdf: false } }, { html: { pdf: {} } }), undefined);
});

test('PDF endpoint actions carry only an opaque publication-bound key', () => {
  const action = pdfPageAction(doc, { html: { pdf: { mode: 'endpoint', endpoint: '/exports/pdf', label: 'Save PDF' } } }, '/help')!;
  const url = new URL(action.href!, 'https://docs.example');
  assert.equal(url.pathname, '/help/exports/pdf');
  assert.deepEqual([...url.searchParams.keys()], ['key']);
  assert.equal(url.searchParams.get('key'), pdfPageKey('guide', doc.variant));
  assert.equal(action.mode, 'endpoint');
  assert.equal(action.label, 'Save PDF');
});

test('PDF action validation refuses ambiguous endpoints and malformed suppression', () => {
  for (const endpoint of ['https://example.com/pdf', '//example.com/pdf', '/api/pdf?x=1', '/api/%2f/pdf', '/api/../pdf', '/api//pdf', '/api/pdf#x', '/__shoalrun/ask', '/__shoalrun/search', '/__shoalrun/reload', '/__SHOALRUN/PDF-DATA']) assert.throws(() => resolvePdfButton({ html: { pdf: { mode: 'endpoint', endpoint } } }));
  assert.throws(() => resolvePdfButton({ html: { pdf: { mode: 'static', endpoint: '/pdf' } } }));
  assert.throws(() => resolvePdfButton({ html: { pdf: { mode: 'static' } } }), /do not generate per-page PDFs/);
  assert.throws(() => resolvePdfButton({ html: { pdf: { style: 42 } } }), /must name an export target/);
  assert.throws(() => validateFrontmatter({ ...doc.frontmatter, pdf: 'false' } as any, {}, doc.file), /pdf must be true or false/);
  assert.throws(() => resolvePdfButton({ html: { pdf: { include: ['guide', 'guide'] } } }));
  assert.throws(() => resolvePdfButton({ html: { pdf: { placement: 'sidebar' } } }));
  assert.equal(pdfPageAction(doc, { html: { pdf: { exclude: ['guide'] } } }), undefined);
  assert.equal(pdfPageAction(doc, { html: { pdf: { include: [] } } }), undefined);
});

test('page HTML offers an escaped print button with external enhancement and an explicit Markdown target', () => {
  const html = buildHtmlPage(doc, doc.tree, doc.markdownRoute, 'Docs', [], [], [], undefined, '', false, {}, undefined, undefined, { outputs: { html: { pdf: { label: 'Print <PDF>' } } } });
  assert.match(html, /class="formats pdf-print" data-print-page data-print-settings="\/assets\/print\/settings.json" hidden>Print &lt;PDF>/);
  assert.match(html, /src="\/assets\/print.js"/);
  assert.match(html, /data-markdown-link href="\/guide.md"/);
  assert.doesNotMatch(html, /onclick=|pdf-download/);
  assert.match(html, /Read as Markdown/);
  const disabled = buildHtmlPage({ ...doc, frontmatter: { ...doc.frontmatter, pdf: false } }, doc.tree, doc.markdownRoute, 'Docs', [], [], [], undefined, '', false, {}, undefined, undefined, { outputs: { html: { pdf: {} } } });
  assert.doesNotMatch(disabled, /data-print-page|\/assets\/print.js/);
  const unusual = { ...doc, frontmatter: { ...doc.frontmatter, title: 'Guide </script><img onerror="bad">' } };
  const escaped = buildHtmlPage(unusual, doc.tree, doc.markdownRoute, 'Docs', [], [], [], undefined, '', false, {}, undefined, undefined, { outputs: { html: { pdf: {} } } });
  const metadata = /data-print-page-meta>(.*?)<\/script>/.exec(escaped)![1];
  assert.equal(JSON.parse(metadata).title, unusual.frontmatter.title);
  assert.ok(!metadata.includes('<'));
});

test('static builds add a constant shared print theme and no per-page PDF or print documents', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-static-print-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  for (let i=0;i<30;i++) await writeFile(path.join(directory, 'content', `${i}.mdx`), `---\n${JSON.stringify({id:`page.${i}`,title:`Page ${i}`,slug:`/page-${i}`})}\n---\nPage ${i} instructions.\n`);
  const config = { schemaVersion: 1, site: { title: 'Print test', basePath: '/help' }, frontmatter: { defaults: { type: 'guide', summary: 'Instructions.', channel: 'production', version: 'current', access: { policy: 'public' } } }, publications: { defaults: {channel:'production',version:'current',language:'en'}, channels:{production:{}},versions:{current:{}},enabled:[{channel:'production',version:'current'}] }, outputs: { html: { pdf: {} as unknown }, pdf: { stylesheet:'./print.css', executablePath:'/missing-browser' } } };
  await writeFile(path.join(directory,'print.css'), ':root{--pdf-accent:#28584b}');
  const file=path.join(directory,'docs.config.yaml'), output=path.join(directory,'site');
  await writeFile(file,JSON.stringify(config));
  await compile(file,output);
  const files = async (root: string, prefix=''): Promise<string[]> => (await Promise.all((await readdir(root,{withFileTypes:true})).map(async item => item.isDirectory()?files(path.join(root,item.name),prefix+item.name+'/'):[prefix+item.name]))).flat().sort();
  const printed=await files(output);
  assert.ok(printed.includes('help/assets/print.js'));
  assert.match(await readFile(path.join(output,'help/assets/print/theme.css'),'utf8'), /--pdf-accent:#28584b/);
  assert.match(await readFile(path.join(output,'help/assets/print/theme.css'),'utf8'), /\.pdf-print-tools \+ \.pdf-chapter\{break-before:auto\}/);
  const settings=JSON.parse(await readFile(path.join(output,'help/assets/print/settings.json'),'utf8'));
  assert.equal(settings.stylesheet,'/help/assets/print/theme.css');
  assert.ok(!JSON.stringify(settings).includes('missing-browser'));
  assert.ok(!printed.some(file => /\.pdf$|pdf-runtime|pdf-data|__shoalrun\/pdf\//.test(file)));
  const html=await readFile(path.join(output,'help/page-0/index.html'),'utf8');
  assert.match(html,/data-print-page/);
  assert.match(html,/src="\/help\/assets\/print.js"/);
  config.outputs.html.pdf=false;
  await writeFile(file,JSON.stringify(config));
  await compile(file,output);
  const disabled=await files(output);
  assert.deepEqual(printed.filter(file=>!disabled.includes(file)),['help/assets/print-view.js','help/assets/print.js','help/assets/print/settings.json','help/assets/print/theme.css']);
});

test('endpoint site builds prepare only visible permitted pages without launching a browser', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-pdf-site-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  for (const page of [{ id: 'guide' }, { id: 'suppressed', pdf: false }, { id: 'internal', audiences: ['internal'] }]) await writeFile(path.join(directory, 'content', `${page.id}.mdx`), `---\n${JSON.stringify({ title: page.id, slug: `/${page.id}`, ...page })}\n---\nUseful instructions for ${page.id}.\n`);
  const config = { schemaVersion: 1, site: { title: 'PDF test', origin: 'https://docs.example', basePath: '/help', contentFilter: { audience: ['external'] } },
    frontmatter: { defaults: { type: 'guide', channel: 'production', version: 'current', summary: 'A guide', audiences: ['external'], access: { policy: 'public' } } },
    publications: { defaults: { channel: 'production', version: 'current', language: 'en' }, channels: { production: {} }, versions: { current: {} }, enabled: [{ channel: 'production', version: 'current' }] },
    readerFilters: { facets: { audience: { label: 'Audience', options: { internal: 'Internal', external: 'External' } } } },
    exports: { handbook: { formats: ['pdf'], documents: ['internal'], publication: { channel: 'production', version: 'other', language: 'fr' }, contentFilter: { audience: ['internal'] }, pdf: { size: 'Letter', footer: 'Styled {page}' } } },
    outputs: { pdf: { executablePath: '/missing-browser' }, html: { highlighting: { provider: 'none' }, pdf: { mode: 'endpoint', label: 'Save PDF', placement: 'before', style: 'handbook' } } } };
  const file = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'output');
  await writeFile(file, JSON.stringify(config));
  const manifest = await compile(file, output);
  assert.deepEqual(manifest.documents.map(page => page.id).sort(), ['guide', 'suppressed']);
  const runtime = await loadPdfRuntime(output);
  assert.ok(runtime);
  assert.equal(runtime.runtime.endpoint, '/help/__shoalrun/pdf');
  assert.equal(runtime.runtime.config.size, 'Letter');
  assert.equal(runtime.runtime.config.footer, 'Styled {page}');
  assert.deepEqual(Object.values(runtime.runtime.pages).map(page => page.documentId), ['guide']);
  const html = await readFile(path.join(output, 'help/guide/index.html'), 'utf8');
  assert.ok(html.indexOf('pdf-download') < html.indexOf('Read as Markdown'));
  const suppressed = await readFile(path.join(output, 'help/suppressed/index.html'), 'utf8');
  assert.doesNotMatch(suppressed, /pdf-download/);
  const vercel = path.join(directory, 'vercel');
  await mkdir(vercel);
  await writeFile(path.join(vercel, 'keep.txt'), 'existing output');
  await assert.rejects(buildVercel(file, vercel), /On-demand PDF generation requires a Node server/);
  assert.equal(await readFile(path.join(vercel, 'keep.txt'), 'utf8'), 'existing output');
  Object.assign(config.outputs.html.pdf, { style: 'missing', include: [] });
  await writeFile(file, JSON.stringify(config));
  await assert.rejects(compile(file, output), /Unknown PDF button style missing/);
});
