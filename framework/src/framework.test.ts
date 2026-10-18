import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rename, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { checkThemeContrast, compile as compileCandidate } from './compiler.js';
import { explain, loadConfig } from './config.js';
import { auditReference } from './reference-audit.js';
import { auditFocusedContracts } from './focused-audit.js';
import { focusedOpenApi } from './focused-openapi.js';
import { ApiReader, exampleTitle, querySyntaxRules } from './api.js';
import { scaffold } from './scaffold.js';
import { highlightedExample, createCodeHighlighter } from './highlight.js';
import { renderMarkdown, renderHtml, buildHtmlPage, code, root as semanticRoot, parse, transformMdx, typeLabel } from './content.js';
import { resolveCalloutTypes } from './callouts.js';
import { declaredFrontmatterFields, validateFrontmatter } from './frontmatter.js';
import { homeUrl, negotiatedDocument, wantsMarkdown } from './negotiation.js';
import { buildVercel } from './vercel.js';
import { createSiteServer } from './server.js';
import { startDev } from './dev.js';
import { queryBuiltSite } from './search-query.js';
import { contrast, contrastProblems, paletteCss, paletteNames, resolvePalette, syntaxColors } from './palettes.js';

// Renderer tests deliberately mutate API inputs and selections. The publication
// gate has dedicated tests; these builds inspect candidate output.
const compile = (configFile: string, destination?: string, provenance?: Parameters<typeof compileCandidate>[2]) =>
  compileCandidate(configFile, destination, provenance, { apiReview: 'report' });

test('content negotiation selects Markdown only for published page routes that accept it', () => {
  const documents = [{ url: '/guide', markdownUrl: '/guide.md' }, { url: '/reference/item', markdownUrl: '/reference/item.md' }];
  assert.equal(negotiatedDocument('/guide', 'text/markdown', documents)?.markdownUrl, '/guide.md');
  assert.equal(negotiatedDocument('/guide/', 'text/markdown, text/html;q=0.8', documents)?.markdownUrl, '/guide.md');
  assert.equal(negotiatedDocument('/reference/item/', 'text/markdown;q=0.9, text/html;q=0.8', documents)?.markdownUrl, '/reference/item.md');
  assert.equal(negotiatedDocument('/guide', 'text/html;q=1, text/markdown;q=0.5', documents), undefined);
  assert.equal(negotiatedDocument('/guide', 'text/markdown;q=0', documents), undefined);
  assert.equal(negotiatedDocument('/guide', '*/*', documents), undefined);
  assert.equal(negotiatedDocument('/missing', 'text/markdown', documents), undefined);
  assert.equal(negotiatedDocument('/guide.md', 'text/markdown', documents), undefined);
  assert.equal(wantsMarkdown('text/markdown;q=0, */*'), false);
});

test('a site mounted below /docs serves pages and framework resources from that path', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-base-path-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')).replace('  title: Acme handbook', '  title: Acme handbook\n  origin: https://docs.example.test\n  basePath: /docs'));
  const output = path.join(directory, 'site-dist');
  const manifest = await compile(config, output);
  assert.equal(manifest.basePath, '/docs');
  assert.ok(manifest.documents.some(page => page.url === '/docs' && page.markdownUrl === '/docs/index.md'));
  const html = await readFile(path.join(output, 'docs/index.html'), 'utf8');
  for (const url of ['/docs/index.md', '/docs/llms.min.txt', '/docs/assets/site.css']) assert.ok(html.includes(url), url);
  assert.match(html, /class="agent-discovery">For agents: <a href="#main">Skip to article<\/a>/);
  assert.match(html, /class="agent-discovery"[^>]*>[\s\S]*?href="\/docs\/llms\.min\.txt"/);
  assert.ok(html.indexOf('<nav class="side"') < html.indexOf('<main '), 'navigation precedes the article in reading and keyboard order');
  assert.match(await readFile(path.join(output, 'docs/index.md'), 'utf8'), /> Documentation index: \[llms\.min\.txt\]\(https:\/\/docs\.example\.test\/docs\/llms\.min\.txt\)/);
  await readFile(path.join(output, 'docs/search-index.json'));
  assert.ok(![...html.matchAll(/(?:href|src)="(\/[^"]+)/g)].some(match => !match[1].startsWith('/docs')));
  assert.match(await readFile(path.join(output, 'docs/assets/fonts.css'), 'utf8'), /url\("\/docs\/assets\/fonts\//);
  assert.match(await readFile(path.join(output, 'docs/sitemap.xml'), 'utf8'), /https:\/\/docs\.example\.test\/docs/);
  const server = await createSiteServer(output);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  const origin = `http://127.0.0.1:${address.port}`;
  for (const route of ['/docs/', '/docs/index.md', '/docs/llms.txt', '/docs/assets/site.css', '/docs/search-index.json', '/docs/search-index.min.json', '/docs/llms.min.txt', '/docs/sitemap.xml']) assert.equal((await fetch(`${origin}${route}`)).status, 200, route);
  assert.equal((await fetch(`${origin}/assets/site.css`)).status, 404);
  assert.equal((await fetch(`${origin}/docs/`, { headers: { Accept: 'text/markdown' } })).headers.get('content-location'), '/docs/index.md');
  const vercel = path.join(directory, '.vercel/output');
  await buildVercel(config, vercel);
  const routes = JSON.parse(await readFile(path.join(vercel, 'config.json'), 'utf8')).routes as Array<{ src?: string; dest?: string }>;
  assert.ok(routes.some(route => route.src === '^/docs/?$' && route.dest === '/docs/index.html'));
});

test('a base path also contains API downloads, discovery links, and redirects', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'config/site.yaml'), `${await readFile(path.join(directory, 'config/site.yaml'), 'utf8')}basePath: /docs\n`);
  await writeFile(path.join(directory, 'config/redirects.yaml'), '- from: /old-payment\n  to: { doc: guide.overview, channel: production, version: v1, language: en }\n');
  const output = path.join(directory, 'site-dist');
  const manifest = await compile(path.join(directory, 'docs.config.yaml'), output);
  const source = manifest.apiSources[0].sourceUrl;
  assert.match(source, /^\/docs\/api\//);
  await readFile(path.join(output, source));
  assert.match(await readFile(path.join(output, 'docs/llms.txt'), 'utf8'), /\/docs\/api\/payments\//);
  const catalog = JSON.parse(await readFile(path.join(output, 'docs/.well-known/api-catalog'), 'utf8'));
  assert.equal(catalog.linkset[0].anchor, 'https://docs.example.test/docs/.well-known/api-catalog');
  assert.ok(manifest.redirects.some(item => item.from === '/docs/old-payment' && item.to === '/docs/v1/overview' && item.markdownFrom === '/docs/old-payment.md'));
  assert.ok(manifest.documents.every(item => item.url.startsWith('/docs/') && item.markdownUrl.startsWith('/docs/')));
});

test('API and authored links reject executable URLs in generated HTML', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const apiFile = path.join(directory, 'apis/payments/openapi.yaml');
  const reader = new ApiReader();
  const operation = await reader.load(apiFile);
  const first = Object.values<any>(operation.value.paths).flatMap(pathItem => Object.values<any>(pathItem)).find(item => item?.operationId);
  assert.ok(first);
  first.externalDocs = { url: 'javascript:alert(1)' };
  const generated = await reader.operation(apiFile, first.operationId);
  assert.throws(() => renderHtml(semanticRoot(generated.blocks)), /Unsafe URL/);
  assert.throws(() => renderHtml(parse.parse('[click](javascript:alert(1))') as any), /Unsafe URL/);
  assert.throws(() => renderHtml(parse.parse('![image](data:image/svg+xml,svg)') as any), /Unsafe URL/);
  assert.match(renderHtml(parse.parse('[guide](/guide) [source](https://example.test)') as any), /href="https:\/\/example\.test"/);
});

test('multipart file uploads use curl form fields instead of a JSON body', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-multipart-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'openapi.yaml');
  await writeFile(file, `openapi: 3.1.0
info: { title: Upload example, version: '1' }
paths:
  /upload:
    post:
      operationId: upload
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file]
              properties:
                file: { type: string, format: binary }
            example: {}
      responses:
        '200': { description: Uploaded }
`);
  const operation = await new ApiReader().operation(file, 'upload');
  assert.match(operation.curl ?? '', /--form 'file=@YOUR_FILE'/);
  assert.doesNotMatch(operation.curl ?? '', /Content-Type|--data-raw/);
  assert.equal(operation.examples[0].curl, undefined);
  assert.match(renderMarkdown(semanticRoot(operation.blocks)), /--form 'file=@YOUR_FILE'/);
});

test('unwrapped query syntax shows a direct filter and keeps source notes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-query-syntax-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'openapi.yaml');
  await writeFile(file, `openapi: 3.1.0
info: { title: Search example, version: '1' }
paths:
  /Query/items:
    get:
      operationId: listItems
      parameters:
        - name: parameters
          in: query
          description: "Accepted fields: amount and status."
          schema: { type: string }
          example: { "amount(gt)": 100 }
      responses:
        '200': { description: Found items }
`);
  const rules = querySyntaxRules([{ parameter: 'parameters', pathPrefixes: ['/Query/'], style: 'unwrapped', example: 'YOUR_FIELD(eq)=YOUR_VALUE' }]);
  const operation = await new ApiReader().operation(file, 'listItems', 'listItems', rules);
  assert.match(operation.curl ?? '', /\?amount\(gt\)=100/);
  assert.doesNotMatch(operation.curl ?? '', /parameters=/);
  const html = renderHtml(semanticRoot(operation.blocks));
  const markdown = renderMarkdown(semanticRoot(operation.blocks));
  assert.match(html, /<h4 id="filters-query">Filters<span class="api-parameter-in"> \(query\)<\/span><\/h4>/);
  assert.match(html, /<details class="api-schema-disclosure"><summary>Source notes, accepted fields, and operators<\/summary>/);
  assert.match(markdown, /Accepted fields: amount and status/);
  assert.match(markdown, /amount\(gt\)=100/);
  assert.throws(() => querySyntaxRules([{ parameter: 'parameters', pathPrefixes: ['/Query/'], style: 'unwrapped', example: 'parameters=x&other=y' }]), /one query expression/);
});

test('OAS extension values map explicitly to reference status badges', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const apiFile = path.join(directory, 'apis/payments/openapi.yaml');
  await writeFile(apiFile, (await readFile(apiFile, 'utf8')).replace('operationId: createPayment', 'operationId: createPayment\n      x-example-availability: preview'));
  const apiConfig = path.join(directory, 'config/api.yaml');
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')).replace('payments:\n', 'payments:\n  mappings:\n    subjectLifecycle:\n      from: x-example-availability\n      values: { preview: beta }\n'));
  const output = path.join(directory, 'site');
  await compile(path.join(directory, 'docs.config.yaml'), output);
  const html = await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8');
  assert.match(html, /subject-lifecycle-beta/);
  await writeFile(apiFile, (await readFile(apiFile, 'utf8')).replace('x-example-availability: preview', 'x-example-availability: { status: building, message: Coming soon }'));
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')).replace('from: x-example-availability', 'from: x-example-availability.status').replace('values: { preview: beta }', 'values: { building: in-development }'));
  await compile(path.join(directory, 'docs.config.yaml'), output);
  assert.match(await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8'), /subject-lifecycle-in-development/);
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')).replace('values: { building: in-development }', 'values: { building: experimental }'));
  await compile(path.join(directory, 'docs.config.yaml'), output);
  assert.match(await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8'), /subject-lifecycle-experimental/);
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')).replace('x-example-availability', 'availability'));
  await assert.rejects(compile(path.join(directory, 'docs.config.yaml')), /needs an x- extension name or dotted property path/);
});

test('OpenAPI 3.1 webhooks render as inbound event references and focused contracts', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-webhook-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const source = path.join(directory, 'openapi.yaml');
  await writeFile(source, `openapi: 3.1.0
info: { title: Events, version: '1' }
webhooks:
  payment.updated:
    post:
      operationId: paymentUpdated
      summary: Payment updated
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id: { type: string }
            example: { id: pay_123 }
      responses:
        '200': { description: Acknowledged }
`);
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({
    schemaVersion: 1, site: { title: 'Events' },
    publications: { defaults: { channel: 'production', version: 'v1' }, channels: { production: {} }, versions: { v1: {} }, enabled: [{ channel: 'production', version: 'v1' }] },
    apis: { events: { source: { kind: 'file', path: './openapi.yaml', focused: true }, generateReferences: true } },
    navigation: [{ id: 'events', api: 'events', generated: 'tags' }]
  }));
  const manifest = await compile(config, path.join(directory, 'site'));
  assert.equal(manifest.documents.length, 1);
  const page = manifest.documents[0];
  const html = await readFile(path.join(directory, 'site', page.url, 'index.html'), 'utf8');
  assert.match(html, /aria-label="Webhook event"/);
  assert.match(html, /Webhook: payment.updated/);
  assert.match(html, /provider sends a POST request/);
  assert.doesNotMatch(html, /curl --request POST/);
  const focused = await focusedOpenApi(new ApiReader(), source, 'paymentUpdated');
  assert.ok(focused.webhooks['payment.updated'].post);
  assert.equal(focused.paths, undefined);
  assert.equal((await auditReference(source)).status, 'ok');
  assert.equal((await auditFocusedContracts(path.join(directory, 'site'))).status, 'ok');
});
test('site root falls back to the overview, then /reference, then the first page', () => {
  const reference = { id: 'reference.index', url: '/reference' };
  const overview = { id: 'guide.overview', url: '/start' };
  const other = { id: 'guide.other', url: '/other' };
  assert.equal(homeUrl([reference, other, overview]), '/start');
  assert.equal(homeUrl([other, reference]), '/reference');
  assert.equal(homeUrl([other]), '/other');
  assert.equal(homeUrl([]), undefined);
});

test('Vercel output routes published HTML and Markdown with negotiation headers', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, '.vercel/output');
  const redirects = path.join(directory, 'config/redirects.yaml');
  await writeFile(redirects, '- from: /v1/guides/old-payment\n  status: 200\n  to: { doc: guide.create-payment, channel: production, version: v1, language: en }\n');
  await assert.rejects(buildVercel(path.join(directory, 'docs.config.yaml'), output), /status must be 301, 302, 303, 307, or 308/);
  await writeFile(redirects, '- from: /v1/guides/old-payment\n  to: { doc: guide.create-payment, channel: production, version: v1, language: en }\n');
  const result = await buildVercel(path.join(directory, 'docs.config.yaml'), output);
  assert.equal(result.documents, 3);
  const config = JSON.parse(await readFile(path.join(output, 'config.json'), 'utf8'));
  assert.equal(config.version, 3);
  assert.deepEqual(config.routes.slice(0, 2).map((route: any) => [route.src, route.continue, route.headers]), [
    ['^/.*$', true, { 'X-Content-Type-Options': 'nosniff' }],
    ['^/.*\\.svg$', true, { 'Content-Security-Policy': 'sandbox' }]
  ]);
  const markdown = config.routes.find((route: any) => route.dest === '/v1/reference/create-payment.md' && route.has);
  assert.equal(markdown.src, '^/v1/reference/create-payment/?$');
  assert.equal(markdown.headers['Content-Type'], 'text/markdown; charset=utf-8');
  assert.equal(markdown.headers.Vary, 'Accept');
  assert.equal(markdown.headers['Content-Location'], '/v1/reference/create-payment.md');
  assert.match(markdown.headers.Link, /rel="alternate"; type="text\/markdown"/);
  assert.match(markdown.headers.Link, /rel="canonical"/);
  const directMarkdown = config.routes.find((route: any) => route.src === '^/v1/reference/create-payment\\.md$');
  assert.match(directMarkdown.headers.Link, /^<https:\/\/docs\.example\.test\/v1\/reference\/create-payment>; rel="canonical", <\/documents\.json#\/documents\/\d+>; rel="describedby"/);
  const pattern = (match: any) => new RegExp(match.value.re.replace('(?i)', ''), 'i');
  const vercelServesMarkdown = (accept: string) => pattern(markdown.has[0]).test(accept) && !pattern(markdown.missing[0]).test(accept);
  for (const accept of ['text/markdown', 'text/markdown;q=0', 'text/html', 'text/markdown, text/html', 'text/html, text/markdown;q=0.5', 'text/markdown;q=0.5, text/html',
    'text/markdown; charset=utf-8; q=0.9, text/html;q=1.0', 'text/markdown;q=0.5, */*', 'text/markdown;q=0.5, text/*;q=1', 'text/markdown;q=0.5, text/html;q=0',
    'text/markdown;q=0.5, text/html;q=0.1, */*', 'text/markdown, text/html;q=0.9, */*;q=0.8', 'text/markdown;q=0.8, text/html;q=0.8']) {
    assert.equal(vercelServesMarkdown(accept), wantsMarkdown(accept), `Vercel and the Node server agree on Accept: ${accept}`);
  }
  // Known gap, described in the Vercel guide: a header rule cannot compare two fractional weights.
  assert.notEqual(vercelServesMarkdown('text/html;q=0.9, text/markdown;q=0.8'), wantsMarkdown('text/html;q=0.9, text/markdown;q=0.8'));
  const movedMarkdown = config.routes.find((route: any) => route.src === '^/v1/guides/old-payment\\.md$');
  assert.deepEqual([movedMarkdown.status, movedMarkdown.headers.Location], [308, '/v1/guides/create-payment.md']);
  const html = config.routes.find((route: any) => route.dest === '/v1/reference/create-payment/index.html');
  assert.equal(html.headers.Vary, 'Accept');
  assert.equal(config.overrides['v1/reference/create-payment.md'].contentType, 'text/markdown; charset=utf-8');
  assert.match(config.overrides['.well-known/api-catalog'].contentType, /application\/linkset\+json/);
  assert.ok((await readFile(path.join(output, 'static/v1/reference/create-payment.md'), 'utf8')).includes('Card token payment'));
});

test('build provenance records supplied commit and label in static and Vercel output', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const commit = 'A'.repeat(40);
  const provenance = { sourceCommit: commit, releaseLabel: 'review-42' };
  const site = path.join(directory, 'site');
  const manifest = await compile(configFile, site, provenance);
  const info = JSON.parse(await readFile(path.join(site, 'build-info.json'), 'utf8'));
  assert.deepEqual(info, { schemaVersion: 1, configDigest: manifest.configDigest, buildId: manifest.buildId, sourceCommit: commit.toLowerCase(), releaseLabel: 'review-42' });
  assert.equal(JSON.parse(await readFile(path.join(site, 'resource-headers.json'), 'utf8'))['/build-info.json']['Content-Type'], 'application/json');
  const vercel = path.join(directory, '.vercel/output');
  await buildVercel(configFile, vercel, provenance);
  assert.deepEqual(JSON.parse(await readFile(path.join(vercel, 'static/build-info.json'), 'utf8')), info);
  assert.equal(JSON.parse(await readFile(path.join(vercel, 'config.json'), 'utf8')).overrides['build-info.json'].contentType, 'application/json');
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const cliSite = path.join(directory, 'cli-site');
  const cliBuild = spawnSync(process.execPath, [cli, 'build', configFile, cliSite, '--source-commit', commit, '--release-label', 'review-42'], { encoding: 'utf8' });
  assert.equal(cliBuild.status, 0, cliBuild.stderr);
  assert.deepEqual(JSON.parse(await readFile(path.join(cliSite, 'build-info.json'), 'utf8')), info);
  const badFlag = spawnSync(process.execPath, [cli, 'build', configFile, cliSite, '--source-commit'], { encoding: 'utf8' });
  assert.equal(badFlag.status, 1);
  assert.match(badFlag.stderr, /needs a value/);
  await assert.rejects(compile(configFile, site, { sourceCommit: 'candidate' }), /sourceCommit must be a full/);
  assert.deepEqual(JSON.parse(await readFile(path.join(site, 'build-info.json'), 'utf8')), info, 'invalid metadata leaves the previous site intact');
});

const example = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example');
test('operation inspect and search reject unknown options before reading files', () => {
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: example });
  const inspect = run('operation', 'inspect', 'payments.create', '--channel', 'production');
  assert.equal(inspect.status, 0, inspect.stderr);
  assert.equal(JSON.parse(inspect.stdout).bindings.length, 2);
  for (const [args, message] of [
    [['operation', 'inspect', 'payments.create', '--locale', 'en'], /Unknown operation inspect option --locale/],
    [['operation', 'inspect', 'payments.create', 'docs.config.yaml', '--version'], /option --version needs a value/],
    [['operation', 'inspect', 'payments.create', '--channel', 'a', '--channel', 'b'], /Duplicate operation inspect option --channel/],
    [['search', 'dist', 'payment', '--locale', 'en'], /Unknown search option --locale/],
    [['search', 'dist', 'payment', '--limit'], /Search option --limit needs a value/]
  ] as const) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
  }
});

test('example names use summaries and readable source-key fallbacks', () => {
  assert.equal(exampleTitle('NamedExampleForXYZ'), 'Named Example For XYZ');
  assert.equal(exampleTitle('safe_retry'), 'Safe retry');
  assert.equal(exampleTitle('card-payment', '  Pay with a card  '), 'Pay with a card');
  assert.equal(exampleTitle('responseExample', '  '), 'Response Example');
});
test('example fallback titles appear in both reader formats while source keys remain available', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const apiFile = path.join(directory, 'apis/payments/openapi.yaml');
  const original = await readFile(apiFile, 'utf8');
  await writeFile(apiFile, original.replace('initial-attempt:\n              summary: Initial attempt', 'NamedExampleForXYZ:\n              description: Use a fresh key for the first attempt.'));
  const output = path.join(directory, 'site');
  await compile(path.join(directory, 'docs.config.yaml'), output);
  const html = await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8');
  const markdown = await readFile(path.join(output, 'v1/reference/create-payment.md'), 'utf8');
  assert.match(html, /<p class="api-parameter-example"><strong>Named Example For XYZ<\/strong>/);
  assert.match(html, /<p class="api-parameter-example"><strong>Retry the same payment<\/strong>/);
  assert.match(html, /Use a fresh key for the first attempt\./);
  assert.match(markdown, /Named Example For XYZ/);
  assert.match(markdown, /Use a fresh key for the first attempt\./);
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-framework-'));
  await cp(example, root, { recursive: true, filter: source => !source.includes('/dist') });
  return root;
}

test('authored relative links become absolute page and Markdown URLs', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const guide = path.join(directory, 'content/create-payment-guide.mdx');
  await writeFile(guide, `${await readFile(guide, 'utf8')}\n\n[Reference](../reference/create-payment?mode=short#request) [Root](/v1/overview) [Here](#retry) [External](https://example.test/help)\n`);
  const destination = path.join(directory, 'dist');
  await compile(path.join(directory, 'docs.config.yaml'), destination);
  const html = await readFile(path.join(destination, 'v1/guides/create-payment/index.html'), 'utf8');
  const markdown = await readFile(path.join(destination, 'v1/guides/create-payment.md'), 'utf8');
  assert.match(html, /href="\/v1\/reference\/create-payment\?mode=short#request">Reference/);
  assert.match(markdown, /\[Reference\]\(https:\/\/docs\.example\.test\/v1\/reference\/create-payment\.md\?mode=short#request\)/);
  assert.match(markdown, /\[Root\]\(https:\/\/docs\.example\.test\/v1\/overview\.md\)/);
  assert.match(markdown, /\[Here\]\(#retry\)/);
  assert.match(markdown, /\[External\]\(https:\/\/example\.test\/help\)/);
  assert.match(await readFile(path.join(destination, 'llms.txt'), 'utf8'), /\[Create a payment in the example API\]\(https:\/\/docs\.example\.test\/v1\/guides\/create-payment\.md\)/);
});

test('sitemap follows page noindex and preview indexing choices', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const overview = path.join(directory, 'content/overview.mdx');
  const source = await readFile(overview, 'utf8');
  await writeFile(overview, source.replace(/^---\n/, '---\nseo: { noindex: true }\n'));
  const config = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'site-dist');
  const published = await compile(config, output);
  const excluded = published.documents.find(doc => doc.id === 'guide.overview')!;
  const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
  assert.ok(!sitemap.includes(`https://docs.example.test${excluded.url}</loc>`));
  assert.match(await readFile(path.join(output, excluded.url, 'index.html'), 'utf8'), /<meta name="robots" content="noindex">/);
  const site = path.join(directory, 'config/site.yaml');
  await writeFile(site, `${await readFile(site, 'utf8')}indexing: false\n`);
  const preview = await compile(config, output);
  assert.equal(preview.sitemap, undefined);
  assert.ok(preview.documents.every(doc => doc.indexable === false));
  assert.ok(!(await readdir(output)).includes('sitemap.xml'));
  assert.equal(await readFile(path.join(output, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
});

test('reader filters publish one site with shared pages, marked sections, choices, and searchable segments', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  await writeFile(configFile, (await readFile(configFile, 'utf8')) + `\nreaderFilters:
  facets:
    audience:
      label: Reader
      options: { ui: UI reader, developer: Developer }
    product:
      label: Product
      options: { payments: Payments, reports: Reports }
    area:
      label: Area
      options: { dashboard: Dashboard, api: API }
    subarea:
      label: Subarea
      options: { reporting: Reporting, setup: Setup }
  typeDefaults:
    api-reference: { audience: [developer] }
  controls:
    header: { facet: audience, display: select, label: Reader }
  module: ./reader-custom.js
`);
  await writeFile(path.join(directory, 'reader-custom.js'), 'export function mountReaderViews(api) { window.readerViewTest = api.getSelection(); }\n');
  const overview = path.join(directory, 'content/overview.mdx');
  await writeFile(overview, (await readFile(overview, 'utf8')) + `\n<ReaderChoice audience="ui" label="Use the UI" />

<ReaderChoice audience="developer" label="Build with the API" />

<ReaderChoice audience="ui" scope="page" label="Show UI here" />

<ReaderFilter facet="audience" display="select" label="Choose a reader" />

<ReaderFilter facet="product" display="checks" />

<ReaderFilter facet="audience" display="checks" scope="page" label="Choose on this page" />

<ReaderSection audience="ui">

UI-only dashboard instructions.

</ReaderSection>

<ReaderSection audience="developer">

Developer-only CLI instructions.

</ReaderSection>
`);
  await writeFile(path.join(directory, 'content/ui-guide.mdx'), `---
id: guide.ui
title: Use the dashboard
summary: UI instructions.
type: guide
slug: /ui-guide
channel: production
version: v1
language: en
audiences: [ui]
product: payments
area: dashboard
subarea: reporting
access: { policy: public }
---

Use the dashboard to review payments.
`);
  const navFile = path.join(directory, 'config/nav.yaml');
  await writeFile(navFile, (await readFile(navFile, 'utf8')) + '- { id: ui-guide, doc: guide.ui }\n');
  const output = path.join(directory, 'site');
  await compile(configFile, output);
  const overviewHtml = await readFile(path.join(output, 'v1/overview/index.html'), 'utf8');
  assert.match(overviewHtml, /class="reader-filter-slot" data-reader-filter="/);
  assert.match(overviewHtml, /moduleUrl":"\/assets\/reader-view-custom\.js"/);
  assert.match(await readFile(path.join(output, 'assets/reader-view-custom.js'), 'utf8'), /mountReaderViews/);
  assert.match(overviewHtml, /class="reader-choice"/);
  assert.match(overviewHtml, /data-reader-scope="page"/);
  assert.match(overviewHtml, /data-reader-filter="\{&#x22;facet&#x22;:&#x22;audience&#x22;,&#x22;display&#x22;:&#x22;checks&#x22;,&#x22;label&#x22;:&#x22;Choose on this page&#x22;,&#x22;scope&#x22;:&#x22;page&#x22;\}"/);
  assert.match(overviewHtml, /class="reader-section"/);
  assert.match(overviewHtml, /data-reader-page="\{\}"/);
  assert.match(overviewHtml, /data-reader-filters="\{&quot;audience&quot;:/);
  assert.match(await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8'), /data-reader-page="\{&quot;audience&quot;:\[&quot;developer&quot;\]\}"/);
  const index = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'));
  const home = index.documents.find((doc: any) => doc.id === 'guide.overview');
  assert.deepEqual(index.documents.find((doc: any) => doc.id === 'reference.create-payment').readerFilters, { audience: ['developer'] });
  assert.deepEqual(index.documents.find((doc: any) => doc.id === 'guide.ui').readerFilters, { product: ['payments'], area: ['dashboard'], subarea: ['reporting'], audience: ['ui'] });
  assert.equal(index.documents.find((doc: any) => doc.id === 'guide.ui').product, 'payments');
  assert.ok(home.readerSegments.some((part: any) => part.filters.audience?.includes('ui') && part.text.includes('UI-only dashboard')));
  const compact = JSON.parse(await readFile(path.join(output, 'search-index.min.json'), 'utf8'));
  assert.equal(compact.documents.length, index.documents.length);
  assert.ok(compact.documents.every((doc: any) => !('text' in doc) && !('readerSegments' in doc)));
  assert.deepEqual(compact.documents.find((doc: any) => doc.id === home.id).headings, home.headings);
  assert.ok((await readFile(path.join(output, 'llms.min.txt'), 'utf8')).includes('guide.overview'));

  assert.ok(home.readerSegments.some((part: any) => part.filters.audience?.includes('developer') && part.text.includes('Developer-only CLI')));
  const manifest = JSON.parse(await readFile(path.join(output, 'documents.json'), 'utf8'));
  assert.equal(manifest.readerFacets.audience.options.ui, 'UI reader');
  assert.deepEqual(manifest.documents.find((doc: any) => doc.id === 'guide.ui').readerFilters, { product: ['payments'], area: ['dashboard'], subarea: ['reporting'], audience: ['ui'] });
  assert.equal(manifest.documents.find((doc: any) => doc.id === 'guide.ui').area, 'dashboard');
  const discovery = await readFile(path.join(output, 'llms.txt'), 'utf8');
  assert.match(discovery, /Reader views affect the interactive HTML only/);
  assert.match(discovery, /\[Use the dashboard\]\(https:\/\/docs\.example\.test\/v1\/ui-guide\.md\)/);
  assert.match(discovery, /\[Create a payment\]\(https:\/\/docs\.example\.test\/v1\/reference\/create-payment\.md\)/);
  const markdown = await readFile(path.join(output, 'v1/overview.md'), 'utf8');
  assert.match(markdown, /For Reader: UI reader\./);
  assert.match(markdown, /UI-only dashboard instructions/);
  assert.match(markdown, /Developer-only CLI instructions/);
  assert.match(markdown, /Use the UI\]\(https:\/\/docs\.example\.test\/v1\/overview\?view=audience%3Aui\)/);
  assert.match(markdown, /Show UI here\]\(https:\/\/docs\.example\.test\/v1\/overview\?pageView=audience%3Aui\)/);
  const uiGuide = path.join(directory, 'content/ui-guide.mdx');
  await writeFile(uiGuide, (await readFile(uiGuide, 'utf8')).replace('area: dashboard', 'area: unknown'));
  await assert.rejects(compile(configFile), /category\.area must be a unique list of configured choices/);
  await writeFile(uiGuide, (await readFile(uiGuide, 'utf8')).replace('area: unknown', 'area: dashboard').replace('product: payments', 'product: payments\nreaderFilters: { product: [payments] }'));
  await assert.rejects(compile(configFile), /use product or readerFilters\.product, not both/);
});

test('build refuses output directories that hold the project or its inputs before deleting anything', async t => {
  const wrapper = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-output-guard-'));
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  const directory = path.join(wrapper, 'project');
  await rename(await fixture(), directory);
  const config = path.join(directory, 'docs.config.yaml');
  const page = path.join(directory, 'content/create-payment-guide.mdx');
  const api = path.join(directory, 'apis/payments/openapi.yaml');
  await assert.rejects(compile(config, directory), /contains the project directory/);
  await assert.rejects(compile(config, wrapper), /contains the project directory/);
  await assert.rejects(compile(config, path.join(directory, 'content')), /contains the project directory|contains the content directory/);
  await assert.rejects(compile(config, path.join(directory, 'content/dist')), /inside the content directory/);
  await assert.rejects(compile(config, path.join(directory, 'apis')), /contains build input .*openapi\.yaml/);
  for (const file of [config, page, api]) await readFile(file, 'utf8');
  const abandoned = path.join(directory, 'dist.staging-99999999-previous');
  await mkdir(abandoned);
  assert.equal((await compile(config, path.join(directory, 'dist'))).documents.length, 3);
  assert.deepEqual((await readdir(directory)).filter(name => name.startsWith('dist.')), [], 'staging left by an exited build is removed');
});

test('build replaces only an empty output directory or an earlier build, never an unrelated folder', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const unrelated = path.join(directory, 'notes');
  await mkdir(unrelated);
  await writeFile(path.join(unrelated, 'keep.txt'), 'mine\n');
  await assert.rejects(compile(config, unrelated), /is not an earlier Shoalrun build/);
  assert.equal(await readFile(path.join(unrelated, 'keep.txt'), 'utf8'), 'mine\n');
  const empty = path.join(directory, 'empty');
  await mkdir(empty);
  await compile(config, empty);
  await writeFile(path.join(empty, 'stale.txt'), 'old\n');
  await compile(config, empty);
  assert.ok(!(await readdir(empty)).includes('stale.txt'), 'an earlier build is replaced whole');
});

test('missing site and publication settings fail with config messages', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const original = await readFile(config, 'utf8');
  await writeFile(config, original.replace(/^site: .*\n/m, ''));
  await assert.rejects(compile(config), /site must be a mapping with a nonempty title/);
  await writeFile(config, original.replace(/^publications: .*\n/m, ''));
  await assert.rejects(compile(config), /publications needs channels and versions mappings/);
  await writeFile(config, original);
  const publications = path.join(directory, 'config/publications.yaml');
  await writeFile(publications, (await readFile(publications, 'utf8')).replace(/^defaults: .*\n/m, ''));
  await assert.rejects(compile(config), /apis\.payments\.source needs publications\.defaults with channel and version/);
});

test('rendered diagrams are reused from the project cache', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const page = path.join(directory, 'content/create-payment-guide.mdx');
  await writeFile(page, `${await readFile(page, 'utf8')}\n\n<Diagram title="Payment flow" summary="A client calls the API." layout="dagre">\n\n\`\`\`d2\nclient -> api\n\`\`\`\n\n</Diagram>\n`);
  const cache = path.join(directory, '.shoalrun/cache/diagrams');
  const output = path.join(directory, 'dist');
  await compile(config, output);
  const cached = (await readdir(cache)).sort();
  assert.equal(cached.length, 2);
  await writeFile(path.join(cache, cached.find(name => name.endsWith('-light.svg'))!), '<svg id="from-cache"/>');
  await compile(config, output);
  const assets = await readdir(path.join(output, 'assets/diagrams'));
  assert.equal(await readFile(path.join(output, 'assets/diagrams', assets.find(name => name.endsWith('-light.svg'))!), 'utf8'), '<svg id="from-cache"/>');
});

test('serve reports the port it bound', async () => {
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const site = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-serve-port-'));
  const directory = await fixture();
  try {
    await compile(path.join(directory, 'docs.config.yaml'), site);
    const child = spawn(process.execPath, [cli, 'serve', site], { env: { ...process.env, PORT: '0' } });
    try {
      const line = await new Promise<string>((resolve, reject) => {
        child.stdout.once('data', chunk => resolve(String(chunk)));
        child.once('exit', code => reject(new Error(`serve exited with ${code}`)));
      });
      const port = Number(/:(\d+)\/\n$/.exec(line)?.[1]);
      assert.ok(port > 0, line);
      assert.equal((await fetch(`http://127.0.0.1:${port}/documents.json`)).status, 200);
    } finally {
      child.kill();
    }
  } finally {
    await rm(site, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('API preview writes only to a new, empty, or earlier preview directory', async t => {
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/preview-api.mjs');
  const wrapper = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-api-preview-'));
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  const run = (directory: string) => spawnSync(process.execPath, [script, path.join(example, 'apis/payments/openapi.yaml'), directory, '--all'], { encoding: 'utf8' });
  const occupied = path.join(wrapper, 'occupied');
  await mkdir(path.join(occupied, 'content'), { recursive: true });
  await writeFile(path.join(occupied, 'content/keep.mdx'), 'Keep me');
  const refused = run(occupied);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /is not empty and is not an earlier API preview/);
  assert.equal(await readFile(path.join(occupied, 'content/keep.mdx'), 'utf8'), 'Keep me');
  const fresh = path.join(wrapper, 'fresh');
  for (const attempt of ['first run', 'rerun']) {
    const result = run(fresh);
    assert.equal(result.status, 0, `${attempt}: ${result.stderr}`);
  }
  assert.ok((await readdir(fresh)).includes('.shoalrun-api-preview'));
});

test('dev rebuilds changed pages and keeps the last good site after an error', async t => {
  const directory = await fixture();
  const server = await startDev(path.join(directory, 'docs.config.yaml'), path.join(directory, 'dist'), '127.0.0.1', 0);
  t.after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/v1/guides/create-payment/`;
  const page = path.join(directory, 'content/create-payment-guide.mdx');
  const original = await readFile(page, 'utf8');
  const first = await (await fetch(url)).text();
  assert.match(first, /__shoalrun\/reload/);
  const events = await fetch(`http://127.0.0.1:${port}/__shoalrun/reload`);
  assert.equal(events.headers.get('content-type'), 'text/event-stream');
  const reader = events.body!.getReader();
  await reader.read(); // Initial connection comment.
  const waitFor = async (check: () => boolean | Promise<boolean>, label: string) => {
    for (const deadline = Date.now() + 8000; Date.now() < deadline; await new Promise(resolve => setTimeout(resolve, 100))) if (await check()) return;
    assert.fail(`Timed out waiting for ${label}`);
  };
  const served = async (text: string) => (await (await fetch(url)).text()).includes(text);
  await writeFile(page, `${original}\n\nDev preview changed this page.\n`);
  await waitFor(() => served('Dev preview changed this page.'), 'the rebuilt page');
  const nextEvent = async (message: string) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error(message)), 5000); }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  };
  const reload = await nextEvent('Missing live reload event');
  assert.match(new TextDecoder().decode(reload.value), /event: built/);
  const errors: string[] = [];
  t.mock.method(process.stderr, 'write', (chunk: unknown) => { errors.push(String(chunk)); return true; });
  await writeFile(page, `${original}\n\n<MissingComponent />\n`);
  await waitFor(() => errors.some(line => line.startsWith('Build failed') && line.includes('MissingComponent')), 'the failed build report');
  const failure = await nextEvent('Missing failed build event');
  assert.match(new TextDecoder().decode(failure.value), /event: failed\ndata: .*MissingComponent/);
  await reader.cancel();
  assert.ok(await served('Dev preview changed this page.'), 'failed build leaves last good output');
  await writeFile(page, `${original}\n\nDev preview recovered.\n`);
  await waitFor(() => served('Dev preview recovered.'), 'a rebuild after the error is fixed');
});

test('D2 and Mermaid diagrams publish SVGs and preserve readable Markdown source', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const guide = path.join(directory, 'content/create-payment-guide.mdx');
  await writeFile(guide, (await readFile(guide, 'utf8')) + `\n<Diagram title="Request flow" summary="The client sends a request to the API." width="440">\n\n\`\`\`d2\nclient -> api: request\n\`\`\`\n\n</Diagram>\n\n<Diagram title="Retry flow" summary="A failed request can be retried." engine="mermaid">\n\n\`\`\`mermaid\nflowchart LR\n  failed --> retry\n\`\`\`\n\n</Diagram>\n`);
  const output = path.join(directory, 'dist');
  await compile(path.join(directory, 'docs.config.yaml'), output);
  const html = await readFile(path.join(output, 'v1/guides/create-payment/index.html'), 'utf8');
  const markdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  for (const engine of ['d2', 'mermaid']) {
    assert.match(markdown, new RegExp('```' + engine + '\\n'));
    assert.match(markdown, new RegExp('/assets/diagrams/' + engine + '-[a-f0-9]+-light\\.svg'));
  }
  assert.match(markdown, /The client sends a request to the API/);
  assert.match(markdown, /client -> api: request/);
  assert.match(html, /class="doc-diagram" data-color-mode="light" style="max-width:440px"/);
  assert.match(html, /data-renderer="pele"/);
  assert.match(html, /class="pele pele-flowchart doc-diagram-svg"/);
  assert.match(await readFile(path.join(output, 'assets/pele-LICENSE.txt'), 'utf8'), /Copyright \(c\) 2026 kepano/);
  const diagrams = await readdir(path.join(output, 'assets/diagrams'));
  assert.equal(diagrams.length, 4);
  const headers = JSON.parse(await readFile(path.join(output, 'resource-headers.json'), 'utf8'));
  for (const file of diagrams) assert.match(await readFile(path.join(output, 'assets/diagrams', file), 'utf8'), /<svg/);
  for (const file of diagrams) assert.equal(headers[`/assets/diagrams/${file}`]['Content-Type'], 'image/svg+xml');
});

test('Image caps display width and publishes a local source in both formats', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const guide = path.join(directory, 'content/create-payment-guide.mdx');
  const source = await readFile(guide, 'utf8');
  await writeFile(path.join(directory, 'content/steps.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"></svg>');
  await writeFile(guide, `${source}\n\n<Image src="./steps.svg" alt="Three steps" width="360" />\n`);
  const output = path.join(directory, 'dist');
  await compile(path.join(directory, 'docs.config.yaml'), output);
  const html = await readFile(path.join(output, 'v1/guides/create-payment/index.html'), 'utf8');
  const markdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  assert.match(html, /src="\/assets\/pages\/v1\/guides\/create-payment\/steps\.svg" alt="Three steps" class="doc-image" style="width:100%;max-width:360px"/);
  assert.match(markdown, /!\[Three steps\]\(https:\/\/docs\.example\.test\/assets\/pages\/v1\/guides\/create-payment\/steps\.svg\)/);
  assert.match(await readFile(path.join(output, 'assets/pages/v1/guides/create-payment/steps.svg'), 'utf8'), /<svg/);
  await writeFile(guide, `${source}\n\n<Image src="./steps.svg" alt="Three steps" width="100vw" />\n`);
  await assert.rejects(compile(path.join(directory, 'docs.config.yaml')), /<Image> width must be a positive pixel number/);
});

test('complex endpoint HTML and Markdown share content; IDs survive file and slug changes', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const output = path.join(root, 'dist');
  const first = await compile(config, output);
  assert.equal(first.documents.length, 3);
  assert.deepEqual(first.documents.find(x => x.id === 'guide.create-payment')?.snippets, ['payment.request-prep', 'payment.retry-note']);
  assert.ok(first.dependencies.some(file => file.endsWith('/snippets/request-prep.mdx')));
  const reference = first.documents.find(x => x.id === 'reference.create-payment');
  assert.equal(reference?.url, '/v1/reference/create-payment');
  assert.ok(reference?.focusedContractUrl?.endsWith('.json'));
  assert.ok((reference?.focusedContractBytes ?? 0) > 0);
  assert.match(reference?.focusedContractDigest ?? '', /^[a-f0-9]{64}$/);
  const md = await readFile(path.join(output, 'v1/reference/create-payment.md'), 'utf8');
  const html = await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8');
  assert.match(html, /class="endpoint-method method-post">POST<\/span><code>\/payments<\/code>/);
  assert.match(html, /<nav class="side"[^>]*>[\s\S]*class="endpoint-method method-post">POST<\/span><span class="nav-entry-label">Create a payment<\/span>/);
  assert.ok(html.indexOf('<main id="main"') < html.indexOf('<aside class="page-rail">'), 'reference examples follow the article in reading order');
  assert.match(html, /href="#examples-title">View examples<\/a>/);
  assert.match(md, /## POST \/payments/);
  assert.match(html, /Request sample/);
  assert.match(html, /data-code-samples/);
  assert.match(html, /class="language-python"/);
  assert.match(html, /class="language-bash"/);
  assert.match(md, /--header 'Idempotency-Key: YOUR_IDEMPOTENCY_KEY'/);
  assert.match(md, /--data-raw '\{"amount":\{"value":1250/);
  assert.match(html, /<span class="edition">production<\/span>/);
  assert.doesNotMatch(html, /production · v1 · en/);
  assert.ok(md.includes(reference!.focusedContractUrl!));
  assert.ok(html.includes(reference!.focusedContractUrl!));
  const focused = JSON.parse(await readFile(path.join(output, reference!.focusedContractUrl!.slice(1)), 'utf8'));
  assert.deepEqual(Object.keys(focused.paths), ['/payments']);
  assert.deepEqual(Object.keys(focused.paths['/payments']).filter(key => ['get', 'post', 'put', 'patch', 'delete'].includes(key)), ['post']);
  assert.equal(focused.paths['/payments'].post.operationId, 'createPayment');
  assert.deepEqual(Object.keys(focused.components.securitySchemes).sort(), ['bearerAuth', 'keyAuth']);
  assert.deepEqual(Object.keys(focused.components.examples), ['BankPayment']);
  assert.ok(Object.keys(focused.components.schemas).length >= 5, 'multi-file schemas and recursive dependencies should be included');
  const focusedRefs: string[] = [];
  function collectRefs(value: any): void {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(collectRefs); return; }
    if (value.$ref) focusedRefs.push(value.$ref);
    Object.values(value).forEach(collectRefs);
  }
  collectRefs(focused);
  for (const ref of focusedRefs) {
    assert.ok(ref.startsWith('#/components/'), `focused contract contains external reference ${ref}`);
    assert.notEqual(ref.slice(2).split('/').reduce<any>((at, segment) => at?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], focused), undefined, `unresolved focused reference ${ref}`);
  }
  assert.equal((await auditFocusedContracts(output)).status, 'ok');
  const focusedFile = path.join(output, reference!.focusedContractUrl!.slice(1));
  await writeFile(focusedFile, (await readFile(focusedFile, 'utf8')).replace('#/components/schemas/Focused_', '#/components/schemas/Missing_'));
  assert.equal((await auditFocusedContracts(output)).status, 'error');
  assert.ok(html.includes('href="/assets/site.css"'));
  assert.ok((await readFile(path.join(output, 'assets/site.css'), 'utf8')).includes('tokens.css'));
  const catalog = JSON.parse(await readFile(path.join(output, '.well-known/api-catalog'), 'utf8'));
  assert.equal(catalog.linkset[0].item[0].href, 'https://api.example.test/v1');
  assert.equal(catalog.linkset[1]['service-desc'][0].href, 'https://docs.example.test/api/payments/production/v1/openapi.yaml');
  assert.ok((await readFile(path.join(output, 'api/payments/production/v1/schemas/payment.yaml'), 'utf8')).includes('CreatePayment'));
  assert.ok((await readFile(path.join(output, 'llms.txt'), 'utf8')).includes('/api/payments/production/v1/openapi.yaml'));
  assert.ok((await readFile(path.join(output, 'v1/overview.md'), 'utf8')).includes('](https://docs.example.test/llms.min.txt)'));
  const headers = JSON.parse(await readFile(path.join(output, 'resource-headers.json'), 'utf8'));
  assert.match(headers['/.well-known/api-catalog']['Content-Type'], /application\/linkset\+json/);
  assert.equal(headers[reference!.focusedContractUrl!]['Content-Type'], 'application/json');
  assert.equal(headers['/frontmatter.schema.json'], undefined);
  await assert.rejects(readFile(path.join(output, 'frontmatter.schema.json'), 'utf8'), /ENOENT/);
  await assert.rejects(readFile(path.join(output, 'frontmatter-reference.md'), 'utf8'), /ENOENT/);
  assert.doesNotMatch(await readFile(path.join(output, 'llms.txt'), 'utf8'), /frontmatter-reference|frontmatter\.schema/);
  const schema = JSON.parse(await readFile(path.join(root, '.shoalrun/frontmatter.schema.json'), 'utf8'));
  assert.equal(schema.additionalProperties, true);
  assert.equal(schema.properties.agent.properties.intent.type, 'string');
  assert.equal(schema.properties.agent.properties.intent['x-shoalrun-agent-public'], true);
  assert.equal(schema.properties.editorial.properties.reviewNote['x-shoalrun-agent-public'], false);
  assert.equal(schema.properties.seo.properties.title.type, 'string');
  assert.equal(schema.properties.seo.additionalProperties, false);
  const frontmatterReference = await readFile(path.join(root, '.shoalrun/frontmatter-reference.md'), 'utf8');
  assert.match(frontmatterReference, /`agent.intent` \| string/);
  assert.match(frontmatterReference, /`seo\.description` \| string/);
  assert.match(frontmatterReference, /`access\.policy` \| string \| With access/);
  assert.match(frontmatterReference, /`card\.title` \| string \| Optional/);
  assert.match(frontmatterReference, /A \*\*publication\*\* is an enabled combination/);
  assert.match(frontmatterReference, /generated Markdown twin.*separate from the source frontmatter/);
  const guideMarkdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  assert.match(guideMarkdown, /agent:\n  intent: Help readers prepare an idempotent payment request\./);
  assert.doesNotMatch(guideMarkdown, /reviewNote|Confirm the example amount/);
  assert.doesNotMatch(md, /agent:\n  intent:/);
  assert.equal(first.operations['payments.create'].find(x => x.id === 'reference.create-payment')?.focusedContractUrl, reference?.focusedContractUrl);
  assert.ok(html.includes('rel="describedby" href="/llms.min.txt"'));
  assert.ok(html.includes('<a href="/v1/guides/create-payment">idempotency key</a>'));
  assert.ok(md.includes('[idempotency key](https://docs.example.test/v1/guides/create-payment.md)'));
  for (const detail of ['Idempotency-Key', 'payments', 'pending', 'Recursive reference', 'application/problem+json', 'const: "card"']) {
    assert.ok(md.includes(detail), `Markdown omitted ${detail}`);
    assert.ok(html.includes(detail.replaceAll('"', '&#x22;')) || html.includes(detail), `HTML omitted ${detail}`);
  }
  for (const detail of ['HTTP bearer', 'API key in header X-Example-Key', 'Card token', 'Additional properties: allowed.', 'https://api.example.test/v1']) {
    assert.ok(md.includes(detail), `Markdown omitted ${detail}`);
    assert.ok(html.includes(detail), `HTML omitted ${detail}`);
  }
  assert.equal((md.match(/Idempotency-Key \(header\)/g) ?? []).length, 1);
  assert.ok(!md.includes('Path-level default overridden by this operation.'));
  assert.match(md, /`amount` `object` \*\*required\*\*/);
  assert.match(md, /`status` `enum<string>` \*\*always present\*\*/);
  assert.match(md, /`events` `list of [^`]+` \*\*may be absent\*\*/);
  assert.match(html, /<code>status<\/code> <code class="api-field-type">enum&#x3C;string><\/code> <strong>always present<\/strong>/);
  assert.match(html, /<code>events<\/code> <code class="api-field-type">list of [^<]+<\/code> <strong>may be absent<\/strong>/);
  assert.match(html, /aria-label="Field path: status"/);
  assert.match(html, /class="api-response-header"><h4[^>]*><span class="api-status-code">201<\/span><span class="api-separator">: <\/span>Created<\/h4><p class="api-response-media"><code>application\/json<\/code><\/p>/);
  assert.match(html, /class="api-enum-options"><span class="api-enum-label">Available options: <\/span>/);
  assert.match(md, /Available options:/);
  assert.ok(!html.includes('<p><blockquote>'));
  assert.ok(!md.includes('<Callout'));
  assert.ok(!md.includes('$ref'));
  assert.ok(md.includes('/v1/guides/create-payment.md'));
  assert.ok((await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8')).includes('/v1/reference/create-payment.md'));
  const snippetMarkdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  const snippetHtml = await readFile(path.join(output, 'v1/guides/create-payment/index.html'), 'utf8');
  for (const value of ['For Payments requests, choose a unique Idempotency-Key', 'Retry safely:', 'Reuse the same request key']) {
    assert.ok(snippetMarkdown.includes(value));
    assert.ok(snippetHtml.includes(value));
  }
  for (const name of ['Card token payment', 'Bank account payment', 'Pending payment', 'Succeeded payment', 'Conflicting idempotency key', 'Retry the same payment']) {
    assert.ok(md.includes(name), `Markdown omitted named example ${name}`);
    assert.ok(html.includes(name), `HTML omitted named example ${name}`);
  }
  assert.ok(html.includes('class="layout has-rail has-examples api-reference"'));
  const navigation = html.slice(html.indexOf('<nav class="side"'), html.indexOf('</nav>', html.indexOf('<nav class="side"')) + 6);
  assert.ok(navigation.includes('<div class="nav-search" hidden>'));
  assert.ok(navigation.includes('<summary>Payments <span class="nav-count">2</span></summary>'));
  assert.ok(navigation.indexOf('href="/v1/reference/create-payment"') < navigation.indexOf('href="/v1/guides/create-payment"'), 'authored navigation order should be retained');
  assert.match(navigation, /data-search="Payments Create a payment [^"]*POST \/payments createPayment payments\.create/);
  assert.ok(navigation.includes('aria-current="page"'));
  assert.ok(html.includes('<script type="module" src="/assets/navigation.js"></script>'));
  assert.ok((await readFile(path.join(output, 'assets/navigation.js'), 'utf8')).includes('nav-filter'));
  assert.ok(html.includes('<section class="examples"'));
  assert.match(html, /<option value="shape">JSON shape<\/option><option value="examples">Examples<\/option>/);
  assert.match(html, /Available examples: Card token payment · Bank account payment/);
  assert.match(html, /Available examples: Pending payment · Succeeded payment/);
  assert.match(html, /<summary>Bank account payment<span class="example-key">bank<\/span><\/summary>/);
  assert.match(html, /Uses a saved bank account instead of a card token\./);
  assert.match(html, /data-api-view="shape"/);
  assert.match(html, /data-api-view="examples"/);
  assert.doesNotMatch(html, /data-api-view="(?:shape|examples)" hidden/);
  assert.match(html, /<details id="example-payments-create-request/);
  assert.ok(html.includes('Response 201 · application/json'));
  assert.ok(html.includes('Response 409 · application/problem+json'));
  const groups = [...html.matchAll(/<section class="example-group"[^>]*>[\s\S]*?<\/section>/g)].map(match => match[0]);
  assert.equal(groups.length, 3);
  for (const group of groups) {
    const details = [...group.matchAll(/<details id="([^"]+)" name="([^"]+)"( open)?>/g)];
    assert.ok(details.length > 0);
    assert.equal(details.filter(match => match[3]).length, 1, 'one named example should open by default per context');
    assert.equal(new Set(details.map(match => match[2])).size, 1, 'examples in a context should form one selector');
  }
  assert.ok(html.includes('<script type="module" src="/assets/example-panel.js"></script>'));
  assert.ok((await readFile(path.join(output, 'assets/example-panel.js'), 'utf8')).includes('hashchange'));
  assert.ok((await readFile(path.join(output, 'assets/example-panel.js'), 'utf8')).includes("showView('examples')"));
  assert.ok(md.includes('OpenAPI component #/components/examples/BankPayment'));
  assert.match(html, /<li id="field-request-application-json-amount-value-[^"]+" data-field=/);
  assert.doesNotMatch(md, /<a id="field-/);
  const original = path.join(root, 'content/create-payment.mdx');
  const renamed = path.join(root, 'content/renamed-reference.mdx');
  await rename(original, renamed);
  await writeFile(renamed, (await readFile(renamed, 'utf8')).replace('slug: /reference/create-payment', 'slug: /reference/payments/new'));
  const second = await compile(config, output);
  const moved = second.documents.find(x => x.id === 'reference.create-payment');
  assert.equal(moved?.url, '/v1/reference/payments/new');
  assert.deepEqual(second.operations['payments.create'].map(x => x.id).sort(), ['guide.create-payment', 'reference.create-payment']);
  assert.ok((await readFile(path.join(output, 'v1/overview.md'), 'utf8')).includes('/v1/reference/payments/new.md'));
  assert.ok((await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8')).includes('/v1/reference/payments/new.md'));
  assert.match(await readFile(path.join(output, 'v1/reference/payments/new/index.html'), 'utf8'), /<li id="field-request-application-json-amount-value-[^"]+" data-field=/);
});

test('cURL examples combine query authentication and required parameters', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-curl-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0', servers: [{ url: 'https://api.example.test/v1' }],
    components: { securitySchemes: { key: { type: 'apiKey', in: 'query', name: 'api_key' } } },
    security: [{ key: [] }],
    paths: { '/items/{id}': { get: { operationId: 'getItem', parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
      { in: 'query', name: 'filter', required: true, schema: { type: 'string' } }
    ], responses: { '200': { description: 'OK' } } } } }
  }));
  const generated = await new ApiReader().operation(file, 'getItem');
  assert.match(generated.curl ?? '', /--url 'https:\/\/api\.example\.test\/v1\/items\/YOUR_ID\?filter=YOUR_FILTER&api_key=YOUR_API_KEY'/);
  assert.match(renderMarkdown(semanticRoot(generated.blocks)), /```bash\ncurl --request GET/);
});

test('reference keeps referenced field descriptions visible and respects operation servers and security', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-reference-detail-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0',
    servers: [{ url: 'https://global.example.test' }],
    security: [{ globalKey: [] }],
    components: {
      securitySchemes: {
        globalKey: { type: 'apiKey', in: 'header', name: 'Global-Key' },
        localKey: { type: 'apiKey', in: 'header', name: 'Local-Key', description: 'Use a local token.' }
      },
      schemas: {
        Child: { type: 'object', description: 'Decide from this description.', properties: { value: { type: 'string' } } },
        Choice: { oneOf: [{ title: 'First shape', description: 'Use for the first case.', $ref: '#/components/schemas/Child' }] },
        Entry: { type: 'string', description: 'Entity ID.\n[Learn more](/docs).' },
        Status: { type: 'string', description: 'Allowed status values.', enum: ['open', 'closed'] }
      }
    },
    paths: { '/items': {
      servers: [{ url: 'https://path.example.test' }],
      get: {
        operationId: 'getItems',
        parameters: [
          { name: 'entry', in: 'query', description: 'Entity ID. [Learn more](/docs)', schema: { $ref: '#/components/schemas/Entry' } },
          { name: 'status', in: 'query', description: 'Filter by status.', schema: { $ref: '#/components/schemas/Status' } }
        ],
        servers: [{ url: 'https://operation.example.test', description: 'Operation server' }],
        security: [{ localKey: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { type: 'object', properties: { child: { $ref: '#/components/schemas/Child' }, choice: { $ref: '#/components/schemas/Choice' } } } },
              'application/octet-stream': { schema: { type: 'string', format: 'binary' } }
            }
          }
        }
      }
    } }
  }));
  const generated = await new ApiReader().operation(file, 'getItems');
  const html = renderHtml(semanticRoot(generated.blocks));
  assert.match(html, /class="api-server-list"/);
  assert.match(html, /https:\/\/operation\.example\.test/);
  assert.doesNotMatch(html, /global\.example\.test|path\.example\.test|Global-Key/);
  assert.match(html, /class="api-auth-list"/);
  assert.match(html, /Local-Key/);
  assert.match(html, /class="api-auth-list"><div class="api-info-card"><p><strong>API key<\/strong><\/p><p>API key in header Local-Key\.<\/p>/);
  assert.match(html, /Use a local token\.<\/p><\/div><\/div>/);
  assert.equal((html.match(/Entity ID\./g) ?? []).length, 1);
  assert.match(html, /Filter by status\./);
  assert.match(html, /Allowed status values\./);
  assert.match(html, /class="api-enum-options"><span class="api-enum-label">Available options: <\/span>/);
  assert.match(html, /The response has exactly one of these shapes:/);
  assert.match(html, /<h5[^>]*>application\/octet-stream<\/h5>/);
  assert.match(renderMarkdown(semanticRoot(generated.blocks)), /##### application\/octet-stream/);
  assert.match(html, /data-path="child\.value"/);
  const description = html.indexOf('Decide from this description.');
  const fields = html.indexOf('<summary>1 property', description);
  assert.ok(description >= 0 && fields > description);
  assert.equal(html.slice(description, fields).includes('</details>'), false);
  assert.doesNotMatch(html, /<summary>Properties/);
  const choice = renderHtml(semanticRoot(await new ApiReader().schemaReference(file, '#/components/schemas/Choice')));
  assert.match(choice, /Use exactly one of these shapes:/);
  assert.match(choice, /class="api-schema-variant"/);
  assert.match(choice, /<strong>First shape<\/strong>/);
  assert.match(choice, /First shape<\/strong><span class="api-variant-count"> · 1 property<\/span>/);
  assert.match(choice, /Use for the first case\./);
  assert.doesNotMatch(choice, /Additional schema keywords at this use/);
});

test('reference audit renders every operation and checks example and anchor parity', async () => {
  const result = await auditReference(path.join(example, 'apis/payments/openapi.yaml'));
  assert.equal(result.status, 'ok');
  assert.ok(result.operations > 0);
  assert.ok(result.namedExamples >= 6);
  assert.equal(result.failures.length, 0);
});

test('common numeric, array, and object constraints appear in HTML and Markdown', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-schema-constraints-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'openapi.json');
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0', info: { title: 'Constraints', version: '1' }, paths: {
      '/items': { post: { operationId: 'createItem', responses: { '200': { description: 'OK', content: {
        'application/json': { schema: { type: 'object', minProperties: 1, maxProperties: 3, properties: {
          count: { type: 'number', minimum: 0, maximum: 10, multipleOf: 0.5 },
          tags: { type: 'array', uniqueItems: true, items: { type: 'string' } }
        } } }
      } } } } }
    }
  }));
  const blocks = (await new ApiReader().operation(file, 'createItem')).blocks;
  for (const rendered of [renderHtml(semanticRoot(blocks)), renderMarkdown(semanticRoot(blocks))]) {
    for (const constraint of ['minProperties: 1', 'maxProperties: 3', 'multipleOf: 0.5', 'uniqueItems: true']) {
      assert.ok(rendered.includes(constraint), constraint);
    }
  }
  assert.equal((await auditReference(file)).status, 'ok');
  const spec = JSON.parse(await readFile(file, 'utf8'));
  spec.paths['/items'].post.responses['200'].content['application/json'].schema.properties.tags.propertyNames = { pattern: '^[a-z]+$' };
  await writeFile(file, JSON.stringify(spec));
  const audit = await auditReference(file);
  assert.equal(audit.status, 'error');
  assert.match(audit.failures[0].message, /Unsupported schema keyword propertyNames at response\/200\/application\/json\/tags/);
});

test('exclusive bounds follow the entry OpenAPI version through external schemas', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-exclusive-bounds-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'openapi.json');
  const schemaFile = path.join(directory, 'bounds.json');
  const spec = (openapi: string) => ({ openapi, info: { title: 'Bounds', version: '1' }, paths: {
    '/value': { get: { operationId: 'getValue', responses: { '200': { description: 'OK', content: {
      'application/json': { schema: { $ref: './bounds.json' } }
    } } } } }
  } });
  const reader = new ApiReader();
  await writeFile(file, JSON.stringify(spec('3.0.3')));
  await writeFile(schemaFile, JSON.stringify({ type: 'number', minimum: 0, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }));
  const legacy = renderMarkdown(semanticRoot((await reader.operation(file, 'getValue')).blocks));
  assert.match(legacy, /minimum: 0; maximum: 10; exclusiveMinimum: true; exclusiveMaximum: false/);
  await writeFile(schemaFile, JSON.stringify({ type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 10 }));
  await assert.rejects(new ApiReader().operation(file, 'getValue'), /exclusiveMinimum in OpenAPI 3\.0 needs a boolean/);
  await writeFile(file, JSON.stringify(spec('3.1.0')));
  const modern = renderMarkdown(semanticRoot((await new ApiReader().operation(file, 'getValue')).blocks));
  assert.match(modern, /exclusiveMinimum: 0; exclusiveMaximum: 10/);
  await writeFile(schemaFile, JSON.stringify({ type: 'number', minimum: 0, exclusiveMinimum: true }));
  await assert.rejects(new ApiReader().operation(file, 'getValue'), /exclusiveMinimum in OpenAPI 3\.1 needs a number/);
});

test('OpenAPI 3.1 boolean schemas render their meaning and 3.0 rejects them', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-boolean-schema-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'openapi.json');
  const spec = (openapi: string) => ({ openapi, info: { title: 'Boolean schemas', version: '1' }, paths: {
    '/value': { get: { operationId: 'getValue', responses: { '200': { description: 'OK', content: {
      'application/json': { schema: { type: 'object', properties: { anything: true, never: false, values: { type: 'array', items: false } } } }
    } } } } }
  }, components: { schemas: { Any: true } } });
  await writeFile(file, JSON.stringify(spec('3.1.0')));
  const reader = new ApiReader();
  const operation = await reader.operation(file, 'getValue');
  const markdown = renderMarkdown(semanticRoot(operation.blocks));
  assert.match(markdown, /`anything` `any value`/);
  assert.match(markdown, /`never` `no valid value`/);
  assert.match(markdown, /Any value is allowed\./);
  assert.match(markdown, /No value is allowed\./);
  assert.deepEqual(operation.shapes[0].value, { anything: '<any value>', never: '<no valid value>', values: ['<no valid value>'] });
  assert.match(renderMarkdown(semanticRoot(await reader.schemaReference(file, '#/components/schemas/Any'))), /Any value is allowed\./);
  await writeFile(file, JSON.stringify(spec('3.0.3')));
  await assert.rejects(new ApiReader().operation(file, 'getValue'), /Boolean schemas require OpenAPI 3\.1/);
});

test('OpenAPI 3.1 schema examples appear in both representations', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-schema-examples-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'openapi.json');
  const spec = (openapi: string) => ({ openapi, info: { title: 'Examples', version: '1' }, paths: {
    '/values': { get: { operationId: 'getValues', responses: { '200': { description: 'OK', content: {
      'application/json': { schema: { type: 'object', examples: [{ code: 'one' }, { code: 'two' }] } }
    } } } } }
  } });
  await writeFile(file, JSON.stringify(spec('3.1.0')));
  const blocks = (await new ApiReader().operation(file, 'getValues')).blocks;
  for (const rendered of [renderHtml(semanticRoot(blocks)), renderMarkdown(semanticRoot(blocks))]) {
    assert.match(rendered, /Example 1 \(authored in OpenAPI\)/);
    assert.match(rendered, /Example 2 \(authored in OpenAPI\)/);
    assert.match(rendered, /"code": "one"/);
    assert.match(rendered, /"code": "two"/);
  }
  assert.equal((await auditReference(file)).status, 'ok');
  await writeFile(file, JSON.stringify(spec('3.0.3')));
  await assert.rejects(new ApiReader().operation(file, 'getValues'), /Schema examples need an array in OpenAPI 3\.1/);
});

test('focused contract can publish without exposing the full OpenAPI source', async () => {
  const root = await fixture();
  const apiConfig = path.join(root, 'config/api.yaml');
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')).replace('publish: true', 'publish: false\n    focused: true'));
  const destination = path.join(root, 'dist');
  const manifest = await compile(path.join(root, 'docs.config.yaml'), destination);
  const reference = manifest.documents.find(x => x.id === 'reference.create-payment');
  assert.ok(reference?.focusedContractUrl);
  assert.equal(manifest.apiSources.length, 0);
  assert.equal(JSON.parse(await readFile(path.join(destination, reference!.focusedContractUrl!.slice(1)), 'utf8')).paths['/payments'].post.operationId, 'createPayment');
  await assert.rejects(readFile(path.join(destination, 'api/payments/production/v1/openapi.yaml'), 'utf8'), /ENOENT/);
  await assert.rejects(readFile(path.join(destination, '.well-known/api-catalog'), 'utf8'), /ENOENT/);
});

test('focused OpenAPI 3.0 export retains a recursive component', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-oas30-'));
  const source = path.join(root, 'openapi.yaml');
  await writeFile(source, `openapi: 3.0.3
info: { title: Example, version: 1.0.0 }
paths:
  /items/{id}:
    get:
      operationId: getItem
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Found
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
components:
  schemas:
    Item:
      type: object
      properties:
        parent: { $ref: '#/components/schemas/Item' }
`);
  const focused = await focusedOpenApi(new ApiReader(), source, 'getItem');
  assert.equal(focused.openapi, '3.0.3');
  assert.deepEqual(Object.keys(focused.paths), ['/items/{id}']);
  assert.deepEqual(Object.keys(focused.components.schemas), ['Item']);
  assert.equal(focused.components.schemas.Item.properties.parent.$ref, '#/components/schemas/Item');
});

test('guide frontmatter creates reciprocal API reference links and rejects invalid targets', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const output = path.join(root, 'dist');
  const guideFile = path.join(root, 'content/create-payment-guide.mdx');
  const original = await readFile(guideFile, 'utf8');
  const withTargets = (ids: string) => original.replace('operations: [payments.create]', `operations: [payments.create]\nrelatedApiReferences: [${ids}]`);
  await writeFile(guideFile, withTargets('reference.create-payment'));
  await compile(config, output);
  const guide = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  const reference = await readFile(path.join(output, 'v1/reference/create-payment.md'), 'utf8');
  assert.match(guide, /## Related API references\n\n- \[Create a payment\]\(https:\/\/docs\.example\.test\/v1\/reference\/create-payment\.md\)/);
  assert.match(reference, /## Related guides\n\n- \[Create a payment in the example API\]\(https:\/\/docs\.example\.test\/v1\/guides\/create-payment\.md\)/);
  assert.doesNotMatch(reference, /## Related documentation/);
  await writeFile(guideFile, withTargets('missing.reference'));
  await assert.rejects(compile(config, output), /unknown related API reference missing\.reference/);
  await writeFile(guideFile, withTargets('guide.create-payment'));
  await assert.rejects(compile(config, output), /must identify an api-reference page/);
  await writeFile(guideFile, withTargets('reference.create-payment, reference.create-payment'));
  await assert.rejects(compile(config, output), /relatedApiReferences must be a unique list/);
});

test('opt-in API page generation follows reviewed yes/no choices and preserves authored references', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const output = path.join(root, 'dist');
  const specFile = path.join(root, 'apis/payments/openapi.yaml');
  const apiConfig = path.join(root, 'config/api.yaml');
  const selectionFile = path.join(root, 'config/selection.yaml');
  await writeFile(specFile, (await readFile(specFile, 'utf8')) + `\n  /health:\n    get:\n      operationId: getHealth\n      summary: Check API health\n      tags: [Health]\n      responses:\n        '200':\n          description: Healthy.\n          content:\n            application/json:\n              schema:\n                type: object\n                required: [status]\n                properties:\n                  status: { type: string }\n  /status:\n    get:\n      operationId: getStatus\n      summary: Read API status\n      tags: [Health]\n      responses:\n        '200': { description: Ready. }\n`);
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')) + '\n  generateReferences: { $include: ./selection.yaml }\n');
  await writeFile(selectionFile, 'pathPrefix: /reference/generated\ninclude: []\n');
  let manifest = await compile(config, output);
  assert.equal(manifest.documents.length, 3);
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const choice = spawnSync(process.execPath, [cli, 'api', 'select', 'payments', config, '--output', selectionFile], { input: 'y\nn\n', encoding: 'utf8' });
  assert.equal(choice.status, 0, choice.stderr);
  assert.match(choice.stdout, /createPayment\) — authored page/);
  assert.match(await readFile(selectionFile, 'utf8'), /include:\n  - getHealth/);
  assert.doesNotMatch(await readFile(selectionFile, 'utf8'), /getStatus/);
  const beforeCancel = await readFile(selectionFile, 'utf8');
  const cancelled = spawnSync(process.execPath, [cli, 'api', 'select', 'payments', config, '--output', selectionFile], { input: 'q\n', encoding: 'utf8' });
  assert.equal(cancelled.status, 1);
  assert.match(cancelled.stderr, /selection cancelled; no file written/);
  assert.equal(await readFile(selectionFile, 'utf8'), beforeCancel);
  manifest = await compile(config, output);
  assert.equal(manifest.documents.length, 4);
  const generated = manifest.documents.find(doc => doc.id === 'reference.payments.getHealth');
  assert.match(generated?.url ?? '', /^\/v1\/reference\/generated\/get-health-[a-f0-9]{8}$/);
  assert.match(await readFile(path.join(output, `${generated!.url.slice(1)}.md`), 'utf8'), /GET \/health/);
  const generatedHtml = await readFile(path.join(output, `${generated!.url.slice(1)}/index.html`), 'utf8');
  assert.match(generatedHtml, /<summary>Health <span class="nav-count">1<\/span><\/summary>/);
  assert.match(generatedHtml, /data-api-view="shape"/);
  assert.match(generatedHtml, /data-api-view="examples"/);
  assert.match(generatedHtml, /Example request/);
  assert.match(generatedHtml, /id="api-view-select"/);
  assert.equal(manifest.documents.find(doc => doc.id === 'reference.create-payment')?.url, '/v1/reference/create-payment');
  await writeFile(specFile, (await readFile(specFile, 'utf8')).replace('Check API health', 'Read API health'));
  manifest = await compile(config, output);
  assert.equal(manifest.documents.find(doc => doc.id === 'reference.payments.getHealth')?.url, generated?.url);
  assert.equal(manifest.documents.find(doc => doc.id === 'reference.payments.getHealth')?.title, 'Read API health');
  await writeFile(selectionFile, 'include: [missingOperation]\n');
  await assert.rejects(compile(config, output), /unknown source operationId missingOperation/);
  await writeFile(selectionFile, 'exclude: [getHealth, getStatus]\n');
  assert.equal((await compile(config, output)).documents.length, 3);
});

test('generated references inherit project metadata and respect enforced visibility', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-generated-metadata-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  await writeFile(path.join(directory, 'openapi.yaml'), `openapi: 3.0.3
info: { title: Demo, version: '1' }
paths:
  /ping:
    get:
      operationId: ping
      responses:
        '200': { description: OK }
`);
  const config: any = {
    schemaVersion: 1, site: { title: 'Demo' },
    publications: { defaults: { channel: 'production', version: 'v1' }, channels: { production: {} }, versions: { v1: {} }, enabled: [{ channel: 'production', version: 'v1' }] },
    frontmatter: {
      defaults: { owner: 'docs-team', tocDepth: 0, subjectLifecycle: 'beta' },
      enforced: { owner: 'api-team' },
      fields: { owner: { type: 'string', required: true, public: true } }
    },
    outputs: { markdown: { metadata: { format: 'yaml-frontmatter', fields: { owner: 'frontmatter.owner' } } } },
    apis: { demo: { source: { kind: 'file', path: './openapi.yaml' }, generateReferences: true } }
  };
  const file = path.join(directory, 'docs.config.yaml');
  await writeFile(file, JSON.stringify(config));
  const output = path.join(directory, 'dist');
  const manifest = await compile(file, output);
  assert.equal(manifest.documents.length, 1);
  const page = manifest.documents[0];
  assert.equal(page.subjectLifecycle, 'beta');
  assert.match(await readFile(path.join(output, page.markdownUrl), 'utf8'), /owner: api-team/);
  assert.doesNotMatch(await readFile(path.join(output, page.url, 'index.html'), 'utf8'), /class="page-toc"/);
  config.frontmatter.enforced.access = { policy: 'draft' };
  await writeFile(file, JSON.stringify(config));
  assert.equal((await compile(file)).documents.length, 0);
  delete config.frontmatter.enforced.access;
  config.frontmatter.enforced.channel = 'sandbox';
  await writeFile(file, JSON.stringify(config));
  assert.equal((await compile(file)).documents.length, 0);
});

test('page table of contents links headings and respects frontmatter depth or suppression', () => {
  const doc: any = {
    file: 'content/page.md', frontmatter: { id: 'page', title: 'Page', summary: 'Summary', type: 'guide', slug: '/page', access: { policy: 'public' } },
    route: '/page', variant: { channel: 'production', version: 'v1', language: 'en' }
  };
  const tree = parse.parse('## Start\n\n### Details\n\n## Start\n\n#### Deep\n');
  const page = () => buildHtmlPage(doc, tree, '/page.md', 'Site', []);
  assert.match(page(), /href="#start"/);
  assert.match(page(), /href="#details"/);
  assert.match(page(), /href="#start-2"/);
  assert.match(page(), /<h2 id="start-2">Start<\/h2>/);
  assert.doesNotMatch(page(), /href="#deep"/);
  const collisionTree = parse.parse('## Main\n\n## Nav filter\n\n## Examples title\n\n## Shape group 1\n\n## Main\n');
  const collisionPage = buildHtmlPage(doc, collisionTree, '/page.md', 'Site', [], [], [{ location: 'request', status: null, mediaType: 'application/json', value: {} }]);
  const ids = [...collisionPage.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['main-2', 'nav-filter-2', 'examples-title-2', 'shape-group-1-2', 'main-3']) {
    assert.ok(collisionPage.includes(`href="#${id}"`));
    assert.ok(collisionPage.includes(`<h2 id="${id}">`));
  }
  doc.frontmatter.tocDepth = 2;
  assert.doesNotMatch(page(), /href="#details"/);
  assert.match(page(), /<h3 id="details">Details<\/h3>/);
  doc.frontmatter.tocDepth = 0;
  assert.doesNotMatch(page(), /class="page-toc"/);
  assert.match(page(), /<h2 id="start">Start<\/h2>/);
  for (const depth of [1, 7, -1, '3']) {
    doc.frontmatter.tocDepth = depth;
    assert.throws(() => validateFrontmatter(doc.frontmatter, {}, doc.file), /tocDepth must be 0 or an integer from 2 through 6/);
  }
});

test('project CSS loads after the base stylesheet and publication label can be forced or hidden', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const siteFile = path.join(directory, 'config/site.yaml');
  const original = await readFile(siteFile, 'utf8');
  const customFile = path.join(directory, 'config/project.css');
  await writeFile(customFile, ':root { --color-accent: #123456; }\n');
  const output = path.join(directory, 'site-dist');
  await writeFile(siteFile, original + 'customCss: ./project.css\neditionBadge: always\n');
  const always = await compile(path.join(directory, 'docs.config.yaml'), output);
  const page = always.documents.find(doc => doc.id === 'reference.create-payment')!;
  let html = await readFile(path.join(output, page.url, 'index.html'), 'utf8');
  assert.match(html, /site\.css"><link rel="stylesheet" href="\/assets\/fonts\.css"><link rel="stylesheet" href="\/assets\/project\.css"/);
  assert.match(html, /<span class="edition">production · v1 · en<\/span>/);
  assert.equal(await readFile(path.join(output, 'assets/project.css'), 'utf8'), ':root { --color-accent: #123456; }\n');
  assert.ok(always.dependencies.includes(customFile));
  await writeFile(siteFile, original + 'customCss: ./project.css\neditionBadge: never\n');
  await compile(path.join(directory, 'docs.config.yaml'), output);
  html = await readFile(path.join(output, page.url, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /class="edition"/);
  await writeFile(siteFile, original + 'editionBadge: sometimes\n');
  await assert.rejects(compile(path.join(directory, 'docs.config.yaml')), /site\.editionBadge must be auto, always, or never/);
});

test('theme shapes and palettes load between base and project CSS and reject unknown names', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const original = await readFile(configFile, 'utf8');
  const output = path.join(directory, 'site-dist');
  const build = async (extra: string) => {
    await writeFile(configFile, original + extra);
    await rm(output, { recursive: true, force: true });
    const built = await compile(configFile, output);
    const page = built.documents.find(doc => doc.id === 'reference.create-payment')!;
    return { built, html: await readFile(path.join(output, page.url, 'index.html'), 'utf8') };
  };
  let { built: plain, html } = await build('');
  assert.ok(plain.dependencies.some(file => file.endsWith('palettes/kelp.yaml')), 'the contrast check reads kelp.yaml even when no palette CSS is written');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="color-scheme" content="light">/);
  assert.doesNotMatch(html, /theme\.css|palette\.css|mode\.js|mode-toggle/);
  assert.match(html, /<link rel="preload" href="\/assets\/fonts\/inter\.woff2" as="font" type="font\/woff2" crossorigin>/);
  assert.match(await readFile(path.join(output, 'assets/fonts.css'), 'utf8'), /@font-face\{font-family:"Inter";src:url\("\/assets\/fonts\/inter\.woff2"\)/);
  assert.ok((await readFile(path.join(output, 'assets/fonts/inter.woff2'))).subarray(0, 4).equals(Buffer.from('wOF2')), 'font files are copied as binary');
  assert.match(await readFile(path.join(output, 'assets/fonts.css'), 'utf8'), /@font-face\{font-family:"Inter Fallback";src:local\("Arial"\)[^}]*size-adjust:107\.34%/, 'metric-matched fallbacks limit layout shift');
  ({ html } = await build('theme: { fonts: system }\n'));
  assert.doesNotMatch(html, /fonts\.css|rel="preload"/);
  await mkdir(path.join(directory, 'fonts'), { recursive: true });
  await writeFile(path.join(directory, 'fonts/Acme.woff2'), 'wOF2 test');
  ({ html } = await build('theme:\n  preset: ledger\n  fonts:\n    body: { family: Acme Sans, files: [./fonts/Acme.woff2, { file: ./fonts/Acme.woff2, style: italic, weight: 400 }] }\n    code: Berkeley Mono\n'));
  assert.doesNotMatch(html, /rel="preload"/, 'a custom body font replaces the preset preload');
  const customFonts = await readFile(path.join(output, 'assets/fonts.css'), 'utf8');
  assert.match(customFonts, /@font-face\{font-family:"Acme Sans";src:url\("\/assets\/fonts\/project\/Acme\.woff2"\) format\("woff2"\);font-style:italic;font-weight:400/);
  assert.match(customFonts, /:root\{--font-body:"Acme Sans", ui-sans-serif, system-ui, sans-serif;--font-code:"Berkeley Mono", ui-monospace/);
  assert.equal(await readFile(path.join(output, 'assets/fonts/project/Acme.woff2'), 'utf8'), 'wOF2 test');
  for (const [preset, palette] of [['reef', 'coral'], ['ledger', 'ink'], ['vice', 'vice']]) {
    const { built, html } = await build(`theme: { preset: ${preset} }\n`);
    assert.match(html, new RegExp(`data-theme="${preset}" data-palette="${palette}"`));
    assert.equal(/data-masthead="inked"/.test(html), preset !== 'reef', 'ledger and vice share the inked masthead rules');
    assert.match(html, /site\.css"><link rel="stylesheet" href="\/assets\/theme\.css" data-theme-link="theme"><link rel="stylesheet" href="\/assets\/palette\.css" data-theme-link="palette">/);
    assert.doesNotMatch(html, /theme-switcher/);
    assert.doesNotMatch(await readFile(path.join(output, 'assets/theme.css'), 'utf8'), /--color-[a-z-]+:/);
    const css = await readFile(path.join(output, 'assets/palette.css'), 'utf8');
    assert.match(css, /^:root\{color-scheme:light;--color-text:/m);
    assert.doesNotMatch(css, /prefers-color-scheme|data-mode/);
    assert.ok(built.dependencies.some(file => file.endsWith(`themes/${preset}.css`)));
    assert.ok(built.dependencies.some(file => file.endsWith(`palettes/${palette}.yaml`)));
  }
  ({ html } = await build('theme: { mode: dark }\n'));
  assert.match(html, /data-theme="shoal" data-palette="kelp"/);
  assert.match(html, /<meta name="color-scheme" content="dark">/);
  assert.doesNotMatch(html, /mode\.js|mode-toggle/);
  assert.match(await readFile(path.join(output, 'assets/palette.css'), 'utf8'), /^:root\{color-scheme:dark;--color-text:#d3e2dc/m);
  ({ html } = await build('theme: { preset: reef, palette: harbor, mode: system }\n'));
  assert.match(html, /<meta name="color-scheme" content="light dark"><link rel="canonical" href="https:\/\/docs\.example\.test\/v1\/reference\/create-payment"><script src="\/assets\/mode\.js"><\/script>/);
  assert.match(html, /<button type="button" class="mode-toggle" aria-pressed="false" hidden><span class="mode-toggle-label">Dark mode<\/span>/);
  const systemCss = await readFile(path.join(output, 'assets/palette.css'), 'utf8');
  assert.match(systemCss, /@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-mode=light\]\)\{color-scheme:dark;/);
  assert.match(systemCss, /:root\[data-mode=dark\]\{color-scheme:dark;/);
  ({ html } = await build('theme: { mode: system, toggle: false }\n'));
  assert.match(html, /content="light dark"/);
  assert.doesNotMatch(html, /mode\.js|mode-toggle/);
  ({ html } = await build('theme:\n  palette:\n    extends: harbor\n    light: { accent: "#0A6A48", link: "#0a6a48" }\n    dark: { link: "#7fe0bd" }\n'));
  assert.match(html, /data-palette="custom"/);
  assert.match(await readFile(path.join(output, 'assets/palette.css'), 'utf8'), /--color-accent:#0a6a48;[^}]*--color-link:#0a6a48|--color-link:#0a6a48;[^}]*--color-accent:#0a6a48/);
  for (const [extra, error] of [
    ['theme: { preset: coral }\n', /theme\.preset must be one of shoal, reef, ledger, vice/],
    ['theme: { palette: neon }\n', /theme\.palette must be one of kelp, coral, ink, harbor, amethyst, vice/],
    ['theme: { preset: reef, accent: red }\n', /theme accepts only preset, palette, mode, toggle, and fonts/],
    ['theme: { mode: dusk }\n', /theme\.mode must be light, dark, or system/],
    ['theme: { fonts: { title: Acme } }\n', /theme\.fonts accepts only body, headings, and code; remove title/],
    ['theme: { fonts: { body: { family: Acme, files: [./fonts/acme.svg] } } }\n', /theme\.fonts\.body\.files\[0\] must be a local \.woff2, \.woff, \.ttf, or \.otf file/],
    ['theme: { fonts: { body: { family: Acme, files: [./fonts/missing.woff2] } } }\n', /theme\.fonts: font file not found/],
    ['theme: { fonts: { body: { family: Acme, files: ["./fonts/a b).woff2"] } } }\n', /file name may use only letters, numbers, dots, dashes, and underscores/],
    ['theme: { fonts: { body: "Acme; color: red" } }\n', /theme\.fonts\.body\.family must be a font name/],
    ['theme: { toggle: true }\n', /theme\.toggle needs theme\.mode: system/],
    ['theme: { palette: { extends: harbor, light: { brand: "#000000" } } }\n', /theme\.palette\.light\.brand is not a palette token/],
    ['theme: { palette: { light: { link: red } } }\n', /theme\.palette\.light\.link must be a hex color/],
    ['theme: { palette: { light: { link: "#9fe6cc" } } }\n', /Theme colors fail WCAG 2\.2 contrast:\n  - light: link #9fe6cc on page #ffffff is 1\.\d\d:1; needs 4\.5:1/],
    ['theme: { mode: system, palette: { dark: { text: "#333333" } } }\n', /dark: text #333333 on page/]
  ] as const) {
    await writeFile(configFile, original + extra);
    await assert.rejects(compile(configFile), error);
  }
});

test('custom callout tones switch to dark colors and are checked for contrast in every shown mode', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const original = await readFile(configFile, 'utf8');
  const guide = path.join(directory, 'content/callout-tone.mdx');
  await writeFile(guide, '---\nid: guide.callout-tone\ntitle: Callout tone\nsummary: Shows a custom tone.\ntype: guide\nslug: /guide/callout-tone\nchannel: production\nversion: v1\nlocale: en\naccess: { policy: public }\n---\n\n<Callout type="experiment">Try it.</Callout>\n');
  const output = path.join(directory, 'site-dist');
  const tone = (dark = "\n      dark: { line: '#3cb9c4', background: '#0e2a2d', text: '#8fe3ea' }") => `callouts:\n  tones:\n    laboratory:\n      line: '#087f8c'\n      background: '#e9f8f8'\n      text: '#075c66'${dark}\n  types:\n    experiment: { label: Experiment, tone: laboratory }\n`;
  const build = async (extra: string) => {
    await writeFile(configFile, original + extra);
    await rm(output, { recursive: true, force: true });
    const built = await compile(configFile, output);
    return readFile(path.join(output, built.documents.find(doc => doc.id === 'guide.callout-tone')!.url, 'index.html'), 'utf8');
  };
  // Light-only sites keep the exact markup they had before dark colors existed.
  let html = await build(tone(''));
  assert.match(html, /class="callout callout-laboratory" data-callout-type="experiment" style="--callout-line:#087f8c;--callout-bg:#e9f8f8;--callout-text:#075c66">/);
  html = await build(tone() + 'theme: { mode: system }\n');
  assert.match(html, /style="--callout-line:#087f8c;--callout-bg:#e9f8f8;--callout-text:#075c66;--callout-dark-line:#3cb9c4;--callout-dark-bg:#0e2a2d;--callout-dark-text:#8fe3ea" data-callout-dark/);
  const css = await readFile(path.join(output, 'assets/palette.css'), 'utf8');
  assert.match(css, /@media \(prefers-color-scheme:dark\)\{[^\n]*:root:not\(\[data-mode=light\]\) \.content blockquote\.callout\[data-callout-dark\]\{--callout-line:var\(--callout-dark-line\)!important/);
  assert.match(css, /:root\[data-mode=dark\] \.content blockquote\.callout\[data-callout-dark\]\{/);
  await build(tone() + 'theme: { mode: dark }\n');
  assert.match(await readFile(path.join(output, 'assets/palette.css'), 'utf8'), /^\.content blockquote\.callout\[data-callout-dark\]\{--callout-line:var\(--callout-dark-line\)!important/m);
  for (const [extra, error] of [
    [tone('') + 'theme: { mode: system }\n', /callouts\.tones\.laboratory needs dark colors because the site shows dark mode/],
    [tone('') + 'theme: { mode: dark }\n', /callouts\.tones\.laboratory needs dark colors/],
    [tone("\n      dark: { line: '#3cb9c4', background: '#d0f0f2', text: '#8fe3ea' }") + 'theme: { mode: system }\n', /callouts\.tones\.laboratory dark: text #d3e2dc on background #d0f0f2 is 1\.\d\d:1; needs 4\.5:1/],
    [tone('').replace("text: '#075c66'", "text: '#9fd8dc'"), /callouts\.tones\.laboratory light: label text #9fd8dc on background #e9f8f8/]
  ] as const) {
    await writeFile(configFile, original + extra);
    await assert.rejects(compile(configFile), error);
  }
  assert.equal(contrast('#000000', '#ffffff80', '#000000').toFixed(2), contrast('#000000', '#808080').toFixed(2));
});

test('built-in palettes meet WCAG contrast in both modes and kelp matches the base tokens', async () => {
  for (const name of paletteNames) assert.deepEqual(contrastProblems(await resolvePalette(name, 'kelp'), ['light', 'dark']), [], name);
  const tokens = Object.fromEntries([...(await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../styles/tokens.css'), 'utf8')).matchAll(/--color-([a-z-]+): (#[\da-f]+);/gi)].map(match => [match[1], match[2].toLowerCase().replace(/^#([\da-f])([\da-f])([\da-f])$/, '#$1$1$2$2$3$3')]));
  const kelp = await resolvePalette('kelp', 'kelp');
  for (const [token, value] of Object.entries(tokens)) assert.equal(kelp.light[token as keyof typeof kelp.light], value, token);
  assert.equal(contrast('#ffffff', '#000000').toFixed(1), '21.0');
});

test('header search and links render in the masthead and are validated', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const siteFile = path.join(directory, 'config/site.yaml');
  const original = await readFile(siteFile, 'utf8');
  const configFile = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'site-dist');
  await writeFile(siteFile, original + 'header:\n  links:\n    - { label: Status, href: /status }\n    - { label: "Sign <in>", href: "https://example.test/login", style: primary }\n');
  const built = await compile(configFile, output);
  const page = built.documents.find(doc => doc.id === 'reference.create-payment')!;
  const html = await readFile(path.join(output, page.url, 'index.html'), 'utf8');
  assert.match(html, /<div class="site-search" data-variant="production\|v1\|en" hidden>/);
  assert.match(html, /<a class="header-link" href="\/status">Status<\/a><a class="header-primary" href="https:\/\/example\.test\/login" rel="noopener">Sign &lt;in><\/a>/);
  assert.match(html, /src="\/assets\/search\.js"/);
  assert.match(await readFile(path.join(output, 'assets/search-provider.js'), 'utf8'), /export async function search\(query, context\)/);
  const markdown = await readFile(path.join(output, page.markdownUrl), 'utf8');
  assert.doesNotMatch(markdown, /Sign|Status\]|site-search|Search documentation/);
  const index = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'));
  const entry = index.documents.find((doc: any) => doc.url === page.url);
  assert.equal(entry.title, page.title);
  assert.equal(entry.id, page.id);
  assert.equal(entry.markdownUrl, page.markdownUrl);
  assert.equal(entry.variant, 'production|v1|en');
  assert.ok(entry.headings.length > 0 && entry.headings.every((heading: any) => heading.id && heading.title && !heading.title.includes('<')));
  assert.ok(entry.text.length > 0 && !entry.text.includes('<'));
  for (const [extra, error] of [
    ['header: { links: [{ label: X, href: "javascript:alert(1)" }] }\n', /href must be a site path, http\(s\) URL, or mailto link/],
    ['header: { links: [{ label: X, href: /x, style: ghost }] }\n', /style must be link, button, or primary/],
    ['header: { logo: x }\n', /site\.header does not accept logo/]
  ] as const) {
    await writeFile(siteFile, original + extra);
    await assert.rejects(compile(configFile), error);
  }
});

test('site footer renders columns, bottom links, and text in HTML only, and is validated', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const siteFile = path.join(directory, 'config/site.yaml');
  const original = await readFile(siteFile, 'utf8');
  const configFile = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'site-dist');
  const plain = await compile(configFile, output);
  const plainPage = plain.documents.find(doc => doc.id === 'reference.create-payment')!;
  assert.doesNotMatch(await readFile(path.join(output, plainPage.url, 'index.html'), 'utf8'), /site-footer/, 'no footer unless configured');
  await writeFile(siteFile, original + 'footer:\n  columns:\n    - title: Guides\n      links:\n        - { label: Start, href: /start }\n        - { label: "Help <desk>", href: "https://help.example.test" }\n  links:\n    - { label: Privacy, href: /privacy }\n  text: "© 2026 Example <Inc>"\n');
  const built = await compile(configFile, output);
  const page = built.documents.find(doc => doc.id === 'reference.create-payment')!;
  const html = await readFile(path.join(output, page.url, 'index.html'), 'utf8');
  assert.match(html, /<\/div><footer class="site-footer"><div class="footer-inner"><div class="footer-columns"><section class="footer-column" aria-labelledby="footer-column-1"><h2 class="footer-title" id="footer-column-1">Guides<\/h2><ul><li><a href="\/start">Start<\/a><\/li><li><a href="https:\/\/help\.example\.test" rel="noopener">Help &lt;desk><\/a><\/li><\/ul><\/section><\/div>/);
  assert.match(html, /<div class="footer-bottom"><p class="footer-text">© 2026 Example &lt;Inc><\/p><nav class="footer-links" aria-label="Footer"><ul><li><a href="\/privacy">Privacy<\/a><\/li><\/ul><\/nav><\/div><\/div><\/footer>/);
  assert.doesNotMatch(await readFile(path.join(output, page.markdownUrl), 'utf8'), /Privacy|Help|© 2026/);
  const index = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'));
  assert.doesNotMatch(index.documents.find((doc: any) => doc.url === page.url).text, /Privacy|© 2026/);
  for (const [extra, error] of [
    ['footer: { links: [{ label: X, href: "javascript:alert(1)" }] }\n', /site\.footer\.links\[0\]\.href must be a site path, http\(s\) URL, or mailto link/],
    ['footer: { columns: [{ title: Docs, links: [] }] }\n', /site\.footer\.columns\[0\]\.links must list at least one link/],
    ['footer: { columns: [{ links: [{ label: X, href: /x }] }] }\n', /site\.footer\.columns\[0\]\.title is required/],
    ['footer: { links: [{ label: X, href: /x, style: button }] }\n', /site\.footer\.links\[0\] does not accept style/],
    ['footer: { logo: x }\n', /site\.footer does not accept logo/],
    ['footer: {}\n', /site\.footer needs columns, links, or text/]
  ] as const) {
    await writeFile(siteFile, original + extra);
    await assert.rejects(compile(configFile), error);
  }
});

test('search providers can be replaced by a browser module or turned off', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const outputsFile = path.join(directory, 'config/outputs.yaml');
  const original = await readFile(outputsFile, 'utf8');
  const configFile = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'site-dist');
  const providerFile = path.join(directory, 'config/search.mjs');
  await writeFile(providerFile, 'export async function search(query) { return [{ url: "/", title: query }]; }\n');
  const build = async (extra: string) => {
    await writeFile(outputsFile, original + extra);
    await rm(output, { recursive: true, force: true });
    const built = await compile(configFile, output);
    const page = built.documents.find(doc => doc.id === 'reference.create-payment')!;
    return { built, html: await readFile(path.join(output, page.url, 'index.html'), 'utf8') };
  };
  let { built, html } = await build('\nhtml:\n  search: { provider: custom, module: ./search.mjs }\n');
  assert.match(html, /class="site-search"/);
  assert.equal(await readFile(path.join(output, 'assets/search-provider.js'), 'utf8'), await readFile(providerFile, 'utf8'));
  assert.ok(built.dependencies.includes(providerFile));
  await assert.rejects(readFile(path.join(output, 'search-index.json')));
  await assert.rejects(readFile(path.join(output, 'search-index.min.json')));
  await build('\nhtml:\n  search: { provider: custom, module: ./search.mjs, index: true }\n');
  assert.ok(JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8')).documents.length > 0);
  ({ html } = await build('\nhtml:\n  search: { provider: none }\n'));
  assert.doesNotMatch(html, /site-search|search\.js|mast-tools/);
  await assert.rejects(readFile(path.join(output, 'search-index.json')));
  await assert.rejects(readFile(path.join(output, 'search-index.min.json')));
  await assert.rejects(readFile(path.join(output, 'assets/search-provider.js')));
  for (const [extra, error] of [
    ['\nhtml:\n  search: { provider: algolia }\n', /Unknown search provider algolia/],
    ['\nhtml:\n  search: { provider: custom }\n', /Custom search needs a local \.js or \.mjs browser module/],
    ['\nhtml:\n  search: { provider: lexical, module: ./search.mjs }\n', /Unsupported search setting module for lexical/],
    ['\nhtml:\n  search: { provider: custom, module: ./search.mjs, index: yes }\n', /search\.index must be true or false/]
  ] as const) {
    await writeFile(outputsFile, original + extra);
    await assert.rejects(compile(configFile), error);
  }
});

test('lexical search provider ranks titles first, deep-links sections, and stays in the reader variant', async t => {
  const index = { schemaVersion: 1, documents: [
    { url: '/guide', title: 'Setup guide', summary: 'Install the tool.', variant: 'production|v1|en', headings: [{ id: 'retry-tokens', title: 'Retry tokens' }], text: 'Configure retry tokens for payments.' },
    { url: '/tokens', title: 'Tokens', summary: 'Token reference.', variant: 'production|v1|en', headings: [], text: 'Retry rules.' },
    { url: '/fr/tokens', title: 'Tokens', summary: 'Référence.', variant: 'production|v1|fr', headings: [], text: '' }
  ] };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify(index))) as typeof fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const provider = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/search-lexical.js')).href);
  const context = { variant: 'production|v1|en', indexUrl: '/search-index.json', limit: 8 };
  assert.deepEqual((await provider.search('tokens', context)).map((hit: any) => hit.url), ['/tokens', '/guide#retry-tokens']);
  assert.deepEqual((await provider.search('retry tokens', context)).map((hit: any) => [hit.url, hit.section]), [['/tokens', undefined], ['/guide#retry-tokens', 'Retry tokens']]);
  assert.deepEqual(await provider.search('missing', context), []);
  assert.deepEqual(await provider.search('   ', context), []);
});

test('local search returns scoped JSON with Markdown links and section matches', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-query-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const record = (id: string, variant: string, title: string, summary: string, headings: any[], body: string) => ({ id, variant, title, summary, headings, text: body, type: 'guide', url: `/${id}`, markdownUrl: `/${id}.md` });
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [
    record('tokens', 'production|v1|en', 'Tokens', 'Token reference.', [], 'Retry rules.'),
    record('guide', 'production|v1|en', 'Setup guide', 'Install the tool.', [{ id: 'retry-tokens', title: 'Retry tokens' }], 'Configure retry tokens for payments.'),
    record('french', 'production|v1|fr', 'Tokens', 'Référence.', [], 'Retry rules.')
  ] }));
  await assert.rejects(queryBuiltSite(directory, 'tokens'), /multiple publications/);
  const result = await queryBuiltSite(directory, 'tokens', { language: 'en', limit: 1 });
  assert.deepEqual(result.publication, { channel: 'production', version: 'v1', language: 'en' });
  assert.equal(result.total, 2);
  assert.deepEqual(result.results.map(hit => [hit.id, hit.url, hit.markdownUrl]), [['tokens', '/tokens', '/tokens.md']]);
  const section = await queryBuiltSite(directory, 'retry tokens', { language: 'en' });
  assert.deepEqual(section.results.map(hit => hit.url), ['/tokens', '/guide#retry-tokens']);
  assert.ok(section.results[1].snippet.includes('retry tokens'));
  assert.deepEqual((await queryBuiltSite(directory, 'missing', { language: 'en' })).results, []);
  await assert.rejects(queryBuiltSite(directory, 'tokens', { language: 'en', limit: 0 }), /limit must be an integer/);
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const run = spawnSync(process.execPath, [cli, 'search', directory, 'retry tokens', '--language', 'en', '--limit', '2'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).results[1].markdownUrl, '/guide.md');
  const invalid = spawnSync(process.execPath, [cli, 'search', directory, 'tokens', '--limit', '0'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Search limit must be an integer/);
  await writeFile(path.join(directory, 'search-index.json'), JSON.stringify({ schemaVersion: 1, documents: [
    { ...record('broken', 'production|v1|en', 'Broken', 'Invalid heading.', [], 'Content.'), headings: [null] }
  ] }));
  await assert.rejects(queryBuiltSite(directory, 'broken'), /Unsupported or invalid search-index.json/);
});

test('collapsibles and tabs reject ambiguous markup before publication', () => {
  const page: any = { file: 'content/guide.mdx', frontmatter: { id: 'guide.example' }, variant: { channel: 'production', version: 'v1', language: 'en' }, route: '/guide' };
  for (const [source, error] of [
    ['<Tab label="One">Alone.</Tab>', /<Tab> must be directly inside <Tabs>/],
    ['<Tabs label="Samples">\n<Tab label="One">\n\nOnly one.\n\n</Tab>\n</Tabs>', /at least two tabs/],
    ['<Tabs label="Samples">\n<Tab label="One">\n\nOne.\n\n</Tab>\nOther text.\n</Tabs>', /only accepts nonempty <Tab/],
    ['<Accordion title="More">\n\nText.\n\n</Accordion>', /<Accordion> has no semantic\/Markdown adapter/],
    ['<Collapsible title="More" open="yes">\n\nText.\n\n</Collapsible>', /open must be a boolean attribute/],
    ['<Collapsible>\n\nText.\n\n</Collapsible>', /needs literal title/],
    ['<ThemePreview mode="dark" />', /<ThemePreview \/> must be an empty block element with no attributes/],
    ['Inline <ThemePreview /> text.', /<ThemePreview \/> must be an empty block element/]
  ] as const) assert.throws(() => transformMdx(parse.parse(source), page, new Map()), error);
});

test('callout types and labels reject unsupported values', () => {
  const page: any = { file: 'content/guide.mdx', frontmatter: { id: 'guide.example' }, variant: { channel: 'production', version: 'v1', language: 'en' }, route: '/guide' };
  for (const [source, error] of [
    ['<Callout type="danger">Text.</Callout>', /unknown <Callout> type "danger"; register it in callouts.types/],
    ['<Callout type="">Text.</Callout>', /unknown <Callout> type ""; register it in callouts.types/],
    ['<Callout label=" ">Text.</Callout>', /label must be nonempty text/],
    ['<Callout icon="alert">Text.</Callout>', /only accepts type and label/],
  ] as const) assert.throws(() => transformMdx(parse.parse(source), page, new Map()), error);
});

test('callout registrations validate names, tones, labels, and Lucide icons', () => {
  for (const [config, error] of [
    [{ types: { 'Bad Name': { label: 'Bad', tone: 'note' } } }, /must use lowercase kebab-case/],
    [{ types: { experiment: { label: 'Experiment', tone: 'danger' } } }, /tone must be a built-in or registered tone/],
    [{ tones: { 'Bad Name': { line: '#111', background: '#fff', text: '#222' } } }, /must use lowercase kebab-case/],
    [{ tones: { laboratory: { line: 'red', background: '#fff', text: '#222' } } }, /line must be a hex color/],
    [{ tones: { laboratory: { line: '#111', background: '#fff' } } }, /text must be a hex color/],
    [{ tones: { laboratory: { line: '#111', background: '#fff', text: '#222', extra: '#333' } } }, /only accepts line, background, text, and dark/],
    [{ tones: { laboratory: { line: '#111', background: '#fff', text: '#222', dark: { line: '#eee' } } } }, /callouts.tones.laboratory.dark.background must be a hex color/],
    [{ tones: { laboratory: { line: '#111', background: '#fff', text: '#222', dark: { line: '#eee', background: '#000', text: '#fff', extra: '#111' } } } }, /dark only accepts line, background, and text/],
    [{ types: { experiment: { tone: 'note' } } }, /label must be nonempty text/],
    [{ types: { experiment: { label: 'Experiment', tone: 'note', icon: 'missing-icon-name' } } }, /unknown Lucide callouts.types.experiment.icon/],
    [{ types: { experiment: { label: 'Experiment', tone: 'note', extra: true } } }, /only accepts label, tone, and icon/],
  ] as const) assert.throws(() => resolveCalloutTypes(config, 'docs.config.yaml'), error);
  const types = resolveCalloutTypes({ types: { note: { icon: 'book-open' }, experiment: { label: 'Experiment', tone: 'tip' } } }, 'docs.config.yaml');
  assert.deepEqual(types.get('note'), { label: 'Note', tone: 'note', icon: 'book-open' });
  assert.deepEqual(types.get('experiment'), { label: 'Experiment', tone: 'tip', icon: undefined });
  const custom = resolveCalloutTypes({ tones: { laboratory: { line: '#123', background: '#fefefe', text: '#345' } }, types: { experiment: { label: 'Experiment', tone: 'laboratory' } } }, 'docs.config.yaml');
  assert.deepEqual(custom.get('experiment'), { label: 'Experiment', tone: 'laboratory', icon: undefined, colors: { line: '#123', background: '#fefefe', text: '#345' } });
});

test('authored Fields keep nested content and reject invalid structure', () => {
  const page: any = { file: 'content/guide.mdx', frontmatter: { id: 'guide.example' }, variant: { channel: 'production', version: 'v1', language: 'en' }, route: '/guide' };
  const source = '<Fields>\n<Field name="settings" type="object" required nullable example="{}">\n\nConfiguration.\n\n<Fields>\n<Field name="mode" type="string" optional minLength="1" maxLength="20" example="compact">\n\nDisplay mode.\n\n</Field>\n</Fields>\n\n</Field>\n</Fields>';
  const tree = transformMdx(parse.parse(source), page, new Map());
  assert.match(renderMarkdown(tree), /- `settings` — \*\*required\*\*[\s\S]*?  - `mode` — \*\*optional\*\*/);
  assert.match(renderMarkdown(tree), /object; nullable[\s\S]*?Example: `\{\}`[\s\S]*?string; minLength: 1; maxLength: 20[\s\S]*?Example: `compact`/);
  assert.match(renderHtml(tree), /<li data-field="" data-presence="present">/);
  for (const [invalid, error] of [
    ['<Field name="id" type="string">Text.</Field>', /must be directly inside <Fields>/],
    ['<Fields>\n\nText.\n\n</Fields>', /only accepts direct <Field> children/],
    ['<Fields>\n<Field name="id" type="string" required="yes">\n\nText.\n\n</Field>\n</Fields>', /required must be a boolean attribute/],
    ['<Fields>\n<Field name=" " type="string">\n\nText.\n\n</Field>\n</Fields>', /name and type must be nonempty text/],
    ['<Fields>\n<Field name="id" type="string" required optional>Text.</Field>\n</Fields>', /cannot be both required and optional/],
    ['<Fields>\n<Field name="age" type="integer" min="10" max="2">Text.</Field>\n</Fields>', /min\/max range is reversed/],
    ['<Fields>\n<Field name="age" type="integer" min="many">Text.</Field>\n</Fields>', /min must be a finite number/],
    ['<Fields>\n<Field name="name" type="string" minLength="-1">Text.</Field>\n</Fields>', /minLength must be a nonnegative integer/],
    ['<Fields>\n<Field name="name" type="string" nullable="yes">Text.</Field>\n</Fields>', /nullable must be a boolean attribute/]
  ] as const) assert.throws(() => transformMdx(parse.parse(invalid), page, new Map()), error);
});

test('standalone ApiSchema requires an API and local schema pointer', () => {
  const page: any = { file: 'content/guide.mdx', frontmatter: { id: 'guide.example' }, variant: { channel: 'production', version: 'v1', language: 'en' }, route: '/guide' };
  for (const [source, error] of [
    ['<ApiSchema api="notes" />', /api and schema select a standalone schema or field/],
    ['<ApiSchema api="notes" schema="#/components/schemas/Note" operation="notes.create" />', /do not combine them with operation/],
    ['<ApiSchema api="notes" schema="https://example.test/schema" />', /schema must be a local OpenAPI \$ref/]
  ] as const) assert.throws(() => transformMdx(parse.parse(source), page, new Map()), error);
});

test('collapsible and tab bodies render Markdown and supported MDX in both formats', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = `---
id: guide.nested-content
title: Nested content
summary: Exercise nested Markdown and MDX.
type: guide
slug: /nested-content
channel: production
version: v1
language: en
access: { policy: public }
---

<Collapsible title="More detail">

- Read the [guide](https://example.test/guide).
- Run the check.

<Callout label="Tip">Keep the response.</Callout>

\`\`\`sh
npm test
\`\`\`

</Collapsible>

<Tabs label="Output">
<Tab label="First">

<Callout label="Note">First panel.</Callout>

</Tab>
<Tab label="Second">

- Second panel item.

</Tab>
</Tabs>

<Callout type="important">

- Keep the first result.
- Compare the second result.

</Callout>`;
  await writeFile(path.join(directory, 'content/nested-content.mdx'), source);
  const output = path.join(directory, 'site');
  await compile(path.join(directory, 'docs.config.yaml'), output);
  const html = await readFile(path.join(output, 'v1/nested-content/index.html'), 'utf8');
  const markdown = await readFile(path.join(output, 'v1/nested-content.md'), 'utf8');
  for (const value of ['Read the', 'Run the check', 'Keep the response', 'First panel', 'Second panel item']) {
    assert.ok(html.includes(value), `HTML omitted ${value}`);
    assert.ok(markdown.includes(value), `Markdown omitted ${value}`);
  }
  assert.match(html, /npm[\s\S]*?test/);
  assert.match(markdown, /npm test/);
  assert.match(html, /<details class="doc-collapsible">/);
  assert.match(html, /<div class="doc-tabs" data-tabs="">/);
  assert.match(markdown, /### More detail/);
  assert.match(markdown, /### First/);
  assert.match(markdown, /### Second/);
  assert.match(html, /class="callout callout-important"/);
  assert.match(html, /<strong>Important:<\/strong>/);
  assert.match(html, /<ul>[\s\S]*Keep the first result/);
  assert.match(markdown, /> \*\*Important:\*\*[\s\S]*> - Keep the first result/);
});

test('config includes, preset overrides, concat, removal, origin and cycle', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-config-'));
  await mkdir(path.join(root, 'config'));
  await writeFile(path.join(root, 'preset.yaml'), 'schemaVersion: 1\nsite: { title: Earlier, basePath: /docs }\nnavigation:\n  - { id: first, doc: guide.first }\n  - { id: remove-me, doc: guide.old }\n');
  await writeFile(path.join(root, 'config/site.yaml'), 'title: Current\n');
  await writeFile(path.join(root, 'root.yaml'), 'schemaVersion: 1\nextends: [./preset.yaml]\nsite: { $include: ./config/site.yaml }\nnavigation:\n  $concat:\n    - [{ id: second, doc: guide.second }]\n');
  const loaded = await loadConfig(path.join(root, 'root.yaml'));
  assert.equal((loaded.value as any).site.title, 'Current');
  assert.equal((loaded.value as any).site.basePath, '/docs');
  assert.equal((loaded.value as any).navigation.length, 3);
  assert.equal(explain(loaded, 'site.title').source.file, path.join(root, 'config/site.yaml'));
  assert.ok(explain(loaded, 'site.title').source.history.includes(path.join(root, 'preset.yaml')));
  await writeFile(path.join(root, 'remove.yaml'), 'schemaVersion: 1\nextends: [./preset.yaml]\nnavigation: { $remove: [remove-me] }\n');
  assert.deepEqual((await loadConfig(path.join(root, 'remove.yaml'))).value && (await loadConfig(path.join(root, 'remove.yaml'))).value.navigation, [{ id: 'first', doc: 'guide.first' }]);
  await writeFile(path.join(root, 'plain-concat.yaml'), 'schemaVersion: 1\nnavigation:\n  $concat:\n    - [{ id: only, doc: guide.only }]\n');
  assert.deepEqual((await loadConfig(path.join(root, 'plain-concat.yaml'))).value.navigation, [{ id: 'only', doc: 'guide.only' }]);
  await writeFile(path.join(root, 'plain-remove.yaml'), 'schemaVersion: 1\nnavigation: { $remove: [first] }\n');
  await assert.rejects(loadConfig(path.join(root, 'plain-remove.yaml')), /\$remove has no inherited value/);
  await writeFile(path.join(root, 'unused.yaml'), 'schemaVersion: 1\nseo: { title: Site }\n');
  await assert.rejects(loadConfig(path.join(root, 'unused.yaml')), /unknown setting seo/);
  await writeFile(path.join(root, 'cycle.yaml'), 'schemaVersion: 1\nsite: { $include: ./cycle.yaml }\n');
  await assert.rejects(loadConfig(path.join(root, 'cycle.yaml')), /Configuration cycle:.*cycle.yaml.*cycle.yaml/);
});

test('example configs build and match the example configs page', async t => {
  const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const page = await readFile(path.join(framework, 'agent-docs/config/examples.md'), 'utf8');
  const shown = [...page.matchAll(/```yaml title="example-configs\/([^"]+)"\n([\s\S]*?)```/g)];
  assert.equal(shown.length, 5);
  for (const [, file, body] of shown) assert.equal(body, await readFile(path.join(framework, 'example-configs', file), 'utf8'), `${file} on the page differs from the file`);
  for (const config of ['minimal/docs.config.yaml', 'api-docs/docs.config.yaml', 'multilingual/docs.config.yaml', 'shared-preset/site/docs.config.yaml']) {
    const output = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-example-config-'));
    t.after(() => rm(output, { recursive: true, force: true }));
    const manifest = await compile(path.join(framework, 'example-configs', config), output);
    assert.ok(manifest.documents.length >= 2, config);
  }
});

test('API reference pages need exactly one operation', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const page = path.join(directory, 'content/create-payment.mdx');
  await writeFile(page, (await readFile(page, 'utf8')).replace('operations: [payments.create]', 'operations: [payments.create, payments.other]'));
  await assert.rejects(compile(path.join(directory, 'docs.config.yaml')), /API reference needs exactly one stable operation ID/);
});

test('custom frontmatter fields cannot redefine routing fields', () => {
  for (const name of ['slug', 'channel', 'id', 'access.policy']) assert.throws(() => declaredFrontmatterFields({ fields: { [name]: { type: 'string' } } }), /Cannot redefine native or protected/);
});

test('missing publication source, unknown MDX and unapproved metadata fail visibly', async () => {
  const sandboxRoot = await fixture();
  for (const name of ['create-payment.mdx', 'create-payment-guide.mdx', 'overview.mdx']) {
    const file = path.join(sandboxRoot, 'content', name);
    await writeFile(file, (await readFile(file, 'utf8')).replace('channel: production', 'channel: sandbox'));
  }
  await assert.rejects(compile(path.join(sandboxRoot, 'docs.config.yaml')), /no OpenAPI source for sandbox\/v1/);
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const reference = path.join(root, 'content/create-payment.mdx');
  const original = await readFile(reference, 'utf8');
  await writeFile(reference, original + '\n<UndeclaredWidget />\n');
  await assert.rejects(compile(config), /no semantic\/Markdown adapter/);
  await writeFile(reference, original);
  const projection = path.join(root, 'config/markdown.yaml');
  await writeFile(projection, (await readFile(projection, 'utf8')).replace('omitNull: true', '  leaked: frontmatter.seo\nomitNull: true'));
  await assert.rejects(compile(config), /protected from public Markdown/);
});

test('frontmatter profiles and declarations control agent metadata without changing page content', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const output = path.join(root, 'dist');
  const projection = path.join(root, 'config/markdown.yaml');
  await writeFile(projection, (await readFile(projection, 'utf8')) + `profiles:
  agent-minimal:
    fields:
      id: frontmatter.id
    addFields:
      task: frontmatter.agent.intent
`);
  const guide = path.join(root, 'content/create-payment-guide.mdx');
  const original = await readFile(guide, 'utf8');
  await writeFile(guide, original.replace('access: { policy: public }', 'access: { policy: public }\nmarkdownMetadata: agent-minimal'));
  await compile(config, output);
  let markdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  assert.match(markdown, /^---\nid: guide\.create-payment\ntask: Help readers prepare an idempotent payment request\./);
  assert.doesNotMatch(markdown.split('---')[1], /description:|canonical:|agent:/);
  assert.match(markdown, /## Prepare the request/);
  await writeFile(guide, original.replace('access: { policy: public }', 'access: { policy: public }\nmarkdownMetadata:\n  format: none'));
  await compile(config, output);
  markdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  assert.match(markdown, /^# Create a payment/);
  assert.match(markdown, /## Prepare the request/);
  await writeFile(guide, original.replace('intent: Help readers prepare an idempotent payment request.', 'intent: [Help, readers]'));
  await assert.rejects(compile(config), /frontmatter agent.intent must be string/);
  await writeFile(guide, original.replace('access: { policy: public }', 'access: { policy: public }\nmarkdownMetadata:\n  addFields:\n    note: frontmatter.editorial.reviewNote'));
  await assert.rejects(compile(config), /not approved for public Markdown/);
});

test('scaffold writes a typed page once and its snippet resolves in both formats', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const target = path.join(root, 'content/retry-payment.mdx');
  const result = await scaffold(config, 'how-to', target, { id: 'guide.retry-payment', title: 'Retry a payment', summary: 'Retry safely.', slug: '/guides/retry-payment', operations: ['payments.create'] });
  assert.equal(result.status, 'ok');
  const source = await readFile(target, 'utf8');
  assert.match(source, /id: guide\.retry-payment/);
  assert.match(source, /channel: production/);
  assert.match(source, /policy: draft/);
  assert.match(source, /\[\[TODO:/);
  assert.match(source, /<Snippet id="payment\.request-prep"/);
  const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  const cliTarget = path.join(root, 'content/another-guide.mdx');
  const cliResult = spawnSync(process.execPath, [cli, 'scaffold', 'how-to', config, cliTarget, '--id', 'guide.another', '--title', 'Another guide', '--summary', 'Another task.', '--slug', '/guides/another', '--operation', 'payments.create'], { encoding: 'utf8' });
  assert.equal(cliResult.status, 0, cliResult.stderr);
  assert.equal(JSON.parse(cliResult.stdout).id, 'guide.another');
  const shortTarget = path.join(root, 'content/guides/first-integration.mdx');
  const shortResult = spawnSync(process.execPath, [cli, 'scaffold', 'guide', '-n', shortTarget], { cwd: root, encoding: 'utf8' });
  assert.equal(shortResult.status, 0, shortResult.stderr);
  assert.equal(JSON.parse(shortResult.stdout).id, 'guide.guides.first-integration');
  assert.match(await readFile(shortTarget, 'utf8'), /\[\[TODO: Write the introduction/);
  const spacedResult = spawnSync(process.execPath, [cli, 'scaffold', 'guide', '-n', path.join(root, 'content/guides/retry - refund.mdx')], { cwd: root, encoding: 'utf8' });
  assert.equal(spacedResult.status, 0, spacedResult.stderr);
  assert.deepEqual([JSON.parse(spacedResult.stdout).id, (await readFile(path.join(root, 'content/guides/retry - refund.mdx'), 'utf8')).match(/^title: (.*)$/m)?.[1]], ['guide.guides.retry-refund', 'Retry Refund']);
  await assert.rejects(scaffold(config, 'how-to', target, { id: 'guide.retry-payment', title: 'Retry a payment', summary: 'Retry safely.', slug: '/guides/retry-payment', operations: ['payments.create'] }), /EEXIST/);
  const output = path.join(root, 'dist');
  const draftManifest = await compile(config, output);
  assert.equal(draftManifest.documents.find(x => x.id === 'guide.retry-payment'), undefined);
  assert.equal(draftManifest.documents.find(x => x.id === 'guide.guides.first-integration'), undefined);
  const publish = (content: string) => content.replace('policy: draft', 'policy: public').replace(/\[\[TODO:[^\]]+\]\]/g, 'Reviewed example content.');
  await writeFile(target, (await readFile(target, 'utf8')).replace('policy: draft', 'policy: public'));
  await assert.rejects(compile(config), /unresolved scaffold placeholders/);
  await writeFile(target, publish(source));
  await writeFile(cliTarget, publish(await readFile(cliTarget, 'utf8')));
  const manifest = await compile(config, output);
  assert.equal(manifest.documents.find(x => x.id === 'guide.retry-payment')?.url, '/v1/guides/retry-payment');
  assert.equal(manifest.documents.find(x => x.id === 'guide.another')?.url, '/v1/guides/another');
  const markdown = await readFile(path.join(output, 'v1/guides/retry-payment.md'), 'utf8');
  const html = await readFile(path.join(output, 'v1/guides/retry-payment/index.html'), 'utf8');
  assert.match(markdown, /For Payments requests, choose a unique Idempotency-Key/);
  assert.match(html, /For Payments requests, choose a unique Idempotency-Key/);
  await assert.rejects(scaffold(config, 'how-to', path.join(root, 'content/incomplete.mdx'), { id: 'guide.incomplete', title: 'Incomplete', summary: 'Incomplete.', slug: '/guides/incomplete' }), /requires operations/);
  await assert.rejects(scaffold(config, 'how-to', path.join(root, 'content/unknown.mdx'), { id: 'guide.unknown', title: 'Unknown', summary: 'Unknown.', slug: '/guides/unknown', operations: ['payments.missing'] }), /Unknown scaffold operation payments\.missing/);
  await assert.rejects(readFile(path.join(root, 'content/unknown.mdx'), 'utf8'), /ENOENT/);
});

test('snippet values follow precedence and unsafe inputs fail visibly', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const guide = path.join(root, 'content/create-payment-guide.mdx');
  const original = await readFile(guide, 'utf8');
  await writeFile(config, (await readFile(config, 'utf8')) + 'variables: { product: Project }\n');
  await writeFile(guide, original.replace('access: { policy: public }', 'access: { policy: public }\nvariables: { product: Page }').replace('values={{ product: "Payments" }}', ''));
  const output = path.join(root, 'dist');
  await compile(config, output);
  assert.match(await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8'), /For Page requests, choose a unique Idempotency-Key/);
  await writeFile(guide, original.replace('values={{ product: "Payments" }}', ''));
  await compile(config, output);
  assert.match(await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8'), /For Project requests, choose a unique Idempotency-Key/);
  await writeFile(config, (await readFile(config, 'utf8')).replace('variables: { product: Project }\n', ''));
  await assert.rejects(compile(config), /Snippet payment\.request-prep requires variable product/);
  await writeFile(config, (await readFile(config, 'utf8')) + 'variables: { product: Project }\n');
  await writeFile(guide, original.replace('access: { policy: public }', 'access: { policy: public }\nvariables: { product: Page }'));
  await compile(config, output);
  assert.match(await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8'), /For Payments requests/);
  await writeFile(guide, original.replace('values={{ product: "Payments" }}', 'values={{ product: 42 }}'));
  await assert.rejects(compile(config), /Snippet payment\.request-prep\.product must be string/);
  await writeFile(guide, original.replace('values={{ product: "Payments" }}', 'values={{ product: process.env.SECRET }}'));
  await assert.rejects(compile(config), /literal strings, numbers, or booleans/);
  await writeFile(guide, original.replace('values={{ product: "Payments" }}', 'values={{ product: "Payments", extra: true }}'));
  await assert.rejects(compile(config), /Unknown snippet variable payment\.request-prep\.extra/);
  await writeFile(guide, original.replace('values={{ product: "Payments" }}', 'values={{ product: "<script>alert(1)</script>" }}'));
  await compile(config, output);
  const escaped = await readFile(path.join(output, 'v1/guides/create-payment/index.html'), 'utf8');
  const escapedMarkdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  assert.doesNotMatch(escaped, /<script>alert\(1\)<\/script>/);
  assert.match(escaped, /&#x3C;script>alert\(1\)&#x3C;\/script>/);
  assert.doesNotMatch(escapedMarkdown, /<script>alert\(1\)<\/script>/);
  await writeFile(guide, original);
  const nested = path.join(root, 'snippets/retry-note.mdx');
  await writeFile(nested, (await readFile(nested, 'utf8')) + '\n<Snippet id="payment.request-prep" />\n');
  await assert.rejects(compile(config), /recursive snippet include payment\.request-prep -> payment\.retry-note -> payment\.request-prep/);
});

test('SEO frontmatter only accepts implemented nested fields', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const reference = path.join(root, 'content/create-payment.mdx');
  const original = await readFile(reference, 'utf8');
  const output = path.join(root, 'dist');
  await compile(config, output);
  const html = await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8');
  assert.match(html, /<title>Create a payment \| Example API<\/title>/);
  assert.match(html, /<meta name="description" content="Inspect the complete example Create Payment request and response\."/);
  await writeFile(reference, original.replace('  description: Inspect the complete example Create Payment request and response.', '  description: Inspect the complete example Create Payment request and response.\n  image: /social.png'));
  await assert.rejects(compile(config), /unsupported SEO field seo\.image/);
  await writeFile(reference, original.replace('  title: Create a payment | Example API', '  title: 42'));
  await assert.rejects(compile(config), /seo\.title must be text/);
});

test('navigation rejects ambiguous page and group nodes', async () => {
  const root = await fixture();
  const nav = path.join(root, 'config/nav.yaml');
  await writeFile(nav, (await readFile(nav, 'utf8')).replace('  label: Payments', '  doc: guide.overview\n  label: Payments'));
  await assert.rejects(compile(path.join(root, 'docs.config.yaml')), error => /both a page and a group/.test(String(error)) && String(error).includes('config/nav.yaml'));
});

test('project navigation combines tag generation and authored stable operation placement', async () => {
  const root = await fixture();
  const apiFile = path.join(root, 'apis/payments/openapi.yaml');
  await writeFile(apiFile, (await readFile(apiFile, 'utf8')).replace('paths:\n', 'tags:\n  - { name: Reports }\npaths:\n') + `
  /reports:
    get:
      operationId: listReports
      tags: [Reports]
      summary: List reports
      responses:
        '200': { description: Ready }
`);
  const apiConfig = path.join(root, 'config/api.yaml');
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')) + '    - id: payments.reports\n      sourceOperationId: listReports\n      reference: reference.list-reports\n');
  await writeFile(path.join(root, 'content/list-reports.mdx'), `---
id: reference.list-reports
title: List reports
summary: Inspect reports.
type: api-reference
slug: /reference/list-reports
channel: production
version: v1
language: en
operations: [payments.reports]
access: { policy: public }
---

Reports are part of this example fixture.
`);
  const navFile = path.join(root, 'config/nav.yaml');
  await writeFile(navFile, `- id: overview
  doc: guide.overview
- id: generated-payments
  api: payments
  generated: tags
- id: pinned-create
  operation: payments.create
- id: payment-guide
  doc: guide.create-payment
`);
  const config = path.join(root, 'docs.config.yaml');
  const destination = path.join(root, 'dist');
  const result = await compile(config, destination);
  assert.equal(result.documents.length, 4);
  const html = await readFile(path.join(destination, 'v1/reference/list-reports/index.html'), 'utf8');
  const nav = html.slice(html.indexOf('<nav class="side"'), html.indexOf('</nav>', html.indexOf('<nav class="side"')) + 6);
  assert.match(nav, /<summary>Reports <span class="nav-count">1<\/span><\/summary>/);
  assert.ok(nav.indexOf('href="/v1/reference/list-reports"') < nav.indexOf('href="/v1/reference/create-payment"'));
  assert.equal((nav.match(/href="\/v1\/reference\/create-payment"/g) ?? []).length, 1);
  assert.match(nav, /aria-current="page"/);
  await writeFile(navFile, `- id: reports-tools
  label: Reports tools
  api: payments
  tag: Reports
  items:
    - id: remaining-reports
      generated: remaining
- id: generated-payments
  api: payments
  generated: tags
- id: pinned-create
  operation: payments.create
`);
  await compile(config, destination);
  const custom = await readFile(path.join(destination, 'v1/reference/list-reports/index.html'), 'utf8');
  assert.match(custom, /<summary>Reports tools <span class="nav-count">1<\/span><\/summary>/);
  assert.equal((custom.match(/href="\/v1\/reference\/list-reports"/g) ?? []).length, 1);
  await writeFile(apiFile, (await readFile(apiFile, 'utf8')).replace('operationId: createPayment', 'operationId: createPaymentRenamed'));
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')).replace('sourceOperationId: createPayment', 'sourceOperationId: createPaymentRenamed'));
  await compile(config, destination);
  assert.ok((await readFile(path.join(destination, 'v1/reference/list-reports/index.html'), 'utf8')).includes('href="/v1/reference/create-payment"'));
  await writeFile(navFile, (await readFile(navFile, 'utf8')) + '- id: duplicate-create\n  operation: payments.create\n');
  await assert.rejects(compile(config), /Operation placed more than once/);
  await writeFile(navFile, '- id: reference-doc\n  doc: reference.create-payment\n- id: reference-operation\n  operation: payments.create\n');
  await assert.rejects(compile(config), /Operation placed more than once/);
  await writeFile(navFile, '- id: unknown\n  operation: payments.missing\n');
  await assert.rejects(compile(config), /Unknown stable operation ID/);
});

test('subjectLifecycle labels appear in navigation, page, Markdown, and manifest', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const page = path.join(root, 'content/create-payment.mdx');
  await writeFile(page, (await readFile(page, 'utf8')).replace('type: api-reference', 'type: api-reference\nsubjectLifecycle: beta'));
  const destination = path.join(root, 'dist');
  const manifest = await compile(config, destination);
  const html = await readFile(path.join(destination, 'v1/reference/create-payment/index.html'), 'utf8');
  const markdown = await readFile(path.join(destination, 'v1/reference/create-payment.md'), 'utf8');
  assert.equal(manifest.documents.find(x => x.id === 'reference.create-payment')?.subjectLifecycle, 'beta');
  assert.equal((html.match(/subject-lifecycle-beta/g) ?? []).length, 2);
  assert.match(markdown, /\*\*Status: Beta\.\*\*/);
  await writeFile(page, (await readFile(page, 'utf8')).replace('subjectLifecycle: beta', 'subjectLifecycle: experimental'));
  const experimental = await compile(config, destination);
  const experimentalHtml = await readFile(path.join(destination, 'v1/reference/create-payment/index.html'), 'utf8');
  const experimentalMarkdown = await readFile(path.join(destination, 'v1/reference/create-payment.md'), 'utf8');
  assert.equal(experimental.documents.find(x => x.id === 'reference.create-payment')?.subjectLifecycle, 'experimental');
  assert.equal((experimentalHtml.match(/subject-lifecycle-experimental/g) ?? []).length, 2);
  assert.match(experimentalMarkdown, /\*\*Status: Experimental\.\*\*/);
  const apiFile = path.join(root, 'apis/payments/openapi.yaml');
  await writeFile(apiFile, (await readFile(apiFile, 'utf8')).replace('operationId: createPayment', 'operationId: createPayment\n      deprecated: true'));
  await assert.rejects(compile(config), /OpenAPI-deprecated operation cannot use experimental/);
  await writeFile(page, (await readFile(page, 'utf8')).replace('subjectLifecycle: experimental', 'subjectLifecycle: deprecated'));
  const deprecated = await compile(config, destination);
  assert.equal(deprecated.documents.find(x => x.id === 'reference.create-payment')?.subjectLifecycle, 'deprecated');
});

test('text surfaces and external metadata stay explicit and respect provider ownership', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const page = path.join(directory, 'content/create-payment-guide.mdx');
  const outputs = path.join(directory, 'config/outputs.yaml');
  const frontmatter = path.join(directory, 'config/frontmatter.yaml');
  const markdown = path.join(directory, 'config/markdown.yaml');
  await writeFile(configFile, (await readFile(configFile, 'utf8')) + 'metadata: { provider: { module: ./metadata-provider.mjs } }\n');
  await writeFile(path.join(directory, 'metadata-provider.mjs'), 'export function provideMetadata({ source }) { return source.id === "guide.create-payment" ? { values: { owner: "platform-docs" }, ownedKeys: ["owner"] } : undefined; }\n');
  await writeFile(outputs, (await readFile(outputs, 'utf8')) + 'text:\n  card: [summary]\n  pageHeader: [description, summary]\n  search: [description, summary]\n  htmlDescription: [summary]\n  socialCard: [description]\n');
  await writeFile(frontmatter, (await readFile(frontmatter, 'utf8')).replace('fields:\n', 'fields:\n  owner: { type: string, public: true }\n') + 'locales: { en: en-US }\n');
  await writeFile(markdown, (await readFile(markdown, 'utf8')).replace('fields:\n', 'fields:\n  owner: frontmatter.owner\n  locale: frontmatter.locale\n  lifecycle: frontmatter.lifecycle\n'));
  await writeFile(page, (await readFile(page, 'utf8')).replace('summary: Follow the request flow and read the related endpoint reference.', 'summary: Short card copy.\ndescription: A fuller description of how to create a payment.\nlifecycle: published\ndisplayText: { socialCard: Custom social copy. }'));
  const output = path.join(directory, 'site');
  const manifest = await compile(configFile, output);
  const html = await readFile(path.join(output, 'v1/guides/create-payment/index.html'), 'utf8');
  const overview = await readFile(path.join(output, 'v1/overview/index.html'), 'utf8');
  const twin = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  const index = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'));
  assert.match(html, /<p class="summary">A fuller description of how to create a payment\.<\/p>/);
  assert.match(html, /<meta name="description" content="Short card copy\.">/);
  assert.match(html, /<meta property="og:description" content="Custom social copy\.">/);
  assert.match(overview, /Short card copy\./);
  assert.doesNotMatch(overview, /A fuller description of how to create a payment\./);
  assert.equal(index.documents.find((item: any) => item.id === 'guide.create-payment').summary, 'A fuller description of how to create a payment.');
  assert.match(twin, /owner: platform-docs/);
  assert.match(twin, /locale: en-US/);
  assert.match(twin, /lifecycle: published/);
  assert.ok(manifest.dependencies.some(file => file.endsWith('metadata-provider.mjs')));
  await writeFile(page, (await readFile(page, 'utf8')).replace('language: en', 'language: en\nlocale: en-GB'));
  await compile(configFile, output);
  assert.match(await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8'), /locale: en-GB/);
  await writeFile(page, (await readFile(page, 'utf8')).replace('id: guide.create-payment', 'id: guide.create-payment\nowner: another-team'));
  await assert.rejects(compile(configFile), /owner is owned by the metadata provider/);
  const publications = path.join(directory, 'config/publications.yaml');
  await writeFile(publications, (await readFile(publications, 'utf8')).replace('language: en', 'locale: en'));
  await assert.rejects(loadConfig(configFile), /publications\.locale is now publications\.language/);
});

test('conflicting OpenAPI example declarations fail instead of losing a sample', async () => {
  const root = await fixture();
  const config = path.join(root, 'docs.config.yaml');
  const apiFile = path.join(root, 'apis/payments/openapi.yaml');
  const original = await readFile(apiFile, 'utf8');
  await writeFile(apiFile, original.replace('            examples:\n              card:', '            example: { amount: { value: 1, currency: USD } }\n            examples:\n              card:'));
  await assert.rejects(compile(config), /cannot define both example and examples/);
  await writeFile(apiFile, original.replace('      value:\n        amount:', '      externalValue: https://api.example.test/sample.json\n      value:\n        amount:'));
  await assert.rejects(compile(config), /cannot define both value and externalValue/);
});

test('authored API embeds resolve named request and response content in both outputs', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'site');
  const manifest = await compile(config, output);
  const guide = manifest.documents.find(doc => doc.id === 'guide.create-payment')!;
  assert.deepEqual(guide.apiEmbeds.map(embed => embed.component), ['ApiExample', 'ApiSchema', 'ApiExample', 'ApiSchema']);
  assert.ok(manifest.dependencies.some(file => file.endsWith('/apis/payments/schemas/payment.yaml')));
  const markdown = await readFile(path.join(output, 'v1/guides/create-payment.md'), 'utf8');
  const html = await readFile(path.join(output, 'v1/guides/create-payment/index.html'), 'utf8');
  for (const detail of ['Bank account payment', 'Example key: bank', 'acct_example', 'Pending payment', 'Example key: pending', 'pay_example', 'Request schema', 'Response 201 schema', 'Card token', 'status']) {
    assert.ok(markdown.includes(detail), `Markdown omitted ${detail}`);
    assert.ok(html.includes(detail), `HTML omitted ${detail}`);
  }
  assert.doesNotMatch(markdown, /<ApiExample|<ApiSchema/);
  assert.match(markdown, /always present/);
  const anchors = [...html.matchAll(/id="(field-(?:request|response)-embedded-[^"]+)"/g)].map(match => match[1]);
  assert.ok(anchors.length > 0);
  assert.equal(new Set(anchors).size, anchors.length);
});

test('API embeds reject wrong selectors and unavailable publications with page diagnostics', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const guide = path.join(directory, 'content/create-payment-guide.mdx');
  const original = await readFile(guide, 'utf8');
  for (const [from, to, error] of [
    ['example="bank"', 'example="missing"', /create-payment-guide\.mdx: <ApiExample> cannot find/],
    ['status="201"', 'status="202"', /<ApiExample> cannot find/],
    ['mediaType="application/json" example="bank"', 'mediaType="text/plain" example="bank"', /<ApiExample> cannot find/],
    ['schema="./schemas/payment.yaml#/$defs/CreatePayment"', 'schema="./schemas/payment.yaml#/$defs/Missing"', /<ApiSchema> Broken \$ref/],
    ['kind="response" status="201" mediaType="application/json" \/>', 'kind="response" mediaType="application/json" />', /needs status/],
    ['operation="payments.create"', 'operation="payments.unknown"', /unknown stable operation/]
  ] as const) {
    assert.ok(original.includes(from), `fixture missing ${from}`);
    await writeFile(guide, original.replace(from, to));
    await assert.rejects(compile(config), error);
  }
  await writeFile(guide, original + '\n<ApiSchema api="missing" schema="#/components/schemas/Payment" />\n');
  await assert.rejects(compile(config), /<ApiSchema> unknown API missing/);
  await writeFile(guide, original + '\n<ApiSchema api="payments" schema="#/components/schemas/Missing" />\n');
  await assert.rejects(compile(config), /<ApiSchema> Broken \$ref/);
  for (const name of ['create-payment.mdx', 'create-payment-guide.mdx', 'overview.mdx']) {
    const file = path.join(directory, 'content', name);
    const content = name === 'create-payment-guide.mdx' ? original : await readFile(file, 'utf8');
    await writeFile(file, content.replace('channel: production', 'channel: sandbox'));
  }
  await assert.rejects(compile(config), /no OpenAPI source for sandbox\/v1/);
});

test('focused exports preserve user-defined names and literal payloads', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-focused-data-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'api.json');
  const payload = { 'x-trace': 'keep', $ref: 'literal, not a reference', nested: { 'x-value': 1 } };
  const schema = {
    type: 'object', 'x-internal': 'omit extension',
    properties: { 'x-trace': { type: 'string' }, $ref: { type: 'string' }, example: { type: 'string' } },
    required: ['x-trace'], default: payload, enum: [payload], const: payload, example: payload
  };
  await writeFile(file, JSON.stringify({
    openapi: '3.1.0', info: { title: 'Test', version: '1' },
    paths: { '/test': { get: { operationId: 'test', security: [{ 'x-auth': [] }], responses: {
      '200': { description: 'OK', content: {
        'application/json': { schema, examples: { 'x-sample': { value: payload } } },
        'text/plain': { example: payload }
      } }
    } } } },
    components: { securitySchemes: { 'x-auth': { type: 'http', scheme: 'bearer' } } }
  }));
  const focused = await focusedOpenApi(new ApiReader(), file, 'test');
  const operation = focused.paths['/test'].get;
  const media = operation.responses['200'].content;
  const { 'x-internal': extension, ...expectedSchema } = schema;
  assert.deepEqual(media['application/json'].schema, expectedSchema);
  assert.deepEqual(media['application/json'].examples['x-sample'].value, payload);
  assert.deepEqual(media['text/plain'].example, payload);
  assert.deepEqual(operation.security, [{ 'x-auth': [] }]);
  assert.equal(focused.components.securitySchemes['x-auth'].scheme, 'bearer');
});

test('external parameters, request bodies, and responses retain their reference origins', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-reference-origins-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'parts'));
  const writeJson = (name: string, value: unknown) => writeFile(path.join(directory, name), JSON.stringify(value));
  const media = { schema: { $ref: './model.json' }, examples: { sample: { $ref: './example.json' } } };
  await writeJson('parts/model.json', { type: 'object', properties: { nestedField: { type: 'string' } } });
  await writeJson('parts/example.json', { value: { nestedField: 'nested sample' } });
  await writeJson('parts/parameter.json', { name: 'filter', in: 'query', ...media });
  await writeJson('parts/body.json', { content: { 'application/json': media } });
  await writeJson('parts/response.json', { description: 'OK', content: { 'application/json': media } });
  await writeJson('api.json', {
    openapi: '3.1.0', paths: { '/test': { post: {
      operationId: 'test', parameters: [{ $ref: './parts/parameter.json' }],
      requestBody: { $ref: './parts/body.json' }, responses: { '200': { $ref: './parts/response.json' } }
    } } }
  });
  const reader = new ApiReader();
  const operation = await reader.operation(path.join(directory, 'api.json'), 'test');
  assert.equal(operation.examples.length, 3);
  assert.deepEqual(operation.examples.map(example => example.location), ['parameter:query:filter', 'request', 'response']);
  for (const example of operation.examples) assert.deepEqual(example.value, { nestedField: 'nested sample' });
  const markdown = renderMarkdown(semanticRoot(operation.blocks));
  assert.equal((markdown.match(/`nestedField` `string`/g) ?? []).length, 3);
  assert.ok(reader.dependencies.has(path.join(directory, 'parts/model.json')));
});

test('published API downloads preserve the source filename and relative references', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const original = path.join(directory, 'apis/payments/openapi.yaml');
  const renamed = path.join(directory, 'apis/payments/payments.yaml');
  await rename(original, renamed);
  const apiConfig = path.join(directory, 'config/api.yaml');
  await writeFile(apiConfig, (await readFile(apiConfig, 'utf8')).replace('openapi.yaml', 'payments.yaml'));
  const output = path.join(directory, 'site');
  const manifest = await compile(path.join(directory, 'docs.config.yaml'), output);
  const url = manifest.apiSources[0].sourceUrl;
  assert.ok(url.endsWith('/payments.yaml'));
  const published = path.join(output, url);
  assert.equal(await readFile(published, 'utf8'), await readFile(renamed, 'utf8'));
  const operation = await new ApiReader().operation(published, 'createPayment');
  assert.equal(operation.method, 'post');
  const catalog = JSON.parse(await readFile(path.join(output, '.well-known/api-catalog'), 'utf8'));
  assert.equal(catalog.linkset[1]['service-desc'][0].href, `https://docs.example.test${url}`);
  assert.ok((await readFile(path.join(output, 'llms.txt'), 'utf8')).includes(`](https://docs.example.test${url})`));
  const headers = JSON.parse(await readFile(path.join(output, 'resource-headers.json'), 'utf8'));
  assert.equal(headers[url]['Content-Type'], 'application/yaml');
});

test('artifact collisions fail before changing the existing output', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-artifact-collisions-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const content = path.join(directory, 'content');
  const output = path.join(directory, 'site');
  await mkdir(content);
  await mkdir(output);
  await writeFile(path.join(output, 'sentinel.txt'), 'previous build');
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({
    schemaVersion: 1, site: { title: 'Test' }, publications: {
      defaults: { channel: 'production', version: 'v1', language: 'en' },
      enabled: [{ channel: 'production', version: 'v1', language: 'en' }],
      channels: { production: {} }, versions: { v1: {} }
    }
  }));
  for (const slugs of [['/', '/index'], ['/topic', '/topic.md/child'], ['/topic.md/child', '/topic'], ['/llms.txt'], ['/documents.json'], ['/build-info.json']]) {
    await rm(content, { recursive: true });
    await mkdir(content);
    for (const [index, slug] of slugs.entries()) {
      await writeFile(path.join(content, `${index}.md`), `---\nid: page${index}\ntitle: Page\nsummary: Test\ntype: guide\nslug: ${slug}\nchannel: production\nversion: v1\nlocale: en\naccess: {policy: public}\n---\nBody\n`);
    }
    await assert.rejects(compile(config), /Output artifact collision/);
    await assert.rejects(compile(config, output), /Output artifact collision/);
    assert.deepEqual(await readdir(output), ['sentinel.txt']);
    assert.equal(await readFile(path.join(output, 'sentinel.txt'), 'utf8'), 'previous build');
    assert.ok(!(await readdir(directory)).some(name => name.includes('.staging-')));
  }
});


test('syntax highlighting preserves code, escapes HTML, and falls back for unknown languages', async () => {
  const highlighter = await createCodeHighlighter();
  const source = 'const value = "<script>&hello</script>";\n  // keep spacing\n';
  const tree = semanticRoot([code(source, 'javascript')]);
  const markdown = renderMarkdown(tree);
  const html = renderHtml(tree, highlighter);
  assert.match(html, /<span style="color:/);
  assert.ok(!html.includes('<script>'));
  const plain = html.replace(/<[^>]*>/g, '').replaceAll('&#x3C;', '<').replaceAll('&#x26;', '&').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
  assert.equal(plain, source + '\n');
  assert.equal(renderMarkdown(tree), markdown);
  assert.ok(markdown.includes(source));
  const unknown = renderHtml(semanticRoot([code('custom value', 'unregistered-language')]), highlighter);
  assert.ok(!unknown.includes('<span'));
  assert.ok(unknown.includes('custom value'));
  const example = highlightedExample('{"id": 42}', 'json', highlighter);
  assert.match(example, /class="language-json"/);
  assert.match(example, /<span style="color:/);
  assert.equal(example.replace(/<[^>]*>/g, ''), '{"id": 42}');
});

test('code blocks show title and filename independently while Markdown keeps both', () => {
  const cases = [
    { meta: 'title="Create a payment"', title: 'Create a payment', filename: undefined },
    { meta: 'filename="src/payments.ts"', title: undefined, filename: 'src/payments.ts' },
    { meta: 'title="Create a payment" filename="src/payments.ts"', title: 'Create a payment', filename: 'src/payments.ts' },
  ];
  for (const { meta, title, filename } of cases) {
    const source = `\`\`\`ts ${meta}\nconst payment = 1;\n\`\`\``;
    const tree = parse.parse(source);
    const html = renderHtml(tree);
    const markdown = renderMarkdown(tree);
    assert.ok(markdown.includes(meta));
    assert.equal(html.includes('class="code-block-title"'), !!title);
    assert.equal(html.includes('class="code-block-filename"'), !!filename);
    if (title) assert.ok(html.includes(title));
    if (filename) assert.ok(html.includes(filename));
    assert.match(html, /const payment = 1/);
  }
});

test('highlighting can be disabled or supplied by a local module in an imported config', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'config/outputs.yaml');
  const original = await readFile(configFile, 'utf8');
  const output = path.join(directory, 'site');
  await writeFile(configFile, original + '\nhtml:\n  highlighting: { provider: none }\n');
  const none = await compile(path.join(directory, 'docs.config.yaml'), output);
  const page = none.documents.find(doc => doc.type === 'api-reference')!;
  assert.ok(!(await readFile(path.join(output, page.url, 'index.html'), 'utf8')).includes('<span style="color:'));
  const markdown = await readFile(path.join(output, page.markdownUrl), 'utf8');
  const moduleFile = path.join(directory, 'config/highlighter.mjs');
  await writeFile(moduleFile, 'export function highlight(text) { return [{text, color: "#aabbcc"}]; }');
  await writeFile(configFile, original + '\nhtml:\n  highlighting: { provider: custom, module: ./highlighter.mjs }\n');
  const custom = await compile(path.join(directory, 'docs.config.yaml'), output);
  assert.ok(custom.dependencies.includes(moduleFile));
  assert.ok((await readFile(path.join(output, page.url, 'index.html'), 'utf8')).includes('<span style="color:#aabbcc">'));
  assert.equal(await readFile(path.join(output, page.markdownUrl), 'utf8'), markdown);
  const badModule = path.join(directory, 'config/bad.mjs');
  await writeFile(badModule, 'export function highlight() { return [{text: "replaced"}]; }');
  const bad = await createCodeHighlighter({ provider: 'custom', module: './bad.mjs' }, configFile);
  assert.throws(() => highlightedExample('original', 'json', bad), /preserve the exact code text/);
  await assert.rejects(createCodeHighlighter({ provider: 'unknown' }), /Unknown highlighting provider/);
  const site = await createCodeHighlighter({ provider: 'shiki' });
  const siteHtml = highlightedExample('{"a": 1}', 'json', site);
  assert.match(siteHtml, /<pre><code class="language-json"><span style="color:var\(--code-/, 'the default site theme uses palette variables and no inline background');
  const light = await createCodeHighlighter({ provider: 'shiki', theme: 'github-light' });
  assert.ok(highlightedExample('{}', 'json', light).includes(`background-color:${light.background}`));
  const dark = await createCodeHighlighter({ provider: 'shiki', theme: 'github-dark' });
  assert.ok(!highlightedExample('{}', 'json', dark).includes('background-color'));
});

test('pages and publication variants inherit the root language with an English fallback', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-default-language-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const configFile = path.join(directory, 'docs.config.yaml');
  const config: any = {
    schemaVersion: 1, site: { title: 'Test' }, outputs: { html: { highlighting: { provider: 'none' } } },
    publications: { defaults: { channel: 'production', version: 'v1', language: 'fr' },
      channels: { production: {} }, versions: { v1: {} },
      enabled: [{ channel: 'production', version: 'v1' }, { channel: 'production', version: 'v1', language: 'de' }] }
  };
  const page = (language: string) => `---\nid: guide.test\ntitle: Test\nsummary: Test\ntype: guide\nslug: /test\nchannel: production\nversion: v1\n${language}access: { policy: public }\n---\nHello\n`;
  await writeFile(path.join(directory, 'content/default.md'), page(''));
  await writeFile(path.join(directory, 'content/german.md'), page('language: de\n'));
  await writeFile(configFile, JSON.stringify(config));
  const output = path.join(directory, 'site');
  let manifest = await compile(configFile, output);
  assert.deepEqual(manifest.documents.map(doc => [doc.variant.language, doc.url]), [['fr', '/test'], ['de', '/de/test']]);
  assert.ok((await readFile(path.join(output, 'test/index.html'), 'utf8')).includes('<html lang="fr">'));
  delete config.publications.defaults.language;
  await writeFile(configFile, JSON.stringify(config));
  manifest = await compile(configFile);
  assert.deepEqual(manifest.documents.map(doc => [doc.variant.language, doc.url]), [['en', '/test'], ['de', '/de/test']]);
  const draft = await scaffold(configFile, 'guide', path.join(directory, 'content/draft.md'), { id: 'draft', title: 'Draft', summary: 'Draft', slug: '/draft' });
  assert.equal(draft.publication.language, 'en');
});

test('global frontmatter merges defaults, page values, and enforced metadata before validation', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-global-metadata-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  await mkdir(path.join(directory, 'config'));
  const settings = path.join(directory, 'config/frontmatter.json');
  const globals: any = {
    defaults: { type: 'guide', summary: 'Shared summary', channel: 'production', version: 'v1', language: 'fr', product: 'platform', area: 'general',
      access: { policy: 'public' }, audiences: ['default'], seo: { title: 'Default SEO', description: 'Inherited description' },
      agent: { intent: 'Default intent', team: 'Docs' } },
    enforced: { language: 'de', audiences: ['enforced'], seo: { title: 'Site SEO' }, agent: { intent: 'Enforced intent' } },
    fields: { 'agent.intent': { type: 'string', required: true, public: true }, 'agent.team': { type: 'string', public: true } }
  };
  await writeFile(settings, JSON.stringify(globals));
  const configFile = path.join(directory, 'docs.config.yaml');
  await writeFile(configFile, JSON.stringify({ schemaVersion: 1, site: { title: 'Test' },
    frontmatter: { $include: './config/frontmatter.json' },
    publications: { defaults: { channel: 'production', version: 'v1', language: 'en' }, channels: { production: {} }, versions: { v1: {} }, enabled: [{ channel: 'production', version: 'v1' }] },
    outputs: { html: { highlighting: { provider: 'none' } }, markdown: { metadata: { format: 'yaml-frontmatter', fields: { language: 'publication.language', audiences: 'frontmatter.audiences', product: 'frontmatter.product', area: 'frontmatter.area', subarea: 'frontmatter.subarea', intent: 'frontmatter.agent.intent', team: 'frontmatter.agent.team' } } } }
  }));
  const pageFile = path.join(directory, 'content/page.md');
  await writeFile(pageFile, '---\nid: test\ntitle: Page\nslug: /page\nlocale: es\naudiences: [page]\narea: authoring\nsubarea: metadata\nseo: {title: Page SEO}\nagent: {intent: Page intent}\n---\nBody\n');
  await writeFile(path.join(directory, 'content/draft.md'), '---\nid: draft\ntitle: Draft\nslug: /draft\naccess: {policy: draft}\n---\nBody\n');
  const output = path.join(directory, 'site');
  let manifest = await compile(configFile, output);
  assert.equal(manifest.documents.length, 1, 'page draft policy overrides the public default');
  assert.equal(manifest.documents[0].variant.language, 'de');
  assert.equal(manifest.documents[0].url, '/page');
  assert.equal(manifest.documents[0].summary, 'Shared summary');
  assert.deepEqual([manifest.documents[0].product, manifest.documents[0].area, manifest.documents[0].subarea], ['platform', 'authoring', 'metadata']);
  const search = JSON.parse(await readFile(path.join(output, 'search-index.json'), 'utf8'));
  assert.deepEqual([search.documents[0].product, search.documents[0].area, search.documents[0].subarea], ['platform', 'authoring', 'metadata']);
  const html = await readFile(path.join(output, 'page/index.html'), 'utf8');
  assert.ok(html.includes('<title>Site SEO</title>'));
  assert.ok(html.includes('content="Inherited description"'));
  const markdown = await readFile(path.join(output, 'page.md'), 'utf8');
  assert.match(markdown, /intent: Enforced intent/);
  assert.match(markdown, /team: Docs/);
  assert.match(markdown, /audiences:\n  - enforced/);
  assert.match(markdown, /product: platform\narea: authoring\nsubarea: metadata/);
  assert.ok(!markdown.includes('Page intent'));
  const schema = JSON.parse(await readFile(path.join(directory, '.shoalrun/frontmatter.schema.json'), 'utf8'));
  assert.deepEqual(schema.required, ['id', 'title', 'slug']);
  for (const field of ['product', 'area', 'subarea']) assert.equal(schema.properties[field].minLength, 1);
  for (const [field, value] of [['product', ''], ['area', 42], ['subarea', []]] as const) {
    assert.throws(() => validateFrontmatter({ id: 'bad', title: 'Bad', type: 'guide', summary: 'Bad', slug: '/bad', [field]: value } as any, {}, 'category.mdx'), new RegExp(`${field} must be nonempty text`));
  }
  assert.ok(!(schema.properties.agent.required ?? []).includes('intent'));
  globals.enforced.access = { policy: 'draft' };
  await writeFile(settings, JSON.stringify(globals));
  manifest = await compile(configFile);
  assert.equal(manifest.documents.length, 0, 'enforced access applies to all pages');
  delete globals.enforced.access;
  globals.enforced.agent.intent = 42;
  await writeFile(settings, JSON.stringify(globals));
  await assert.rejects(compile(configFile), /agent.intent must be string/);
  globals.enforced.agent.intent = 'valid';
  globals.defaults.id = 'shared';
  await writeFile(settings, JSON.stringify(globals));
  await assert.rejects(compile(configFile), /id must stay page-specific/);
});

async function cardFixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-cards-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  await mkdir(path.join(directory, 'config'));
  const configFile = path.join(directory, 'docs.config.yaml');
  const config = { schemaVersion: 1, site: { title: 'Cards' },
    frontmatter: { defaults: { type: 'guide', summary: 'Default summary', channel: 'production', version: 'v1', access: { policy: 'public' } } },
    publications: { defaults: { channel: 'production', version: 'v1', language: 'en' },
      channels: { production: {}, sandbox: { pathPrefix: '/sandbox' } }, versions: { v1: {}, v2: { pathPrefix: '/v2' } },
      enabled: [ { channel: 'production', version: 'v1' }, { channel: 'sandbox', version: 'v1' }, { channel: 'production', version: 'v2' }, { channel: 'production', version: 'v1', language: 'fr' } ] },
    relationships: { $include: './config/relationships.json' },
    apis: { sample: { operations: [{ id: 'sample.run', reference: 'alpha' }] } },
    outputs: { html: { highlighting: { provider: 'none' } } }
  };
  await writeFile(configFile, JSON.stringify(config));
  const relationships = (edges: unknown[]) => writeFile(path.join(directory, 'config/relationships.json'), JSON.stringify(edges));
  await relationships([]);
  const page = (file: string, id: string, metadata: object = {}, body = 'Body') => writeFile(path.join(directory, 'content', file + '.mdx'), `---\n${JSON.stringify({ id, title: id, slug: '/' + id, ...metadata })}\n---\n${body}\n`);
  await page('00-home', 'home', {}, '<DocCards docs={["beta", "alpha"]} />');
  await page('alpha', 'alpha', { title: 'Alpha', summary: 'Alpha summary', tags: ['start'], audiences: ['developers'], operations: ['sample.run'], card: { title: 'Start here', description: 'Card description', eyebrow: 'Guide' } });
  await page('beta', 'beta', { title: 'Beta', summary: 'Beta summary', subjectLifecycle: 'beta', tags: ['start'], audiences: ['developers'] });
  await page('draft', 'draft', { title: 'Secret draft', access: { policy: 'draft' }, tags: ['start'] });
  await page('sandbox', 'sandbox', { title: 'Sandbox only', channel: 'sandbox', tags: ['start'] });
  await page('version2', 'version2', { title: 'Version two only', version: 'v2', tags: ['start'] });
  await page('french', 'french', { title: 'French only', language: 'fr', tags: ['start'] });
  return { directory, configFile, page, relationships, output: path.join(directory, 'site') };
}

test('cards inherit metadata, preserve curated order, and survive file and slug changes', async t => {
  const f = await cardFixture(t);
  let manifest = await compile(f.configFile, f.output);
  const home = manifest.documents.find(doc => doc.id === 'home')!;
  assert.deepEqual(home.cardTargets, ['beta', 'alpha']);
  const html = await readFile(path.join(f.output, 'home/index.html'), 'utf8');
  const markdown = await readFile(path.join(f.output, 'home.md'), 'utf8');
  assert.ok(html.includes('<ul class="doc-cards">'));
  assert.ok(html.includes('href="/alpha">Start here</a>'));
  assert.ok(markdown.indexOf('[Beta]') < markdown.indexOf('[Start here]'));
  assert.match(markdown, /\[Start here\]\(\/alpha\.md\)/);
  for (const value of ['Card description', 'Guide', 'Status: Beta.']) { assert.ok(html.includes(value)); assert.ok(markdown.includes(value)); }
  assert.ok(!markdown.includes('<DocCards'));
  await rename(path.join(f.directory, 'content/alpha.mdx'), path.join(f.directory, 'content/renamed.mdx'));
  const target = path.join(f.directory, 'content/renamed.mdx');
  await writeFile(target, (await readFile(target, 'utf8')).replace('"/alpha"', '"/new-alpha"').replace('Card description', 'Updated description'));
  manifest = await compile(f.configFile, f.output);
  const updated = await readFile(path.join(f.output, 'home.md'), 'utf8');
  assert.match(updated, /\[Start here\]\(\/new-alpha\.md\)/);
  assert.ok(updated.includes('Updated description'));
  assert.notEqual(manifest.documents.find(doc => doc.id === 'home')!.digest, home.digest);
});

test('collections filter the visible publication, apply pin/exclude/limit, and rebuild membership', async t => {
  const f = await cardFixture(t);
  await f.page('00-home', 'home', {}, '<DocCollection type="guide" tag="start" audience="developers" pin={["beta"]} limit={2} />');
  let manifest = await compile(f.configFile, f.output);
  let home = manifest.documents.find(doc => doc.id === 'home')!;
  assert.deepEqual(home.cardTargets, ['beta', 'alpha']);
  assert.equal(home.cardQueries[0].tag, 'start');
  const markdown = await readFile(path.join(f.output, 'home.md'), 'utf8');
  for (const hidden of ['Secret draft', 'Sandbox only', 'Version two only', 'French only']) assert.ok(!markdown.includes(hidden));
  await f.page('00-home', 'home', {}, '<DocCollection tag="start" exclude={["alpha"]} orderBy="id" />');
  manifest = await compile(f.configFile, f.output);
  assert.deepEqual(manifest.documents.find(doc => doc.id === 'home')!.cardTargets, ['beta']);
  await f.page('new', 'new', { title: 'New guide', tags: ['start'] });
  manifest = await compile(f.configFile, f.output);
  assert.deepEqual(manifest.documents.find(doc => doc.id === 'home')!.cardTargets, ['beta', 'new']);
  await f.page('00-home', 'home', {}, '<DocCollection operation="sample.run" />');
  manifest = await compile(f.configFile, f.output);
  assert.deepEqual(manifest.documents.find(doc => doc.id === 'home')!.cardTargets, ['alpha']);
  await f.page('00-home', 'home', {}, '<DocCollection tag="absent" empty="No guides yet." />');
  await compile(f.configFile, f.output);
  assert.ok((await readFile(path.join(f.output, 'home.md'), 'utf8')).includes('No guides yet.'));
});

test('changelog identifiers are configurable while release notes can cover a period', async t => {
  const f = await cardFixture(t);
  await f.page('00-home', 'home', {}, '<DocCollection type="changelog-entry" orderBy="date" />');
  await f.page('old', 'old', { type: 'changelog-entry', title: 'Old update', date: '2026-08-11', updated: '2026-08-11' });
  await f.page('recent', 'recent', { type: 'changelog-entry', title: 'Recent update', date: '2026-09-24', updated: '2026-09-25', verified: '2026-09-26' });
  await f.page('summary', 'summary', { type: 'release-note', title: 'Quarterly summary' });
  const manifest = await compile(f.configFile, f.output);
  assert.deepEqual(manifest.documents.find(doc => doc.id === 'home')?.cardTargets, ['recent', 'old']);
  const changelog = await readFile(path.join(f.output, 'home.md'), 'utf8');
  assert.ok(changelog.indexOf('Recent update') < changelog.indexOf('Old update'));
  assert.match(changelog, /2026-09-24/);
  const html = await readFile(path.join(f.output, 'recent/index.html'), 'utf8');
  const markdown = await readFile(path.join(f.output, 'recent.md'), 'utf8');
  assert.match(html, /<time class="page-date" datetime="2026-09-24">2026-09-24<\/time>/);
  assert.doesNotMatch(html, /Updated <time/);
  assert.doesNotMatch(markdown, /\*\*Updated:/);
  assert.equal(manifest.documents.find(doc => doc.id === 'recent')?.updated, '2026-09-25');
  assert.doesNotMatch(html, /class="verified"|Verified <time/);
  assert.match(markdown, /Verified: 2026-09-26/);
  const oldHtml = await readFile(path.join(f.output, 'old/index.html'), 'utf8');
  const oldHeader = oldHtml.split('<header class="page-head">')[1].split('</header>')[0];
  assert.equal((oldHeader.match(/datetime="2026-08-11"/g) ?? []).length, 1);
  assert.match(markdown, /\*\*Published: 2026-09-24\.\*\*/);
  assert.doesNotMatch(await readFile(path.join(f.output, 'summary.md'), 'utf8'), /\*\*Published:|\*\*Version:/);
  await f.page('recent', 'recent', { type: 'changelog-entry', title: 'Recent update', date: '2026-02-30' });
  await assert.rejects(compile(f.configFile), /date must be a real YYYY-MM-DD calendar date/);
  await f.page('recent', 'recent', { type: 'changelog-entry', title: 'Recent update' });
  await assert.rejects(compile(f.configFile), /changelog-entry pages need date or releaseVersion/);
  await f.page('old', 'old', { type: 'changelog-entry', title: 'Old update', releaseVersion: 'v2' });
  await f.page('recent', 'recent', { type: 'changelog-entry', title: 'Recent update', releaseVersion: 'v10' });
  await f.page('00-home', 'home', {}, '<DocCollection type="changelog-entry" orderBy="releaseVersion" />');
  const settings = JSON.parse(await readFile(f.configFile, 'utf8'));
  settings.frontmatter.changelogIdentifier = 'version';
  await writeFile(f.configFile, JSON.stringify(settings));
  const versioned = await compile(f.configFile, f.output);
  assert.deepEqual(versioned.documents.find(doc => doc.id === 'home')?.cardTargets, ['recent', 'old']);
  assert.match(await readFile(path.join(f.output, 'recent.md'), 'utf8'), /\*\*Version: v10\.\*\*/);
  assert.match(await readFile(path.join(f.output, 'recent/index.html'), 'utf8'), /<span class="page-version">Version v10<\/span>/);
  settings.frontmatter.changelogIdentifier = 'either';
  await writeFile(f.configFile, JSON.stringify(settings));
  await compile(f.configFile, f.output);
  settings.frontmatter.changelogIdentifier = 'date';
  await writeFile(f.configFile, JSON.stringify(settings));
  await assert.rejects(compile(f.configFile), /changelog-entry pages need date/);
  settings.frontmatter.changelogIdentifier = 'unknown';
  await writeFile(f.configFile, JSON.stringify(settings));
  await assert.rejects(compile(f.configFile), /changelogIdentifier must be date, version, or either/);
});

test('relationship cards are directed or symmetric, ordered, and publication filtered', async t => {
  const f = await cardFixture(t);
  await f.relationships([
    { id: 'later', from: 'home', to: 'alpha', type: 'next-step', reason: 'Do this second.', order: 20 },
    { id: 'first', from: 'home', to: 'beta', type: 'next-step', reason: 'Do this first.', order: 10 },
    { id: 'other', from: 'alpha', to: 'beta', type: 'see-also', reason: 'Compare these guides.' },
    { id: 'hidden', from: 'home', to: 'draft', type: 'next-step', reason: 'Private reason.' },
    { id: 'wrong-language', from: 'home', to: 'french', type: 'next-step', reason: 'French reason.' }
  ]);
  await f.page('00-home', 'home', {}, '<DocCards relation="next-step" />');
  await f.page('beta', 'beta', {}, '<DocCards relatedTo="beta" relation="see-also" />');
  let manifest = await compile(f.configFile, f.output);
  assert.deepEqual(manifest.documents.find(doc => doc.id === 'home')!.cardTargets, ['beta', 'alpha']);
  assert.deepEqual(manifest.documents.find(doc => doc.id === 'beta')!.cardTargets, ['alpha']);
  assert.deepEqual(manifest.relationships.map(edge => edge.id), ['other', 'first', 'later']);
  const markdown = await readFile(path.join(f.output, 'home.md'), 'utf8');
  assert.ok(markdown.includes('Do this first.'));
  assert.ok(!markdown.includes('Private reason.'));
  await f.page('00-home', 'home', {}, '<DocCards relatedTo="alpha" relation="next-step" />');
  manifest = await compile(f.configFile, f.output);
  assert.deepEqual(manifest.documents.find(doc => doc.id === 'home')!.cardTargets, []);
});

test('invalid card selections and relationship declarations fail with diagnostics', async t => {
  const f = await cardFixture(t);
  for (const [body, message] of [
    ['<DocCard doc="draft" />', /unavailable/],
    ['<DocCard doc="french" />', /unavailable/],
    ['<DocCards docs={["alpha", "alpha"]} />', /unique document IDs/],
    ['<DocCards docs={getDocuments()} />', /literal/],
    ['<DocCards docs={["alpha"]} relation="next-step" />', /either docs or relation/],
    ['<DocCollection pin={["draft"]} />', /unavailable/],
    ['<DocCollection type="reference" pin={["alpha"]} />', /does not match/],
    ['<DocCollection limit={0} />', /positive integer/],
    ['<DocCard href="/alpha" />', /unknown or duplicate/],
    ['<DocCollection operation="typo" />', /unknown card collection operation/]
  ] as const) {
    await f.page('00-home', 'home', {}, body);
    await assert.rejects(compile(f.configFile), message);
  }
  await f.page('00-home', 'home');
  const edge = { id: 'a', from: 'home', to: 'alpha', type: 'prerequisite', reason: 'Read first.' };
  for (const [edges, message] of [
    [[{ ...edge, to: 'missing' }], /unknown document/],
    [[{ ...edge, to: 'home' }], /itself/],
    [[edge, { ...edge, id: 'b', from: 'alpha', to: 'home' }], /Prerequisite cycle/],
    [[{ ...edge, type: 'see-also' }, { ...edge, id: 'b', type: 'see-also', from: 'alpha', to: 'home' }], /Duplicate relationship/]
  ] as const) {
    await f.relationships([...edges]);
    await assert.rejects(compile(f.configFile), message);
  }
  await f.relationships([]);
  await f.page('alpha', 'alpha', { card: { image: '/unsupported.png' } });
  await assert.rejects(compile(f.configFile), /unsupported card setting image/);
});

test('cards reflect authoritative API subjectLifecycle even when the referencing page renders first', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const overview = path.join(directory, 'content/overview.mdx');
  await writeFile(overview, (await readFile(overview, 'utf8')) + '\n<DocCard doc="reference.create-payment" />\n');
  await rename(overview, path.join(directory, 'content/renamed-overview.mdx'));
  const apiFile = path.join(directory, 'apis/payments/openapi.yaml');
  await writeFile(apiFile, (await readFile(apiFile, 'utf8')).replace('operationId: createPayment', 'operationId: createPayment\n      deprecated: true'));
  const output = path.join(directory, 'site');
  await compile(path.join(directory, 'docs.config.yaml'), output);
  assert.match(await readFile(path.join(output, 'v1/overview.md'), 'utf8'), /Status: Deprecated/);
  const html = await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8');
  assert.match(html, /class="nav-entry nav-deprecated"[\s\S]*?<span class="nav-entry-label">Create a payment<\/span>/);
  assert.match(html, /<h1>Create a payment<span class="subject-lifecycle-badge subject-lifecycle-deprecated">Deprecated<\/span><\/h1>/);
});

test('Lucide card icons are decorative, inherit defaults, and leave Markdown unchanged', async t => {
  const f = await cardFixture(t);
  await compile(f.configFile, f.output);
  const baseline = await readFile(path.join(f.output, 'home.md'), 'utf8');
  assert.ok(!(await readFile(path.join(f.output, 'home/index.html'), 'utf8')).includes('doc-card-icon'));
  const alpha = path.join(f.directory, 'content/alpha.mdx');
  const source = await readFile(alpha, 'utf8');
  await writeFile(alpha, source.replace('"eyebrow":"Guide"', '"eyebrow":"Guide","icon":"book-open"'));
  const config = JSON.parse(await readFile(f.configFile, 'utf8'));
  config.frontmatter.defaults.card = { icon: 'terminal' };
  await writeFile(f.configFile, JSON.stringify(config));
  await compile(f.configFile, f.output);
  const html = await readFile(path.join(f.output, 'home/index.html'), 'utf8');
  assert.match(html, /<svg[^>]+aria-hidden="true"[^>]+focusable="false"[^>]+data-lucide="book-open"/);
  assert.match(html, /<svg[^>]+data-lucide="terminal"/);
  assert.equal((html.match(/class="doc-card-icon"/g) ?? []).length, 2);
  assert.match(html, /stroke-width="1.75"/);
  assert.equal(await readFile(path.join(f.output, 'home.md'), 'utf8'), baseline);
  assert.match(await readFile(path.join(f.output, 'assets/lucide-LICENSE.txt'), 'utf8'), /ISC License/);
  const schema = JSON.parse(await readFile(path.join(f.directory, '.shoalrun/frontmatter.schema.json'), 'utf8'));
  assert.equal(schema.properties.card.properties.icon.type, 'string');
  for (const name of ['unknown-icon-that-does-not-exist', '../book-open', 'https://example.test/icon.svg']) {
    await writeFile(alpha, source.replace('"eyebrow":"Guide"', `"eyebrow":"Guide","icon":${JSON.stringify(name)}`));
    await assert.rejects(compile(f.configFile), /unknown Lucide card.icon/);
  }
});

test('related reading groups plain links by purpose and offers optional cards', async t => {
  const f = await cardFixture(t);
  await f.relationships([
    { id: 'next', from: 'home', to: 'beta', type: 'next-step', reason: 'Continue here.', order: 1 },
    { id: 'first', from: 'home', to: 'alpha', type: 'prerequisite', reason: 'Learn the basics.', order: 20 },
    { id: 'ref', from: 'home', to: 'alpha', type: 'reference', reason: 'Look up details.' },
    { id: 'deep', from: 'home', to: 'beta', type: 'advanced', reason: 'Explore further.' },
    { id: 'distinction', from: 'alpha', to: 'home', type: 'not-confused-with', reason: 'These cover different workflows.' },
    { id: 'hidden', from: 'home', to: 'draft', type: 'reference', reason: 'Secret relationship.' },
    { id: 'language', from: 'home', to: 'french', type: 'reference', reason: 'French relationship.' }
  ]);
  await f.page('00-home', 'home', {}, '## Related reading\n\n<RelatedReading />');
  let manifest = await compile(f.configFile, f.output);
  let html = await readFile(path.join(f.output, 'home/index.html'), 'utf8');
  let markdown = await readFile(path.join(f.output, 'home.md'), 'utf8');
  assert.match(html, /class="related-reading"/);
  assert.doesNotMatch(html, /class="doc-cards"/);
  assert.ok(markdown.indexOf('### Read first') < markdown.indexOf('### Next steps'));
  for (const label of ['Reference while working', 'Go deeper', 'Often confused with']) assert.ok(markdown.includes(`### ${label}`));
  assert.match(markdown, /\[Alpha\]\([^)]*alpha\.md\) — Learn the basics\./);
  for (const hidden of ['Start here', 'Card description', 'Secret relationship.', 'French relationship.', '### Related topics']) assert.ok(!markdown.includes(hidden), hidden);
  assert.equal(manifest.documents.find(doc => doc.id === 'home')!.cardQueries[0].component, 'RelatedReading');
  await f.page('00-home', 'home', {}, '<RelatedReading relation="prerequisite" layout="cards" />');
  await compile(f.configFile, f.output);
  html = await readFile(path.join(f.output, 'home/index.html'), 'utf8');
  markdown = await readFile(path.join(f.output, 'home.md'), 'utf8');
  assert.match(html, /class="doc-cards"/);
  assert.match(markdown, /Start here/);
  assert.match(markdown, /Learn the basics/);
  assert.doesNotMatch(markdown, /### Read first/);
  await f.page('00-home', 'home', {}, '<RelatedReading relatedTo="beta" empty="Nothing yet." />');
  await compile(f.configFile, f.output);
  assert.match(await readFile(path.join(f.output, 'home.md'), 'utf8'), /Nothing yet\./);
  for (const [body, error] of [
    ['<RelatedReading layout="tiles" />', /layout must be list or cards/],
    ['<RelatedReading relation="unknown" />', /unsupported relation/],
    ['<RelatedReading docs={["alpha"]} />', /unknown or duplicate/],
    ['<RelatedReading relatedTo="draft" />', /unavailable/]
  ] as const) {
    await f.page('00-home', 'home', {}, body);
    await assert.rejects(compile(f.configFile), error);
  }
});

test('same-named schema files remain distinct while genuine recursion terminates', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-schema-identity-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'a'));
  await mkdir(path.join(directory, 'b'));
  await writeFile(path.join(directory, 'a/schema.json'), JSON.stringify({ Thing: { $ref: '../b/schema.json#/Thing' } }));
  await writeFile(path.join(directory, 'b/schema.json'), JSON.stringify({ Thing: {
    type: 'object', properties: { realField: { type: 'string' }, next: { $ref: '#/Thing' } }
  } }));
  const file = path.join(directory, 'openapi.json');
  await writeFile(file, JSON.stringify({ openapi: '3.1.0', info: { title: 'Test', version: '1' }, paths: {
    '/ping': { get: { operationId: 'ping', responses: { '200': { description: 'OK', content: {
      'application/json': { schema: { $ref: './a/schema.json#/Thing' } }
    } } } } }
  } }));
  const generated = await new ApiReader().operation(file, 'ping');
  const markdown = renderMarkdown(semanticRoot(generated.blocks));
  assert.match(markdown, /`realField`/);
  assert.match(markdown, /Recursive reference: `Thing`/);
  assert.deepEqual(generated.shapes[0].value, { realField: 'string', next: '<recursive Thing>' });
});

test('API publication keeps literal reference payloads and copies real dependencies', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-literal-reference-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content'));
  const payload = { $ref: 'literal-payload-value', nested: { $ref: 'https://example.test/data' } };
  await writeFile(path.join(directory, 'examples.json'), JSON.stringify({ sample: { value: payload } }));
  await writeFile(path.join(directory, 'field.json'), JSON.stringify({ type: 'string' }));
  const spec = { openapi: '3.1.0', info: { title: 'Test', version: '1' }, paths: {
    '/ping': { get: { operationId: 'ping', responses: { '200': { description: 'OK', content: {
      'application/json': {
        schema: { type: 'object', default: payload, properties: { example: { $ref: './field.json' } } },
        examples: { $ref: { $ref: './examples.json#/sample' }, inline: { value: payload } }
      }
    } } } } }
  }, components: { schemas: { Unused: { type: 'object', examples: [payload], enum: [payload], const: payload } } } };
  const source = path.join(directory, 'openapi.json');
  await writeFile(source, JSON.stringify(spec));
  assert.deepEqual(await new ApiReader().collectReferences(source), ['examples.json', 'field.json', 'openapi.json'].map(name => path.join(directory, name)));
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, JSON.stringify({
    schemaVersion: 1, site: { title: 'Test' }, publications: {
      defaults: { channel: 'production', version: 'v1' },
      channels: { production: {} }, versions: { v1: {} }, enabled: [{ channel: 'production', version: 'v1' }]
    }, apis: { test: { source: { kind: 'file', path: './openapi.json', publish: true }, generateReferences: true } }
  }));
  const output = path.join(directory, 'site');
  const manifest = await compile(config, output);
  const published = path.join(output, manifest.apiSources[0].sourceUrl);
  assert.deepEqual(JSON.parse(await readFile(published, 'utf8')), spec);
  const operation = await new ApiReader().operation(published, 'ping');
  assert.equal(operation.examples.length, 2);
  for (const example of operation.examples) assert.deepEqual(example.value, payload);
  assert.match(renderMarkdown(semanticRoot(operation.blocks)), /`example`/);
});

test('page type eyebrows read as words', () => {
  assert.equal(typeLabel('api-reference'), 'API reference');
  assert.equal(typeLabel('release-note'), 'Release note');
  assert.equal(typeLabel('guide'), 'Guide');
});

test('dark palettes add a faint edge to surfaces and light palettes do not', async () => {
  const palette = await resolvePalette('harbor', 'kelp');
  assert.match(paletteCss(palette, 'dark'), /--shadow-edge:0 0 0 1px #ffffff0f/);
  assert.match(paletteCss(palette, 'light'), /--shadow-edge:0 0 #0000/);
});

test('palette syntax colors stay readable on code blocks and kelp matches the base tokens', async () => {
  for (const name of paletteNames) {
    const palette = await resolvePalette(name, 'kelp');
    for (const [role, color] of Object.entries(syntaxColors(palette))) {
      if (color.startsWith('#')) for (const mode of ['light', 'dark'] as const) assert.ok(contrast(color, palette[mode]['code-block']) >= 4.5, `${name} ${role} on ${mode} code block`);
    }
  }
  const tokens = await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../styles/tokens.css'), 'utf8');
  for (const [role, color] of Object.entries(syntaxColors(await resolvePalette('kelp', 'kelp')))) assert.match(tokens, new RegExp(`--code-token-${role}: ${color};`));
  const low = await resolvePalette({ extends: 'kelp', dark: { accent: '#3a4a44' } }, 'kelp');
  assert.equal(syntaxColors(low).keyword, 'var(--color-code-text)', 'a low-contrast accent falls back to code text');
});

test('Hero needs a landing layout, a tagline, and link-only actions', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const page = (frontmatter: string, body: string) => `---\nid: landing.test\ntitle: Landing\nsummary: A landing page.\ntype: overview\nslug: /landing\nchannel: production\nversion: v1\naccess: { policy: public }\n${frontmatter}---\n\n${body}\n`;
  const file = path.join(directory, 'content/landing.mdx');
  for (const [frontmatter, body, error] of [
    ['', '<Hero tagline="Hi">\n  [Go](/x)\n</Hero>', /<Hero> needs layout: landing/],
    ['layout: landing\n', '<Hero>\n  [Go](/x)\n</Hero>', /<Hero> needs a nonempty tagline/],
    ['layout: landing\n', '<Hero tagline="Hi">\n  Some prose\n</Hero>', /<Hero> body may contain only action links and one code block/],
    ['layout: landing\n', '<Hero tagline="Hi">\n  [A](/a) [B](/b) [C](/c) [D](/d)\n</Hero>', /at most three action links/],
    ['layout: sidebarless\n', 'Body.', /layout must be docs, wide, landing, or splash/]
  ] as const) {
    await writeFile(file, page(frontmatter, body));
    await assert.rejects(compile(configFile), error);
  }
  await writeFile(file, page('layout: landing\n', '<Hero tagline="Hi" align="start">\n  [Go](/x)\n</Hero>'));
    {
    const output = path.join(directory, 'dist-landing');
    await compile(configFile, output);
    assert.match(await readFile(path.join(output, 'v1/landing/index.html'), 'utf8'), /<section class="hero" data-hero="" data-align="start">/);
  }
  await writeFile(path.join(directory, 'content/hero.png'), 'png bytes');
  await writeFile(file, page('layout: landing\n', '<Hero tagline="Hi" image="./hero.png" imageAlt="The docs site on a laptop">\n  [Go](/x)\n</Hero>'));
  {
    const output = path.join(directory, 'dist-image');
    await compile(configFile, output);
    const html = await readFile(path.join(output, 'v1/landing/index.html'), 'utf8');
    assert.match(html, /<section class="hero has-visual" data-hero="" data-align="start"><div class="hero-copy"><h1 class="hero-title">Landing<\/h1>/);
    assert.match(html, /<div class="hero-visual"><img src="\/assets\/pages\/v1\/landing\/hero\.png" alt="The docs site on a laptop"/);
    assert.equal(await readFile(path.join(output, 'assets/pages/v1/landing/hero.png'), 'utf8'), 'png bytes');
    assert.match(await readFile(path.join(output, 'v1/landing.md'), 'utf8'), /!\[The docs site on a laptop\]\(https:\/\/docs\.example\.test\/assets\/pages\/v1\/landing\/hero\.png\)/);
  }
  await writeFile(file, page('layout: landing\n', '<Hero tagline="Hi">\n  [Go](/x)\n\n  ```sh title="Install"\n  npm ci\n  ```\n</Hero>'));
  {
    const output = path.join(directory, 'dist-code');
    await compile(configFile, output);
    const html = await readFile(path.join(output, 'v1/landing/index.html'), 'utf8');
    assert.match(html, /<div class="hero-visual hero-visual-code"><div class="code-block"><div class="code-toolbar"><span class="code-block-meta"><span class="code-block-title">Install<\/span>/);
    assert.match(await readFile(path.join(output, 'v1/landing.md'), 'utf8'), /```sh title="Install"\nnpm ci\n```/);
  }
  for (const [body, error] of [
    ['<Hero tagline="Hi" image="./hero.png">\n  [Go](/x)\n</Hero>', /image needs imageAlt/],
    ['<Hero tagline="Hi" image="./missing.png" imageAlt="">\n  [Go](/x)\n</Hero>', /<Hero> image not found/],
    ['<Hero tagline="Hi" image="./hero.gif" imageAlt="">\n  [Go](/x)\n</Hero>', /image must be an https URL or a local \.png, \.jpg, \.webp, or \.svg file/],
    ['<Hero tagline="Hi" image="./hero.png" imageAlt="">\n  ```sh\n  x\n  ```\n</Hero>', /an image or a code block, not both/],
    ['<Hero tagline="Hi">\n  ```sh\n  x\n  ```\n\n  ```sh\n  y\n  ```\n</Hero>', /accepts one code block/]
  ] as const) {
    await writeFile(file, page('layout: landing\n', body));
    await assert.rejects(compile(configFile), error);
  }
  await writeFile(file, page('layout: landing\n', '<Hero tagline="Hi" align="left">\n  [Go](/x)\n</Hero>'));
  await assert.rejects(compile(configFile), /<Hero> align must be center or start/);
  await writeFile(file, page('layout: wide\n', '## Section\n\nBody.'));
  const output = path.join(directory, 'dist');
  await compile(configFile, output);
  const html = await readFile(path.join(output, 'v1/landing/index.html'), 'utf8');
  assert.match(html, /data-layout="wide"/);
  assert.match(html, /class="layout layout-wide/);
  assert.match(html, /class="side"/);
  assert.doesNotMatch(html, /class="page-toc"/, 'wide pages drop the outline');
});

test('Tabs equalHeight is an optional boolean that changes the HTML only', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const page = (body: string) => `---\nid: tabs.test\ntitle: Tabs\nsummary: A tabs page.\ntype: overview\nslug: /tabs\nchannel: production\nversion: v1\naccess: { policy: public }\n---\n\n${body}\n`;
  const file = path.join(directory, 'content/tabs.mdx');
  const tabs = (attributes: string) => `<Tabs label="Output"${attributes}>\n<Tab label="First">\n\nShort.\n\n</Tab>\n<Tab label="Second">\n\nA much longer panel.\n\nWith two paragraphs.\n\n</Tab>\n</Tabs>`;
  for (const [attributes, error] of [
    [' equalHeight="yes"', /equalHeight must be a boolean attribute/],
    [' equalHeight={true}', /equalHeight must be a boolean attribute/],
    [' tone="dark"', /<Tabs> needs a literal label/],
    [' equalHeight equalHeight', /<Tabs> needs a literal label/]
  ] as const) {
    await writeFile(file, page(tabs(attributes)));
    await assert.rejects(compile(configFile), error);
  }
  await writeFile(file, page('<Tabs equalHeight>\n<Tab label="First">\n\nOne.\n\n</Tab>\n<Tab label="Second">\n\nTwo.\n\n</Tab>\n</Tabs>'));
  await assert.rejects(compile(configFile), /<Tabs> needs a literal label/);
  const build = async (attributes: string) => {
    await writeFile(file, page(tabs(attributes)));
    const output = path.join(directory, `dist${attributes.trim() || '-plain'}`);
    await compile(configFile, output);
    return { html: await readFile(path.join(output, 'v1/tabs/index.html'), 'utf8'), markdown: await readFile(path.join(output, 'v1/tabs.md'), 'utf8') };
  };
  const equal = await build(' equalHeight');
  const plain = await build('');
  assert.match(equal.html, /<div class="doc-tabs" data-tabs="" data-equal-height="">/);
  assert.doesNotMatch(plain.html, /data-equal-height/);
  assert.equal(equal.markdown, plain.markdown, 'equalHeight does not change the Markdown twin');
});

test('splash pages stack full-bleed Sections and keep the Markdown twin plain', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const page = (frontmatter: string, body: string) => `---\nid: splash.test\ntitle: Splash\nsummary: A splash page.\ntype: overview\nslug: /splash\nchannel: production\nversion: v1\naccess: { policy: public }\n${frontmatter}---\n\n${body}\n`;
  const file = path.join(directory, 'content/splash.mdx');
  for (const [frontmatter, body, error] of [
    ['', '<Section>\n\nBody.\n\n</Section>', /<Section> needs layout: splash/],
    ['layout: landing\n', '<Section>\n\nBody.\n\n</Section>', /<Section> needs layout: splash/],
    ['layout: splash\n', '<Section>\n</Section>', /<Section> needs block content/],
    ['layout: splash\n', '<Section tone="dark">\n\nBody.\n\n</Section>', /only literal variant and id attributes/],
    ['layout: splash\n', '<Section variant="Big Blue">\n\nBody.\n\n</Section>', /variant must be lowercase letters, numbers, and dashes/],
    ['layout: splash\n', '<Section id="two words">\n\nBody.\n\n</Section>', /id must be lowercase letters, numbers, and dashes/],
    ['layout: splash\n', '<Section>\n\n<Section>\n\nInner.\n\n</Section>\n\n</Section>', /cannot contain another <Section>/],
    ['layout: splash\n', '<Section id="a">\n\nOne.\n\n</Section>\n\n<Section id="a">\n\nTwo.\n\n</Section>', /id "a" is used more than once/]
  ] as const) {
    await writeFile(file, page(frontmatter, body));
    await assert.rejects(compile(configFile), error);
  }
  await writeFile(file, page('layout: splash\n', '<Hero tagline="Hi">\n  [Go](/x)\n</Hero>\n\n<Section id="first">\n\n## First\n\nOne.\n\n</Section>\n\n<Section variant="raised">\n\n## Second\n\nTwo.\n\n</Section>'));
  const output = path.join(directory, 'dist');
  await compile(configFile, output);
  const html = await readFile(path.join(output, 'v1/splash/index.html'), 'utf8');
  assert.match(html, /<html lang="en"[^>]* data-layout="splash">/);
  assert.match(html, /class="layout layout-splash/);
  assert.doesNotMatch(html, /class="side"|class="page-head"|class="page-toc"/, 'splash pages drop the sidebar, page header, and outline');
  assert.match(html, /<section class="splash-section" id="first"><div class="splash-inner"><h2 id="first-1">First<\/h2>|<section class="splash-section" id="first"><div class="splash-inner"><h2 id="[^"]+">First<\/h2>/);
  assert.match(html, /<section class="splash-section" data-variant="raised"><div class="splash-inner"><h2 id="second">Second<\/h2>/);
  const markdown = await readFile(path.join(output, 'v1/splash.md'), 'utf8');
  assert.doesNotMatch(markdown, /splash-section|<section|data-variant/);
  assert.match(markdown, /## First\n\nOne\.\n\n## Second\n\nTwo\./);
});

test('share images, per-page images, templates, and favicons publish with link preview tags', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  const output = path.join(directory, 'dist');
  const size = (png: Buffer) => [png.readUInt32BE(16), png.readUInt32BE(20)];
  const overviewFile = path.join(directory, 'content/overview.mdx');
  await writeFile(overviewFile, (await readFile(overviewFile, 'utf8')).replace('title: Documentation framework prototype', 'title: Getting started'));
  await compile(configFile, output);
  const html = await readFile(path.join(output, 'v1/overview/index.html'), 'utf8');
  assert.match(html, /<meta property="og:description" content="A self-built example of stable IDs and paired API documentation\.">/, 'page summary describes the social preview by default');
  assert.match(html, /<meta property="og:title" content="Getting started \| Shoalrun documentation framework">/);
  assert.match(html, /<meta name="twitter:title" content="Getting started \| Shoalrun documentation framework">/);
  assert.match(html, /<meta name="twitter:description" content="A self-built example of stable IDs and paired API documentation\.">/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/docs\.example\.test\/assets\/share\/v1\/overview\.png">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/docs\.example\.test\/assets\/share\/v1\/overview\.png"><meta property="og:image:width" content="1200">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"><link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/);
  assert.deepEqual(size(await readFile(path.join(output, 'assets/share/v1/overview.png'))), [1200, 630]);
  assert.deepEqual(size(await readFile(path.join(output, 'apple-touch-icon.png'))), [180, 180]);
  assert.match(await readFile(path.join(output, 'favicon.svg'), 'utf8'), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64"/);
  assert.deepEqual(JSON.parse(await readFile(path.join(output, 'resource-headers.json'), 'utf8'))['/favicon.svg'], { 'Content-Type': 'image/svg+xml', 'Content-Security-Policy': 'sandbox', 'X-Content-Type-Options': 'nosniff' });
  assert.ok((await readdir(path.join(directory, '.shoalrun/cache/share-images'))).length > 0, 'rendered images are cached');

  // A page image replaces its card; a project template and favicon replace the defaults.
  const page = path.join(directory, 'content/overview.mdx');
  await writeFile(page, (await readFile(page, 'utf8')).replace(/^---\n/, '---\nimage: ./launch.png\n'));
  await cp(path.join(output, 'apple-touch-icon.png'), path.join(directory, 'content/launch.png'));
  await mkdir(path.join(directory, 'share'), { recursive: true });
  await writeFile(path.join(directory, 'share/card.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#123"/><text x="60" y="200" font-family="Inter" font-size="60" fill="#fff">{{title.1}}</text><text x="60" y="560" font-family="Inter" font-size="24" fill="#fff">{{site}} · {{type}}</text></svg>');
  await writeFile(path.join(directory, 'config/outputs.yaml'), 'markdown:\n  metadata: { $include: ./markdown.yaml }\nhtml:\n  shareImages: { template: ../share/card.svg }\n');
  await cp(path.join(output, 'apple-touch-icon.png'), path.join(directory, 'config/brand.png'));
  await writeFile(path.join(directory, 'config/site.yaml'), 'title: Shoalrun documentation framework\norigin: https://docs.example.test\ncontentDir: content\nfavicon: ./brand.png\n');
  await compile(configFile, output);
  const custom = await readFile(path.join(output, 'v1/overview/index.html'), 'utf8');
  assert.match(custom, /content="https:\/\/docs\.example\.test\/assets\/share\/v1\/overview\.png"><meta name="twitter:card"/, 'a page image has no fixed size tags');
  assert.deepEqual(size(await readFile(path.join(output, 'assets/share/v1/overview.png'))), [180, 180]);
  assert.match(custom, /<link rel="icon" href="\/favicon\.png">(?!<link rel="apple-touch-icon")/);
  assert.deepEqual(size(await readFile(path.join(output, 'assets/share/v1/reference/create-payment.png'))), [1200, 630]);
  await writeFile(path.join(directory, 'config/mark.svg'), '<?xml version="1.0"?>\n<!-- brand mark -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10"><circle cx="5" cy="5" r="5" fill="#c00"/></svg>');
  await writeFile(path.join(directory, 'config/site.yaml'), 'title: Shoalrun documentation framework\norigin: https://docs.example.test\ncontentDir: content\nfavicon: ./mark.svg\n');
  await compile(configFile, output);
  assert.deepEqual(size(await readFile(path.join(output, 'apple-touch-icon.png'))), [180, 180], 'an SVG favicon with a declaration and comment still becomes a touch icon');
  assert.match(await readFile(path.join(output, 'favicon.svg'), 'utf8'), /<!-- brand mark -->/);

  await writeFile(path.join(directory, 'share/card.svg'), '<svg xmlns="http://www.w3.org/2000/svg">{{headline}}</svg>');
  await assert.rejects(compile(configFile, output), /unknown share image placeholder \{\{headline\}\}/);
  await writeFile(path.join(directory, 'config/outputs.yaml'), 'markdown:\n  metadata: { $include: ./markdown.yaml }\nhtml:\n  shareImages: false\n');
  await compile(configFile, output);
  assert.doesNotMatch(await readFile(path.join(output, 'v1/reference/create-payment/index.html'), 'utf8'), /og:image/, 'shareImages: false keeps only page images');
  assert.match(await readFile(path.join(output, 'v1/overview/index.html'), 'utf8'), /og:image/);
  for (const [file, text, error] of [
    ['config/site.yaml', 'title: T\ncontentDir: content\nfavicon: ./brand.gif\n', /site\.favicon must be a local \.svg or \.png file/],
    ['config/outputs.yaml', 'html:\n  shareImages: { template: ./card.png }\n', /shareImages\.template must be a local \.svg file/],
    ['content/overview.mdx', (await readFile(page, 'utf8')).replace('image: ./launch.png', 'image: https://example.test/a.png'), /image must be a local \.png or \.jpg file/]
  ] as const) {
    const target = path.join(directory, file);
    const before = await readFile(target, 'utf8');
    await writeFile(target, text);
    await assert.rejects(compile(configFile, output), error);
    await writeFile(target, before);
  }
});

test('config validate runs the same contrast check as the build', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configFile = path.join(directory, 'docs.config.yaml');
  assert.deepEqual(await checkThemeContrast(configFile), { modes: ['light'], palette: 'kelp' });
  await writeFile(configFile, (await readFile(configFile, 'utf8')) + 'theme: { mode: system, palette: { light: { link: "#9fe6cc" } } }\n');
  await assert.rejects(checkThemeContrast(configFile), /Theme colors fail WCAG 2\.2 contrast:\n  - light: link #9fe6cc on page #ffffff/);
  await assert.rejects(compile(configFile), /Theme colors fail WCAG 2\.2 contrast:\n  - light: link #9fe6cc on page #ffffff/);
});


test('flat llms discovery automatically includes every page with summaries despite grouping overrides', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-flat-llms-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../example-configs/minimal'), directory, { recursive: true });
  const config = path.join(directory, 'docs.config.yaml');
  await writeFile(config, (await readFile(config, 'utf8')) + '\noutputs:\n  llms:\n    format: flat\n    optionalPrefixes: [/install]\n    fictionalPrefixes: [/install]\n');
  const output = path.join(directory, 'site-dist');
  const manifest = await compile(config, output);
  const discovery = await readFile(path.join(output, 'llms.txt'), 'utf8');
  assert.match(discovery, /## Pages/);
  assert.doesNotMatch(discovery, /## Optional/);
  for (const page of manifest.documents) {
    assert.ok(discovery.includes(page.markdownUrl), page.id);
    assert.ok(discovery.includes(page.summary), page.id);
  }
  assert.match(discovery, /Fictional example:/);
  await writeFile(config, (await readFile(config, 'utf8')).replace('format: flat', 'format: unknown'));
  await assert.rejects(compile(config), /outputs.llms.format must be grouped or flat/);
});

test('subject deprecation reaches HTML, Markdown, sections, and manifest after OpenAPI inference', async t => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const page = path.join(directory, 'content/create-payment.mdx');
  const api = path.join(directory, 'apis/payments/openapi.yaml');
  await writeFile(api, (await readFile(api, 'utf8')).replace('operationId: createPayment', 'operationId: createPayment\n      deprecated: true'));
  await writeFile(page, (await readFile(page, 'utf8')).replace('type: api-reference', 'type: api-reference\nsubjectDeprecation:\n  deprecatedOn: 2026-10-15\n  sunsetOn: 2027-01-15\n  replacement: guide.create-payment\n  migration: guide.create-payment') + '\n## Migration context\n\n' + 'Retain the account identifier when replacing a request. '.repeat(500) + '\n## Short instructions\n\nRead the migration guide before changing clients.\n');
  const destination = path.join(directory, 'dist');
  const manifest = await compile(config, destination);
  const doc = manifest.documents.find(item => item.id === 'reference.create-payment')!;
  assert.equal(doc.subjectLifecycle, 'deprecated');
  assert.equal(doc.subjectDeprecation?.sunsetOn, '2027-01-15');
  assert.equal(doc.subjectDeprecation?.replacement?.markdownUrl, '/v1/guides/create-payment.md');
  const html = await readFile(path.join(destination, doc.url, 'index.html'), 'utf8');
  assert.match(html, /<strong>Subject deprecation<\/strong>/);
  assert.match(html, /href="\/v1\/guides\/create-payment"/);
  assert.match(html, /Deprecation date: 2026-10-15/);
  assert.ok(doc.sections.length, 'long page exposes section resources');
  for (const url of [doc.markdownUrl, ...doc.sections.map(section => section.markdownUrl)]) {
    const markdown = await readFile(path.join(destination, url), 'utf8');
    assert.equal((markdown.match(/\*\*Subject deprecation\*\*/g) ?? []).length, 1, url);
    assert.match(markdown, /Sunset date: 2027-01-15/);
    assert.match(markdown, /Migration guide: \[Create a payment in the example API\]\(https:\/\/docs.example.test\/v1\/guides\/create-payment.md\)/);
    assert.match(markdown, /not the availability of this documentation page/);
  }
  const server = await createSiteServer(destination);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  for (const url of [doc.url, doc.markdownUrl]) {
    const response: Response = await fetch(`http://127.0.0.1:${address.port}${url}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('deprecation'), null);
    assert.equal(response.headers.get('sunset'), null);
  }
});
