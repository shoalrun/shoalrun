import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { exportContent } from './content-export.js';

async function fixture(t: any, body = '## Refunds\n\nRequest within 30 days.\n\n## Limits\n\nLimits apply.') {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-resources-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'content'));
  const page = path.join(dir, 'content/billing.mdx');
  await writeFile(page, `---\nid: guide.billing\ntitle: Billing\nsummary: Billing policy\ntype: guide\nchannel: production\nversion: current\nslug: /billing\naccess: { policy: public }\nstandaloneSections: [{id: refunds, context: section}]\n---\n\n${body}\n`);
  const config = { schemaVersion: 1, site: { title: 'Content', origin: 'https://docs.example.com' }, publications: { defaults: {channel:'production',version:'current',language:'en'}, channels:{production:{pathPrefix:''}},versions:{current:{pathPrefix:''}},enabled:[{channel:'production',version:'current'}]}, exports: { app: {publicBase:'/content/r1/',resources:[{kind:'section',documentId:'guide.billing',sectionId:'refunds'}]} } };
  const file = path.join(dir, 'docs.config.yaml'); const output = path.join(dir, 'out');
  const save = async () => writeFile(file, YAML.stringify(config)); await save();
  return { dir, page, file, output, config: config as any, save };
}
const manifest = async (dir: string) => JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));

test('short-page sections export deterministic complete slices, not the page introduction', async t => {
  const f = await fixture(t, 'Page introduction should stay outside.\n\n## Refunds\n\nRequest within 30 days.\n\n### Evidence\n\nInclude receipt.\n\n## Limits\n\nOmitted sibling.');
  await exportContent(f.file, f.output, {target:'app'}); const m = await manifest(f.output); assert.equal(m.resources.length,1);
  const r = m.resources[0]; assert.deepEqual(r.ref,{kind:'section',documentId:'guide.billing',sectionId:'refunds'});
  const md = await readFile(path.join(f.output,r.representations.markdown.path),'utf8'); assert.match(md,/Include receipt/); assert.doesNotMatch(md,/Page introduction|Omitted sibling/);
});

test('section links select local targets, exported pages, or canonical omitted siblings', async t => {
  const f = await fixture(t, '## Refunds\n\nSee [limits](#limits) and [evidence](#evidence).\n\n### Evidence\n\nReceipt.\n\n## Limits\n\nTerms.');
  await exportContent(f.file,f.output,{target:'app'}); const m=await manifest(f.output); const links=m.resources[0].representations.html.links;
  assert.ok(links.some((l:any)=>l.kind==='canonical'&&l.href==='https://docs.example.com/billing#limits'));
  assert.ok(links.some((l:any)=>l.kind==='resource'&&l.ref.kind==='section'&&l.href.startsWith('#sr-')));
});

test('unapproved, draft, and missing section selections preserve the last good export', async t => {
  const f=await fixture(t); await exportContent(f.file,f.output,{target:'app'}); const before=await readFile(path.join(f.output,'manifest.json'),'utf8');
  const original=await readFile(f.page,'utf8'); await writeFile(f.page,original.replace('standaloneSections: [{id: refunds, context: section}]','standaloneSections: [Refunds]'));
  await assert.rejects(exportContent(f.file,f.output,{target:'app'}),/standalone/);
  assert.equal(await readFile(path.join(f.output,'manifest.json'),'utf8'),before);
  await writeFile(f.page,original.replace('policy: public','policy: draft')); await assert.rejects(exportContent(f.file,f.output,{target:'app'}),/non-public|unavailable/);
});

test('explicit identity survives title change and is absent from Markdown prose',async t=>{
  const f=await fixture(t,'## Request a refund <Anchor id="refunds" />\n\nRequest within 30 days.'); await exportContent(f.file,f.output,{target:'app'});const first=await manifest(f.output);
  await writeFile(f.page,(await readFile(f.page,'utf8')).replace('Request a refund','Refund requests'));await exportContent(f.file,f.output,{target:'app'});const second=await manifest(f.output);
  assert.deepEqual(first.resources[0].ref,second.resources[0].ref);assert.equal(first.resources[0].representations.markdown.path,second.resources[0].representations.markdown.path);
  assert.doesNotMatch(await readFile(path.join(f.output,second.resources[0].representations.markdown.path),'utf8'),/Anchor|section-id/);
});

test('snippet instances use explicit values and defaults without page inheritance',async t=>{
  const f=await fixture(t);await writeFile(path.join(f.dir,'refund.md'),'Refund within <Var name="days" /> days.');
  f.config.snippets={refund:{file:'./refund.md',variables:{days:{type:'number',required:true,default:14}}}};
  f.config.exports.app.resources=[{kind:'snippet',id:'refund.standard',snippetId:'refund',title:'Refund',summary:'Window',values:{days:30}},{kind:'snippet',id:'refund.default',snippetId:'refund',title:'Refund',summary:'Window'}];await f.save();await exportContent(f.file,f.output,{target:'app'});const m=await manifest(f.output);assert.equal(m.resources.length,2);
  const texts=await Promise.all(m.resources.map((r:any)=>readFile(path.join(f.output,r.representations.markdown.path),'utf8')));assert.ok(texts.some(s=>s.includes('30 days')));assert.ok(texts.some(s=>s.includes('14 days')));
  await writeFile(path.join(f.dir,'refund.md'),'<RelatedReading />');await assert.rejects(exportContent(f.file,f.output,{target:'app'}),/page context/);
});

test('section dependency closure includes used definitions and excludes unrelated footnotes',async t=>{
  const f=await fixture(t,'## Refunds\n\nRead [policy][policy]. Note[^needed].\n\n## Limits\n\nOther[^unused].\n\n[policy]: https://example.com/policy\n[^needed]: Required note.\n[^unused]: Omitted private-looking note.');await exportContent(f.file,f.output,{target:'app'});const m=await manifest(f.output);const md=await readFile(path.join(f.output,m.resources[0].representations.markdown.path),'utf8');assert.match(md,/Required note|example.com\/policy/);assert.doesNotMatch(md,/Omitted private-looking/);
});

test('comparison detects removed identities and strict mode preserves prior output',async t=>{
  const f=await fixture(t);await exportContent(f.file,f.output,{target:'app'});const baseline=path.join(f.dir,'baseline.json');const before=await readFile(path.join(f.output,'manifest.json'),'utf8');await writeFile(baseline,before);
  f.config.exports.app.resources=[{kind:'page',documentId:'guide.billing'}];await f.save();await assert.rejects(exportContent(f.file,f.output,{target:'app',previousManifest:baseline,failOnRemoved:true}),/removes/);assert.equal(await readFile(path.join(f.output,'manifest.json'),'utf8'),before);
  const result=await exportContent(f.file,f.output,{target:'app',previousManifest:baseline});assert.equal(result.comparison.removed.length,1);
});

test('each requested representation needs content beyond its heading',async t=>{
  const f=await fixture(t,'## Refunds\n\n<Only format="html">\n\nHTML-only instructions.\n\n</Only>');
  await assert.rejects(exportContent(f.file,f.output,{target:'app'}),/no content in markdown/);
  f.config.exports.app.formats=['html'];await f.save();await exportContent(f.file,f.output,{target:'app'});const m=await manifest(f.output);assert.ok(m.resources[0].representations.html);assert.equal(m.resources[0].representations.markdown,undefined);
});

test('Markdown explicit aliases use a real section resource, not a nonexistent heading slug',async t=>{
  const f=await fixture(t,'## Request a refund <Anchor id="refunds" />\n\n[Read the refund rules](#refunds).');
  f.config.exports.app.resources.unshift({kind:'page',documentId:'guide.billing'});await f.save();await exportContent(f.file,f.output,{target:'app'});const m=await manifest(f.output);const page=m.resources.find((r:any)=>r.ref.kind==='page');const section=m.resources.find((r:any)=>r.ref.kind==='section');const md=await readFile(path.join(f.output,page.representations.markdown.path),'utf8');assert.ok(md.includes(section.representations.markdown.path));assert.doesNotMatch(md,/\.md#refunds/);
});

test('a cross-resource section link prefers its selected fragment over a selected full page',async t=>{
  const f=await fixture(t,'## Request a refund <Anchor id="refunds" />\n\nRefund rules.');
  await writeFile(path.join(f.dir,'snippet.md'),'Read [refund rules](/billing#refunds).');
  f.config.snippets={refund:{file:'./snippet.md'}};f.config.exports.app.resources.push({kind:'page',documentId:'guide.billing'},{kind:'snippet',id:'links',snippetId:'refund',title:'Links',summary:'Refund details'});await f.save();await exportContent(f.file,f.output,{target:'app'});const m=await manifest(f.output);const r=m.resources.find((r:any)=>r.ref.kind==='snippet');
  for(const format of ['html','markdown'])assert.equal(r.representations[format].links[0].ref.kind,'section');
});
