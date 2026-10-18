import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.js';
import { loadComponentPlugins } from './component-plugins.js';
import { componentPluginFiles } from './component-manifest.js';
import { parse, transformMdx, renderMarkdown } from './content.js';
import { publicTree } from './representation-tree.js';
import { content as c } from './components.js';
import { captureSnapshotInputs, confirmSnapshotInputs } from './authoring-snapshot.js';

const definition = `import {defineComponent, content as c} from '@shoalrun/cli/components';
import {message} from './model.js';
export default defineComponent({attributes:{title:{type:'string',required:true},enabled:{type:'boolean',default:true},count:{type:'number',default:2,min:1,max:5,integer:true}},children:'required',content({attributes,children}){return {content:[c.paragraph(c.strong(attributes.title)),c.paragraph(message+':'+attributes.enabled+':'+attributes.count),children],data:{enabled:attributes.enabled,count:attributes.count,label:'<script> & "quoted"'}}}});`;
const page: any = { file: '/tmp/page.mdx', route: '/page', frontmatter: { id: 'page' }, variant: {} };
async function fixture(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-components-'));
  try {
    await writeFile(path.join(dir, 'plugin.mjs'), definition);
    await writeFile(path.join(dir, 'model.js'), "export const message = 'Qualification';");
    await writeFile(path.join(dir, 'components.json'), JSON.stringify({ apiVersion: 1, components: { Sample: { module: './plugin.mjs' } } }));
    await writeFile(path.join(dir, 'docs.yaml'), 'schemaVersion: 1\ncomponents: [./components.json]\n');
    await run(dir);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
async function registry(dir: string) { return loadComponentPlugins(await loadConfig(path.join(dir, 'docs.yaml'))); }
function lower(source: string, registry: Awaited<ReturnType<typeof loadComponentPlugins>>['registry']) {
  return transformMdx(parse.parse(source), page, new Map(), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, registry);
}
const source = '<Sample title="Choose hosting">\nWarning: retain this qualification. [Guide](https://example.com/local)\n\n```sh\nrun local\n```\n</Sample>';

test('one content function and supported helpers preserve child content, links, code, and defaults', async () => fixture(async dir => {
  const plugin = await registry(dir);
  const tree = lower(source, plugin.registry);
  const markdown = renderMarkdown(publicTree(tree, 'markdown', new Set()));
  for (const text of ['Choose hosting', 'Qualification:true:2', 'retain this qualification', 'run local', 'https://example.com/local']) assert.ok(markdown.includes(text), text);
  assert.match(JSON.stringify(publicTree(tree, 'html', new Set())), /retain this qualification/);
  assert.ok(plugin.dependencies.includes(path.join(dir, 'model.js')));
  assert.throws(() => c.table(['One'], [['a', 'b']]), /matching column/);
  assert.throws(() => c.paragraph(c.code('not inline')), /inline/);
}));
test('booleans support explicit false; numeric/literal/child constraints locate author errors', async () => fixture(async dir => {
  const plugin = await registry(dir);
  const markdown = (input: string) => renderMarkdown(publicTree(lower(input, plugin.registry), 'markdown', new Set()));
  assert.match(markdown(source.replace('title="Choose hosting"', 'title="Choose hosting" enabled="false" count="3"')), /Qualification:false:3/);
  assert.match(markdown(source.replace('title="Choose hosting"', 'title="Choose hosting" enabled')), /Qualification:true:2/);
  for (const [input, error] of [
    ['<Sample />', /missing required attribute title/], ['<Sample title="x" />', /children must be required/],
    [source.replace('title="Choose hosting"', 'title="x" extra="y"'), /unknown.*attribute extra/],
    [source.replace('title="Choose hosting"', 'title="x" enabled="no"'), /bare, "true", or "false"/],
    [source.replace('title="Choose hosting"', 'title="x" count="0"'), /numeric constraints/],
    [source.replace('title="Choose hosting"', 'title="x" count="2.5"'), /numeric constraints/],
    [source.replace('title="Choose hosting"', 'title="x" enabled={false}'), /nonliteral attribute/]
  ] as const) assert.throws(() => lower(input, plugin.registry), error);
}));
test('missing shared content, invalid raw output, unsupported data and duplicate names fail clearly', async () => fixture(async dir => {
  await writeFile(path.join(dir, 'plugin.mjs'), 'export default {html(){return "<p>lost</p>"}};');
  await assert.rejects(registry(dir), /requires content\(\).*HTML and Markdown/);
  await writeFile(path.join(dir, 'plugin.mjs'), 'export default {content(){return [{type:"html",value:"lost"}]}};');
  const raw = await registry(dir);
  assert.throws(() => lower('<Sample />', raw.registry), /raw HTML and compiler node/);
  await writeFile(path.join(dir, 'plugin.mjs'), definition.replace("data:{enabled:", "data:{invalid:()=>{},enabled:"));
  const invalid = await registry(dir);
  assert.throws(() => lower(source, invalid.registry), /only JSON values/);
  await writeFile(path.join(dir, 'docs.yaml'), 'schemaVersion: 1\ncomponents: [./components.json, ./components.json]\n');
  await assert.rejects(registry(dir), /duplicate/);
  await writeFile(path.join(dir, 'docs.yaml'), 'schemaVersion: 1\ncomponents: [./components.json]\n');
  await writeFile(path.join(dir, 'components.json'), '{"apiVersion":1,"components":{"Tabs":{"module":"./plugin.mjs"}}}');
  await assert.rejects(registry(dir), /built-in name/);
}));
test('module imports reload per build and configuration includes resolve their own manifest paths', async () => fixture(async dir => {
  await mkdir(path.join(dir, 'config'));
  await writeFile(path.join(dir, 'config/plugins.yaml'), '- ../components.json\n');
  await writeFile(path.join(dir, 'docs.yaml'), 'schemaVersion: 1\ncomponents: { $include: ./config/plugins.yaml }\n');
  assert.match(renderMarkdown(publicTree(lower(source, (await registry(dir)).registry), 'markdown', new Set())), /Qualification/);
  await writeFile(path.join(dir, 'model.js'), "export const message = 'New qualification';");
  assert.match(renderMarkdown(publicTree(lower(source, (await registry(dir)).registry), 'markdown', new Set())), /New qualification/);
}));
test('static discovery captures installed dependency graphs and package metadata without executing code', async () => fixture(async dir => {
  const installed = path.join(dir, 'node_modules', 'sample');
  await mkdir(path.join(installed, 'dist'), { recursive: true });
  await writeFile(path.join(installed, 'package.json'), '{"name":"sample","exports":"./dist/components.json","type":"module"}');
  for (const file of ['components.json','model.js']) await cp(path.join(dir,file), path.join(installed,'dist',file));
  await writeFile(path.join(installed, 'dist/plugin.mjs'), "throw new Error('must not execute discovery');\n" + definition);
  await writeFile(path.join(dir, 'docs.yaml'), 'schemaVersion: 1\ncomponents: [sample]\n');
  const capture = await captureSnapshotInputs(path.join(dir, 'docs.yaml'));
  assert.ok(capture.inputs.some(input => input.file === 'node_modules/sample/dist/model.js'));
  assert.ok(capture.inputs.some(input => input.file === 'node_modules/sample/package.json'));
  assert.equal(await confirmSnapshotInputs(capture), true);
  await writeFile(path.join(installed, 'dist/model.js'), "export const message = 'Changed';");
  assert.equal(await confirmSnapshotInputs(capture), false);
}));
test('shared helpers keep tables, callouts and component children in both outputs', async () => fixture(async dir => {
  await writeFile(path.join(dir, 'plugin.mjs'), `import {content as c} from '@shoalrun/cli/components';export default {children:'required',content({children}){return [c.table(['Option','Details'],[['Local',c.link('Guide','https://example.com')],['Hosted','Needs account']]),c.component('Callout',{type:'warning',collapsible:false},[c.paragraph('Essential warning')]),children]}}`);
  const tree = lower('<Sample>\nNested **content**.\n</Sample>', (await registry(dir)).registry);
  const markdown = renderMarkdown(publicTree(tree, 'markdown', new Set()));
  for (const text of ['Local','Hosted','Needs account','Essential warning','Nested **content**','https://example.com']) assert.ok(markdown.includes(text),text);
}));
test('compiler tracks imports, search, sections and digests; failures preserve the successful build', async () => fixture(async dir => {
  const { compile } = await import('./compiler.js');
  await cp(new URL('../example-configs/minimal/', import.meta.url), dir, { recursive: true });
  const config = path.join(dir, 'docs.config.yaml');
  await writeFile(config, `${await readFile(config,'utf8')}\ncomponents: [./components.json]\n`);
  await writeFile(path.join(dir,'content/custom.mdx'), `---\nid: custom\ntitle: Component\nsummary: Test components.\ntype: reference\nslug: /custom\naccess: { policy: public }\n---\n\n## Choices\n\n${source}`);
  const output = path.join(dir,'.shoalrun/site');
  const first = await compile(config,output);
  const original = await readFile(path.join(output,'custom.md'),'utf8');
  assert.match(await readFile(path.join(output,'search-index.json'),'utf8'),/retain this qualification/);
  await writeFile(path.join(dir,'model.js'), "export const message = 'New qualification';");
  const second = await compile(config,output);
  const updated = await readFile(path.join(output,'custom.md'),'utf8');
  assert.notEqual(original,updated); assert.notEqual(JSON.stringify(first.documents),JSON.stringify(second.documents));
  await writeFile(path.join(dir,'model.js'), "throw new Error('import failure'); export const message = ''; ");
  await assert.rejects(compile(config,output),/import failure/);
  assert.equal(await readFile(path.join(output,'custom.md'),'utf8'),updated);
}));

test('browser data is explicit, immutable from table labels, compiled from JSX, and captured in isolated validation', async () => fixture(async dir => {
  const { compile } = await import('./compiler.js');
  const { validateAuthoringChanges } = await import('./authoring-validation.js');
  const { serveSite } = await import('./server.js');
  const puppeteer = (await import('puppeteer')).default;
  await cp(new URL('../example-configs/minimal/', import.meta.url),dir,{recursive:true});
  await cp(new URL('../examples/components/retry-budget/', import.meta.url),path.join(dir,'retry'),{recursive:true,filter:file=>!file.split(path.sep).includes('node_modules')});
  await mkdir(path.join(dir,'node_modules'));
  for (const name of ['react','react-dom','scheduler']) await cp(new URL(`../node_modules/${name}/`,import.meta.url),path.join(dir,'node_modules',name),{recursive:true});
  const implementation = path.join(dir,'retry/plugin.mjs');
  await writeFile(implementation,(await readFile(implementation,'utf8')).replace('Maximum attempts','Translated heading'));
  const config=path.join(dir,'docs.config.yaml');
  await writeFile(config,`${(await readFile(config,'utf8')).replace('  title: Acme handbook','  title: Acme handbook\n  basePath: /docs')}\ncomponents: [./retry/components.json]\n`);
  await writeFile(path.join(dir,'content/retry.mdx'),'---\nid: retry\ntitle: Retry policy\nsummary: Explore retry delays.\ntype: reference\nslug: /retry\naccess: { policy: public }\n---\n\n## Policy\n\n<RetryBudget />\n\n<RetryBudget title="Second instance" />\n');
  const output=path.join(dir,'.shoalrun/site');
  const manifest=await compile(config,output);
  const html=await readFile(path.join(output,'docs/retry/index.html'),'utf8');
  const markdown=await readFile(path.join(output,'docs/retry.md'),'utf8');
  assert.match(html,/data-component-data=/);
  assert.match(html,/data-component-module="\/docs\/assets\/components\/[a-f0-9]+\.js"/);
  assert.ok(manifest.dependencies.includes(path.join(dir,'retry/model.js')));
  assert.ok(manifest.dependencies.includes(path.join(dir,'retry/policy.json')));
  assert.equal((await readdir(path.join(output,'docs/assets/components'))).length,2);
  for (const text of ['Retry-After','constant','exponential','3500 ms','retryDelayBounds']) assert.ok(markdown.includes(text),text);
  assert.doesNotMatch(markdown,/data-component|react-dom|<script/);
  const server=await serveSite(output,'127.0.0.1',0);
  const browser=await puppeteer.launch();
  try {
    const origin=`http://127.0.0.1:${(server.address() as any).port}`;
    const page=await browser.newPage();
    const errors:string[]=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(origin+'/docs/retry');
    await page.waitForSelector('[data-component-ready="true"]');
    const roots=await page.$$('[data-shoalrun-component="RetryBudget"]');
    const controls=(await roots[0].$('[data-component-controls]'))!;
    assert.match(await controls.$eval('[role="status"]',node=>node.textContent??''),/3,500 ms/);
    const attempts=(await controls.$('input'))!;await attempts.focus();await page.keyboard.press('ArrowUp');
    assert.match(await controls.$eval('[role="status"]',node=>node.textContent??''),/7,500 ms/);
    assert.match(await roots[1].$eval('[role="status"]',node=>node.textContent??''),/3,500 ms/);
    await page.setViewport({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.setJavaScriptEnabled(false);await page.reload();
    assert.equal(await page.$$eval('[data-component-controls]',nodes=>nodes.every(node=>(node as HTMLElement).hidden)),true);
    assert.match(await page.$eval('[data-component-content]',node=>node.textContent??''),/Retry-After/);
    const failure=await browser.newPage();await failure.setRequestInterception(true);
    failure.on('request',request=>request.url().includes('/assets/components/')&&request.url().endsWith('.js')?void request.respond({status:200,contentType:'text/javascript',body:'export const missingEnhance = true;'}):void request.continue());
    await failure.goto(origin+'/docs/retry');await failure.waitForSelector('[data-component-ready="failed"]');
    assert.match(await failure.$eval('[data-component-content]',node=>node.textContent??''),/retryDelayBounds/);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  const report=await validateAuthoringChanges(config,{files:['content/retry.mdx']});
  try {assert.equal(report.status,'ok',JSON.stringify(report.findings));}
  finally {await rm(report.artifacts.directory,{recursive:true,force:true});}
}));

test('imported installed code invalidates watched builds', async () => fixture(async dir => {
  const {startDev}=await import('./dev.js');
  await cp(new URL('../example-configs/minimal/',import.meta.url),dir,{recursive:true});
  const pkg=path.join(dir,'node_modules/sample');await mkdir(pkg,{recursive:true});
  for(const file of ['plugin.mjs','model.js','components.json']) await cp(path.join(dir,file),path.join(pkg,file));
  await writeFile(path.join(pkg,'package.json'),'{"name":"sample","exports":"./components.json","type":"module"}');
  const config=path.join(dir,'docs.config.yaml');await writeFile(config,`${await readFile(config,'utf8')}\ncomponents: [sample]\n`);
  await writeFile(path.join(dir,'content/sample.mdx'),`---\nid: sample\ntitle: Sample\nsummary: Test plugin imports.\nslug: /sample\n---\n\n${source}`);
  const output=path.join(dir,'.shoalrun/site');const server=await startDev(config,output,'127.0.0.1',0);
  try {
    await new Promise(resolve=>setTimeout(resolve,250));
    await writeFile(path.join(pkg,'model.js'),"export const message = 'Watch changed';");
    const deadline=Date.now()+10000;
    while(!(await readFile(path.join(output,'sample.md'),'utf8')).includes('Watch changed')) {
      if(Date.now()>deadline)assert.fail('Imported installed component dependency did not rebuild');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
}));

test('typed authoring helpers infer declared attributes without compiler-node knowledge', () => {
  // These assignments are checked by tsc as part of the public API contract.
  const component = import('./components.js');
  return component.then(({ defineComponent, content }) => {
    const definition = defineComponent({ attributes: { enabled: { type: 'boolean', default: true }, count: { type: 'number', required: true }, title: { type: 'string', default: 'Title' } }, content({ attributes }) {
      const enabled: boolean = attributes.enabled;
      const count: number = attributes.count;
      const title: string = attributes.title;
      return content.paragraph(`${title}:${enabled}:${count}`);
    } });
    assert.ok(definition.content);
  });
});

test('data handoff is escaped as data and helper composition preserves explicit false', async () => fixture(async dir => {
  const { renderHtml } = await import('./content.js');
  await writeFile(path.join(dir,'client.js'),'export function enhance() {}');
  await writeFile(path.join(dir,'components.json'),JSON.stringify({apiVersion:1,components:{Sample:{module:'./plugin.mjs',browser:'./client.js'}}}));
  const plugin=await registry(dir);
  const tree=lower(source,plugin.registry);
  const html=renderHtml(publicTree(tree,'html',new Set()));
  assert.match(html,/data-component-data=/);
  const { parseFragment } = await import('parse5');
  const fragment = parseFragment(html);
  const section = fragment.childNodes[0] as any;
  assert.equal(section.tagName, 'section');
  const data = JSON.parse(section.attrs.find((attribute: any) => attribute.name === 'data-component-data').value);
  assert.equal(data.label, '<script> & \"quoted\"');
  assert.equal(JSON.stringify(fragment, (key, value) => key === 'parentNode' ? undefined : value).includes('\"tagName\":\"script\"'), false);
  await writeFile(path.join(dir,'plugin.mjs'),`import {content as c} from '@shoalrun/cli/components';export default {children:'required',content({children}){return c.component('Nested',{enabled:false},[children])}}`);
  await writeFile(path.join(dir,'nested.js'),`import {content as c} from '@shoalrun/cli/components';export default {attributes:{enabled:{type:'boolean',default:true}},children:'required',content({attributes,children}){return [c.paragraph(String(attributes.enabled)),children]}}`);
  await writeFile(path.join(dir,'components.json'),JSON.stringify({apiVersion:1,components:{Sample:{module:'./plugin.mjs'},Nested:{module:'./nested.js'}}}));
  assert.match(renderMarkdown(publicTree(lower('<Sample>\nBody\n</Sample>',(await registry(dir)).registry),'markdown',new Set())),/false/);
}));
