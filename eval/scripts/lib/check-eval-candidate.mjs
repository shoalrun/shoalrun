import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { compile } from '../../../framework/dist/compiler.js';
const YAML = createRequire(new URL('../../../framework/package.json', import.meta.url))('yaml');

// Render an isolated PUBLIC validation copy. The model's actual draft and its
// access metadata are unchanged. A build that excludes the draft is no evidence
// that its MDX rendered successfully.
export async function checkEvalCandidate(repo, candidate, destination, options = {}) {
  await cp(path.join(repo, 'framework/example-configs/minimal'), destination, { recursive: true });
  const source = await readFile(candidate, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error('Candidate has no complete frontmatter');
  const metadata = YAML.parse(match[1]);
  metadata.access = { ...metadata.access, policy: 'public' };
  const body = source.slice(match[0].length);
  const placeholders = [...body.matchAll(/\[\[TODO:([\s\S]*?)\]\]/g)];
  const validationBody = body.replace(/\[\[TODO:([\s\S]*?)\]\]/g, (_marker, text) => `Unresolved fact for review:${text}`);
  await writeFile(path.join(destination, 'content/welcome.mdx'), `---\n${YAML.stringify(metadata)}---\n${validationBody}`);
  // Exemplar links can point to actual site pages absent from the minimal
  // fixture. Permit only IDs in the real site's manifest; never invent a target
  // for an unknown model-authored link.
  const valid = new Set(options.documentIds ?? JSON.parse(await readFile(path.join(repo, 'framework/agent-docs/documents.json'), 'utf8')).documents.map(d => d.id));
  const links = [...new Set([...source.matchAll(/doc:([\w.-]+)/g)].map(m => m[1]))];
  let at = 0;
  for (const id of links) if (valid.has(id) && !['guide.welcome', 'guide.install'].includes(id)) {
    await writeFile(path.join(destination, 'content', `link-${at++}.mdx`), `---\nid: ${id}\ntitle: Evaluation link target\nsummary: Valid site ID represented only for link validation.\ntype: reference\nslug: /evaluation-link/${id}\nchannel: production\nversion: current\nlanguage: en\naccess: { policy: public }\n---\n\nLink validation placeholder, not factual evidence.\n`);
  }
  await mkdir(path.join(destination, 'output'), { recursive: true });
  const built = await compile(path.join(destination, 'docs.config.yaml'), path.join(destination, 'output'));
  const page = built.documents.find(d => d.id === metadata.id);
  if (!page) throw new Error('The validation build did not include the candidate page');
  return { status: 'ok', candidateRendered: true, documents: built.documents.length, validationOnlyAccessOverride: true, validationOnlyPlaceholderMarkersConverted: placeholders.length, publicationPlaceholderGateClear: placeholders.length === 0 };
}
