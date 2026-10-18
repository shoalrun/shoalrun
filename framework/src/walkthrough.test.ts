import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compile } from './compiler.js';
import { parseLineRanges } from './walkthrough.js';

async function site(t: any) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-walkthrough-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'docs.config.yaml');
  const page = path.join(directory, 'content', 'start.mdx');
  const output = path.join(directory, 'dist');
  await mkdir(path.dirname(page));
  await writeFile(config, `schemaVersion: 1
site: { title: Test docs }
publications:
  defaults: { channel: production, version: current, language: en }
  channels: { production: { pathPrefix: "" } }
  versions: { current: { pathPrefix: "" } }
  enabled: [{ channel: production, version: current }]
navigation: [{ id: start, doc: guide.start }]
`);
  const build = async (body: string) => {
    await writeFile(page, `---
id: guide.start
title: Start
type: guide
summary: Start here.
slug: /
channel: production
version: current
access: { policy: public }
---

${body}
`);
    await compile(config, output);
    return { html: await readFile(path.join(output, 'index.html'), 'utf8'), markdown: await readFile(path.join(output, 'index.md'), 'utf8') };
  };
  return Object.assign(build, { directory });
}

const fence = (value: string, lang = 'js') => `\`\`\`${lang}\n${value}\n\`\`\``;

test('line ranges expand, sort, and stay inside the code', () => {
  assert.deepEqual(parseLineRanges('4, 1-2,2', 5, 'here'), [1, 2, 4]);
  assert.throws(() => parseLineRanges('3-1', 5, 'here'), /reversed/);
  assert.throws(() => parseLineRanges('6', 5, 'here'), /past the end of the 5-line code/);
  assert.throws(() => parseLineRanges('two', 5, 'here'), /lines or ranges/);
});

test('separate walkthrough steps keep complete code in HTML and Markdown, with token keys that follow unchanged code', async t => {
  const build = await site(t);
  const { html, markdown } = await build(`<Walkthrough title="Grow a function">
<Step title="Start">

Define the function.

${fence('function run() {\n}')}

</Step>
<Step title="Add a call" highlight="2">

Call the helper.

${fence('function run() {\n  helper();\n}')}

</Step>
<Step title="Explain without code">

The pane keeps the code before this step.

</Step>
</Walkthrough>`);
  assert.match(html, /<section class="walkthrough" id="walk-[0-9a-f]{10}" data-walkthrough="" data-mode="separate" data-layout="scroll" aria-label="Grow a function">/);
  assert.match(html, /src="\/assets\/walkthrough\.js"/);
  assert.match(html, /<h3 class="walkthrough-step-title"><span class="walkthrough-step-number">Step 2<\/span> Add a call<\/h3>/);
  assert.doesNotMatch(html, /<a[^>]+href="#[^"]*add-a-call/, 'step headings stay out of the page outline');
  // "function", "run", "(", ")" and "{" keep their keys in step 2; "helper" is new.
  const [first, second] = [...html.matchAll(/<pre[^]*?<\/pre>/g)].map(pre => new Map([...pre[0].matchAll(/data-k="([^"]+)">([^<]+)</g)].map(match => [match[2], match[1]])));
  assert.equal(second.get('function'), first.get('function'));
  assert.equal(second.get('}'), first.get('}'));
  assert.ok(!new Set(first.values()).has(second.get('helper')!));
  assert.match(html, /<pre data-focus=""><code class="language-js"><span class="line">[^\n]*<\/span>\n<span class="line is-highlighted">/);
  assert.match(markdown, /\*\*Walkthrough: Grow a function\*\*\n\n### Step 1: Start\n\nDefine the function\.\n\n```js\nfunction run\(\) \{\n\}\n```\n\n### Step 2: Add a call\n\nCall the helper\.\n\n```js\nfunction run\(\) \{\n  helper\(\);\n\}\n```\n\n### Step 3: Explain without code\n\nThe pane keeps/);
  assert.doesNotMatch(markdown, /<Walkthrough|<Step|data-k/);
});

test('unified walkthroughs show shared code once and repeat each step\'s lines in Markdown', async t => {
  const build = await site(t);
  const { html, markdown } = await build(`<Walkthrough title="Read the config">

${fence('a: 1\nb: 2\nc: 3', 'yaml')}

<Step title="First" highlight="1">

The first key.

</Step>
<Step title="Rest" highlight="2-3">

The other keys.

</Step>
</Walkthrough>`);
  assert.match(html, /data-mode="unified"/);
  assert.match(html, /<li id="walk-[0-9a-f]{10}-step-2" class="walkthrough-step" data-highlight="2 3">/);
  assert.match(html, /<p class="walkthrough-lines">Lines 2–3<\/p>/);
  assert.equal(html.match(/<pre/g)?.length, 1);
  assert.match(markdown, /```yaml\na: 1\nb: 2\nc: 3\n```\n\n### Step 1: First\n\nThe first key\.\n\nLine 1:\n\n```yaml\na: 1\n```\n\n### Step 2: Rest\n\nThe other keys\.\n\nLines 2–3:\n\n```yaml\nb: 2\nc: 3\n```/);
});

test('walkthrough structure mistakes fail the build with the step that caused them', async t => {
  const build = await site(t);
  const step = (title: string, body = 'Text.', attributes = '') => `<Step title="${title}"${attributes}>\n\n${body}\n\n</Step>`;
  const cases: Array<[string, RegExp]> = [
    [`<Walkthrough title="One">\n${step('Only')}\n</Walkthrough>`, /needs at least two steps/],
    [`<Walkthrough>\n${step('A')}\n${step('B')}\n</Walkthrough>`, /needs a nonempty title/],
    [`<Walkthrough title="X">\n\nIntro.\n\n${step('A')}\n${step('B')}\n</Walkthrough>`, /one optional code fence followed by <Step> children/],
    [`<Walkthrough title="X">\n\n${fence('a')}\n\n${step('A', `Text.\n\n${fence('b')}`)}\n${step('B')}\n</Walkthrough>`, /<Step> 1: steps cannot add code/],
    [`<Walkthrough title="X">\n${step('A', `${fence('a')}\n\nAfter.`)}\n${step('B')}\n</Walkthrough>`, /<Step> 1: put the code fence after/],
    [`<Walkthrough title="X">\n${step('A', `Text.\n\n${fence('a')}`)}\n${step('B', `Text.\n\n${fence('a\nb')}`, ' highlight="3"')}\n</Walkthrough>`, /<Step> 2: highlight range 3 is past the end of the 2-line code/],
    [`<Walkthrough title="X">\n${step('A', 'Text.', ' highlight="1"')}\n${step('B')}\n</Walkthrough>`, /highlight needs code/],
    [`<Walkthrough title="X">\n${step('A', fence('a'))}\n${step('B')}\n</Walkthrough>`, /<Step> 1 needs an explanation/],
    [step('Loose'), /<Step> must be directly inside <Steps> or <Walkthrough>/]
  ];
  for (const [body, message] of cases) await assert.rejects(build(body), message);
});

test('walkthrough code can come from a file region or line range and counts as a build dependency', async t => {
  const build = await site(t);
  const code = path.join(build.directory, 'examples', 'handler.ts');
  await mkdir(path.dirname(code));
  await writeFile(code, `import { verify } from './verify';

export function handler(body: string) {
  // #region check: the signature check
  if (!verify(body)) {
    // #region failure
    throw new Error('bad signature');
    // #endregion failure
  }
  // #endregion check -- done
  return body;
}
// Not markers: https://example.com/page#region and a string.
const note = '# region inside a string';
`);
  await writeFile(path.join(build.directory, 'examples', 'retry.conf'), 'attempts 5\n# region delay\nbackoff exponential\n# endregion\n');
  const { html, markdown } = await build(`<Walkthrough title="From files" layout="spotlight">
<Step title="Whole range" file="../examples/handler.ts" lines="3-12" highlight="1">

The function.

</Step>
<Step title="One region" file="../examples/handler.ts" region="check" highlight="2">

The check, without its region markers or indentation.

</Step>
<Step title="Nested region" file="../examples/handler.ts" region="failure">

A region inside another one, closed by name.

</Step>
<Step title="Other language" file="../examples/retry.conf" region="delay" lang="ini">

A Python-style region comment.

</Step>
</Walkthrough>`);
  assert.match(html, /data-mode="separate" data-layout="spotlight"/);
  assert.match(html, /<span class="code-block-filename">handler\.ts<\/span>/);
  assert.match(markdown, /### Step 2: One region\n\nThe check, without its region markers or indentation\.\n\n```typescript filename="handler\.ts"\nif \(!verify\(body\)\) \{\n  throw new Error\('bad signature'\);\n\}\n```/);
  assert.match(markdown, /```typescript filename="handler\.ts"\nexport function handler/);
  assert.match(markdown, /```ini filename="retry\.conf"\nbackoff exponential\n```/);
  assert.match(markdown, /### Step 3: Nested region\n\nA region inside another one, closed by name\.\n\n```typescript filename="handler\.ts"\nthrow new Error\('bad signature'\);\n```/);
  // A line range keeps region comments; only region extraction drops them.
  assert.match(markdown, /export function handler\(body: string\) \{\n  \/\/ #region check/);
  const manifest = JSON.parse(await readFile(path.join(build.directory, 'dist', 'documents.json'), 'utf8'));
  assert.ok(manifest.dependencies.includes('examples/handler.ts'));
});

test('walkthrough file sources report missing files, regions, and ranges', async t => {
  const build = await site(t);
  await mkdir(path.join(build.directory, 'examples'));
  await writeFile(path.join(build.directory, 'examples', 'a.js'), 'one\ntwo\n// #region open\nthree\n');
  await writeFile(path.join(build.directory, 'examples', 'notes.weird'), 'text\n');
  await writeFile(path.join(build.directory, 'examples', 'stray.js'), '// #region a\nx\n// #endregion\n// #endregion\n');
  await writeFile(path.join(build.directory, 'examples', 'mismatch.js'), '// #region a\n// #region b\nx\n// #endregion a\n// #endregion b\n');
  await writeFile(path.join(build.directory, 'examples', 'twice.js'), '// #region a\nx\n// #endregion\n// #region a\ny\n// #endregion\n');
  await writeFile(path.join(build.directory, 'examples', 'unnamed.js'), '// #region\nx\n// #endregion\n');
  // The site folder is the repository; a file beside it is outside.
  await mkdir(path.join(build.directory, '.git'));
  await writeFile(path.join(build.directory, '..', 'outside.js'), 'secret\n');
  t.after(() => rm(path.join(build.directory, '..', 'outside.js'), { force: true }));
  const walkthrough = (attributes: string, second = '') => `<Walkthrough title="X">\n<Step title="A"${attributes}>\n\nText.\n\n</Step>\n<Step title="B"${second}>\n\nText.\n\n</Step>\n</Walkthrough>`;
  const cases: Array<[string, RegExp]> = [
    [walkthrough(' file="../examples/missing.js"'), /code file not found/],
    [walkthrough(' file="/etc/hosts"'), /file must be a path relative to the page/],
    [walkthrough(' file="../../outside.js"'), /is outside .*; code files must be in the page's Git repository or project directory/],
    [walkthrough(' file="../examples/notes.weird" region="gone"'), /no "#region gone" comment in \.\.\/examples\/notes\.weird/],
    [walkthrough(' file="../examples/a.js" region="open"'), /region open at line 3 of \.\.\/examples\/a\.js has no #endregion/],
    [walkthrough(' file="../examples/stray.js" region="a"'), /#endregion at line 4 of \.\.\/examples\/stray\.js has no matching #region/],
    [walkthrough(' file="../examples/mismatch.js" region="b"'), /#endregion a at line 4 of \.\.\/examples\/mismatch\.js closes region b/],
    [walkthrough(' file="../examples/twice.js" region="a"'), /region a appears twice in \.\.\/examples\/twice\.js/],
    [walkthrough(' file="../examples/unnamed.js" region="x"'), /#region at line 1 of \.\.\/examples\/unnamed\.js needs a name/],
    [walkthrough(' file="../examples/a.js" lines="2-9"'), /lines 2-9 is past the end of the 4-line file/],
    [walkthrough(' file="../examples/a.js" lines="2-3" region="open"'), /use lines or region, not both/],
    [walkthrough(' region="open"'), /lines, region, and lang need a file attribute/],
    [walkthrough(' file="../examples/notes.weird"'), /set lang for \.\.\/examples\/notes\.weird/],
    [`<Walkthrough title="X" layout="tabs">\n<Step title="A">\n\nText.\n\n</Step>\n<Step title="B">\n\nText.\n\n</Step>\n</Walkthrough>`, /layout must be scroll or spotlight/],
    [`<Walkthrough title="X" file="../examples/a.js">\n\n\`\`\`js\nx\n\`\`\`\n\n<Step title="A">\n\nText.\n\n</Step>\n<Step title="B">\n\nText.\n\n</Step>\n</Walkthrough>`, /from a file or a code fence, not both/]
  ];
  for (const [body, message] of cases) await assert.rejects(build(body), message);
});
