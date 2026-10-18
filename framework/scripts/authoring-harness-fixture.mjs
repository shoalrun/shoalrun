// Prepare raw consumer artifacts for a human/harness trial; this does not write
// the answer, run a model, or score prose. Fresh dependencies remain a later gate.
import { execFileSync } from 'node:child_process';
import { chmod, cp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const framework = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--out' || !args[1]) throw new Error('Usage: node authoring-harness-fixture.mjs --out NEW_DIRECTORY');
const directory = path.resolve(args[1]);
await mkdir(path.dirname(directory), { recursive: true });
await mkdir(directory); // Never replace an earlier trial or its receipts.
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|TOKEN|SECRET|PROVIDER/i.test(key))), npm_config_cache: path.join(directory, 'npm-cache') };
const run = (command, args, cwd = directory) => execFileSync(command, args, { cwd, env, encoding: 'utf8' });
const [pack] = JSON.parse(run('npm', ['pack', framework, '--ignore-scripts', '--pack-destination', directory, '--json']));
const consumer = path.join(directory, 'consumer'), installed = path.join(consumer, 'node_modules/@shoalrun/cli');
await mkdir(installed, { recursive: true });
run('tar', ['-xzf', path.join(directory, pack.filename), '--strip-components=1', '-C', installed]);
await symlink(path.join(framework, 'node_modules'), path.join(installed, 'node_modules'));
await mkdir(path.join(consumer, 'node_modules/.bin'));
const manifest = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
// Raw tar extraction does not run npm's executable-bin setup. Emulate that
// installation step rather than making the author repair fixture permissions.
await chmod(path.join(installed, manifest.bin.shoalrun), 0o755);
await symlink(path.join(installed, manifest.bin.shoalrun), path.join(consumer, 'node_modules/.bin/shoalrun'));
run(process.execPath, [path.join(installed, manifest.bin.shoalrun), 'init', consumer, '--starter', 'minimal']);
await writeFile(path.join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2) + '\n');
await mkdir(path.join(consumer, '.agents/skills'), { recursive: true });
await cp(path.join(installed, 'skills/shoalrun-author'), path.join(consumer, '.agents/skills/shoalrun-author'), { recursive: true });
for (const folder of ['config', 'scripts', 'guidance', '.shoalrun']) await mkdir(path.join(consumer, folder), { recursive: true });
await writeFile(path.join(consumer, 'AGENTS.md'), `# Consumer authoring policy\n\nRead configured writing guidance and reviewed examples before changing prose.\nPreserve existing page IDs, slugs, access, original dates, comments and unrelated edits.\nSet updated to the actual edit date. Significant procedure revisions require a dated\nchangelog-entry draft, accurate navigation text, and a see-also reading path between\nthe procedure and its changelog. Do not publish the draft or claim a package release.\nUse existing configured check commands under the harness's permissions.\nThe local CLI is node_modules/.bin/shoalrun. No additional authoring provider key is needed.\n`);
await writeFile(path.join(consumer, 'guidance/writing.md'), `# Writing guidance\n\nWrite for an author who can edit a file and run a terminal command. Use a how-to\nfor a concrete task. State the starting directory, prerequisites, actions, expected\noutput and final check. Use short titled steps when titles help; do not repeat\nstep numbers in titles. Preserve accurate command flags and supported facts.\nDo not turn missing evidence into promises about releases or reader experience.\n`);
await writeFile(path.join(consumer, 'content/reviewed-example.mdx'), `---\nid: guide.reviewed-example\ntitle: Inspect a build\nsummary: Check generated HTML and Markdown in a dedicated output directory.\ntype: how-to\nslug: /inspect\nupdated: 2026-09-28\n---\n\nRun the project build from the project root before inspecting its output.\n\n<Steps>\n<Step title="Read the HTML">\n\nOpen the page's HTML in the dedicated build output. Check links and the procedure.\n\n</Step>\n<Step title="Read the Markdown">\n\nOpen its Markdown twin. Confirm the same actions and examples appear in order.\n\n</Step>\n</Steps>\n`);
await writeFile(path.join(consumer, 'content/prepare.mdx'), `---\nid: guide.prepare\ntitle: Prepare a documentation change\nsummary: Prepare a page and inspect a documentation build.\ntype: how-to\nslug: /prepare\ndate: 2026-09-20\nupdated: 2026-09-28\naccess: { policy: public }\n---\n\nWork from this documentation project's root. Node.js 22.12 or newer is required.\n\n<Step title="Prepare the page">\n\nWrite the procedure in MDX. The steps need work.\n\n</Step>\n\n## Inspect the result\n\nAfter review, build published content to a dedicated directory:\n\n\`\`\`sh\nnode scripts/build-site.mjs --out .shoalrun/site\n\`\`\`\n\nRead the generated HTML and Markdown. The normal build excludes unpublished drafts.\nDo not change access merely to clear a check.\n\n## Related reading\n\n<RelatedReading />\n`);
await writeFile(path.join(consumer, 'content/local-notes.mdx'), `---\nid: guide.local-notes\ntitle: Local notes\nsummary: Earlier local edits outside this task.\nslug: /local-notes\n---\n\nEarlier author note: preserve this paragraph byte for byte.\n`);
await writeFile(path.join(consumer, 'config/nav.yaml'), `# Keep the existing welcome label and comment.\n- { id: welcome, doc: guide.welcome, label: Handbook }\n- { id: install, doc: guide.install }\n- { id: inspect, doc: guide.reviewed-example }\n- { id: prepare, doc: guide.prepare, label: Prepare }\n`);
await writeFile(path.join(consumer, 'config/relationships.yaml'), `# Existing reading path; retain it.\n- { id: prepare-inspect, from: guide.prepare, to: guide.reviewed-example, type: next-step, reason: Inspect both representations., order: 10 }\n`);
await writeFile(path.join(consumer, 'scripts/build-site.mjs'), `import { compile } from '@shoalrun/cli/authoring';\nconst args = process.argv.slice(2);\nif (args.length !== 2 || args[0] !== '--out' || !args[1]) throw new Error('Usage: node scripts/build-site.mjs --out DIRECTORY');\nconst result = await compile('docs.config.yaml', args[1]);\nconsole.log(JSON.stringify({ documents: result.documents.length, output: args[1] }));\n`);
await writeFile(path.join(consumer, 'scripts/check-procedure.mjs'), `import assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\nimport path from 'node:path';\nconst site = process.env.SHOALRUN_VALIDATION_SITE;\nassert.ok(site, 'Run this check through snapshot validation.');\nconst manifest = JSON.parse(await readFile(path.join(site, 'documents.json'), 'utf8'));\nconst procedure = manifest.documents.find(page => page.id === 'guide.prepare');\nassert.ok(procedure, 'The procedure must render.');\nconst markdown = await readFile(path.join(site, procedure.markdownUrl), 'utf8');\nassert.ok(markdown.includes('node scripts/build-site.mjs --out .shoalrun/site'), 'Preserve the actual project build command.');\nassert.ok(markdown.includes('Node.js 22.12'), 'Preserve the Node prerequisite.');\nconsole.log('Procedure prerequisite and project command preserved.');\n`);
let config = await readFile(path.join(consumer, 'docs.config.yaml'), 'utf8');
config = config.replace(/navigation:[\s\S]*/, `navigation: { $include: ./config/nav.yaml }\nrelationships: { $include: ./config/relationships.yaml }\nauthoring:\n  directives: Read AGENTS.md for companion policy; verify project commands against scripts/build-site.mjs.\n  guideFiles: [guidance/writing.md]\n  exemplarFiles: [content/reviewed-example.mdx]\n  pageSources:\n    guide.prepare: [scripts/build-site.mjs]\naudit:\n  tests:\n    - id: procedure-contract\n      run: [node, scripts/check-procedure.mjs]\n`);
await writeFile(path.join(consumer, 'docs.config.yaml'), config);
const seed = { schemaVersion: 1, package: manifest.name, packageVersion: manifest.version, packageSha256: createHash('sha256').update(await readFile(path.join(directory, pack.filename))).digest('hex'), dependencies: 'Shared installed framework dependencies; not a clean install.', earlierEdit: 'content/local-notes.mdx', earlierEditSha256: createHash('sha256').update(await readFile(path.join(consumer, 'content/local-notes.mdx'))).digest('hex'), consumer, skill: path.join(consumer, '.agents/skills/shoalrun-author/SKILL.md'), cli: path.join(consumer, 'node_modules/.bin/shoalrun') };
await writeFile(path.join(directory, 'fixture.json'), JSON.stringify(seed, null, 2) + '\n');
await cp(consumer, path.join(directory, 'before'), { recursive: true, filter: file => !path.relative(consumer, file).split(path.sep).some(segment => ['node_modules', '.shoalrun'].includes(segment)) });
console.log(JSON.stringify(seed, null, 2));
