import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { loadConfig } from './config.js';
import { defaultLanguage } from './frontmatter.js';
import { ingredientWorkflow, workflowValues } from './ingredient-workflow.js';

type RecipeSpec = {
  schemaVersion: 1;
  id: string;
  title: string;
  summary: string;
  slug: string;
  ingredients: string[];
  inputs?: Record<string, string>;
  outcome?: string;
};

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function parseYaml(source: string, file: string): unknown {
  const document = YAML.parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) throw new Error(`${file}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS();
}

function parseSpec(value: unknown): RecipeSpec {
  if (!object(value) || value.schemaVersion !== 1 || Object.keys(value).some(key => !['schemaVersion', 'id', 'title', 'summary', 'slug', 'ingredients', 'inputs', 'outcome'].includes(key))) throw new Error('Recipe spec needs schemaVersion: 1 and only supported fields');
  workflowValues(value.inputs, 'Recipe inputs');
  if (value.outcome !== undefined && (typeof value.outcome !== 'string' || !value.outcome.trim())) throw new Error('Recipe outcome must be nonempty text');
  for (const field of ['id', 'title', 'summary', 'slug']) if (typeof value[field] !== 'string' || !value[field].trim()) throw new Error(`Recipe spec needs ${field}`);
  if (!/^\/[a-z0-9/-]+$/.test(value.slug as string) || (value.slug as string).includes('//')) throw new Error('Recipe slug must be a lowercase absolute path');
  if (!Array.isArray(value.ingredients) || !value.ingredients.length || value.ingredients.some(item => typeof item !== 'string' || !item.trim())) throw new Error('Recipe spec needs an ordered list of ingredient files');
  return value as RecipeSpec;
}

function parseIngredient(source: string, file: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source);
  if (!match) throw new Error(`${file}: ingredient needs YAML frontmatter and a body`);
  const header = parseYaml(match[1], file);
  if (!object(header) || header.type !== 'ingredient' || typeof header.id !== 'string' || !header.id.trim() || typeof header.title !== 'string' || !header.title.trim()) throw new Error(`${file}: ingredient needs type: ingredient, id, and title`);
  if (!match[2].trim()) throw new Error(`${file}: ingredient body is empty`);
  return { header, body: match[2].trim() };
}

function nestHeadings(body: string): string {
  const lines = body.split('\n');
  const tree = unified().use(remarkParse).use(remarkMdx).parse(body);
  for (const node of tree.children) {
    if (node.type !== 'heading' || node.depth < 2 || node.depth > 5 || !node.position) continue;
    const line = node.position.start.line - 1;
    lines[line] = lines[line].replace(new RegExp(`^#{${node.depth}}(?=\\s)`), '#'.repeat(node.depth + 1));
  }
  return lines.join('\n');
}

export async function renderRecipeDraft(configFile: string, specFile: string) {
  const configPath = path.resolve(configFile);
  const root = path.dirname(configPath);
  const config: any = (await loadConfig(configPath)).value;
  const spec = parseSpec(parseYaml(await readFile(specFile, 'utf8'), specFile));
  const defaults = config.publications?.defaults ?? {};
  if (!defaults.channel || !defaults.version) throw new Error('Recipe draft needs a default channel and version');
  const language = defaults.language ?? defaultLanguage(config);
  const seen = new Set<string>();
  const operations = new Set<string>();
  const sources: string[] = [];
  const sections: string[] = [];
  const available = new Map(Object.keys(spec.inputs ?? {}).map(name => [name, 'Before you start']));
  const prerequisites = new Set<string>();
  for (const ingredientPath of spec.ingredients) {
    const file = await realpath(path.resolve(path.dirname(specFile), ingredientPath));
    const relative = path.relative(root, file);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Ingredient file must be inside the project: ${ingredientPath}`);
    const source = await readFile(file, 'utf8');
    const { header, body } = parseIngredient(source, file);
    if (seen.has(header.id as string)) throw new Error(`Recipe repeats ingredient ${header.id}`);
    seen.add(header.id as string);
    const workflow = ingredientWorkflow(header.workflow, `Ingredient ${header.id} workflow`);
    const handoffs: string[] = [];
    if (workflow) {
      for (const [name, description] of Object.entries(workflow.inputs)) {
        const producer = available.get(name);
        if (!producer) throw new Error(`Ingredient ${header.id} needs ${name}; declare it in recipe inputs or produce it in an earlier ingredient`);
        handoffs.push(`- Use \`${name}\` from **${producer}**: ${description}`);
      }
      for (const name of Object.keys(workflow.outputs)) {
        if (available.has(name)) throw new Error(`Ingredient ${header.id} repeats output ${name}; use a distinct value name`);
        available.set(name, header.title as string);
      }
      for (const prerequisite of workflow.prerequisites) prerequisites.add(prerequisite);
    }
    if (header.channel !== defaults.channel || header.version !== defaults.version || header.language !== language) throw new Error(`Ingredient ${header.id} must match the recipe's default publication`);
    if (header.operations !== undefined) {
      if (!Array.isArray(header.operations) || header.operations.some(value => typeof value !== 'string')) throw new Error(`Ingredient ${header.id} has invalid operations`);
      for (const operation of header.operations) operations.add(operation as string);
    }
    sources.push(`${relative}\n${source}`);
    const nestedBody = nestHeadings(body);
    sections.push(workflow
      ? [`## ${header.title}`, handoffs.join('\n'), nestedBody, ...Object.entries(workflow.outputs).map(([name, description]) => `Save \`${name}\`: ${description}`), `**Continue when:** ${workflow.check}`].filter(Boolean).join('\n\n')
      : `## ${header.title}\n\n> Ingredient: \`${header.id}\` from \`${relative}\`. Review how it connects to the other steps.\n\n${nestedBody}`);
  }
  const header = {
    id: spec.id, title: spec.title, summary: spec.summary, type: 'recipe', slug: spec.slug,
    channel: defaults.channel, version: defaults.version, language,
    ...(operations.size ? { operations: [...operations] } : {}), access: { policy: 'draft' }
  };
  const sourceDigest = digest([JSON.stringify(spec), ...sources].join('\n'));
  const body = [
    `> Assembled draft from ${spec.ingredients.length} configured ingredient${spec.ingredients.length === 1 ? '' : 's'} (${sourceDigest.slice(0, 12)}). Review the complete workflow before publishing.`,
    spec.summary,
    '## Before you start',
    Object.keys(spec.inputs ?? {}).length || prerequisites.size
      ? [...Object.entries(spec.inputs ?? {}).map(([name, description]) => `- \`${name}\`: ${description}`), ...[...prerequisites].map(value => `- ${value}`)].join('\n')
      : '[[TODO: Combine the prerequisites for this whole outcome. Remove repeated setup and name the exact starting state.]]',
    ...sections,
    '## Check the outcome',
    spec.outcome ?? '[[TODO: Verify the customer goal end to end, not just each ingredient. Give an observable success value and a first failure check.]]',
    '## Review before publishing',
    '- Confirm ingredient order and that outputs from one step satisfy inputs to the next.\n- Test the complete workflow in a safe environment.\n- Replace TODOs and remove this review section.\n- Inspect both HTML and Markdown output.'
  ].join('\n\n');
  return { content: `---\n${YAML.stringify(header).trimEnd()}\n---\n\n${body}\n`, sourceDigest, ingredients: [...seen] };
}

export async function writeRecipeDraft(configFile: string, specFile: string, outputFile: string, checkOnly = false) {
  const result = await renderRecipeDraft(configFile, specFile);
  const output = path.resolve(outputFile);
  if (checkOnly) {
    const current = await readFile(output, 'utf8').catch(error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    });
    return { status: current === undefined ? 'would-create' : current === result.content ? 'unchanged' : 'would-change', output, ...result };
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, result.content, { flag: 'wx' });
  return { status: 'created', output, sourceDigest: result.sourceDigest, ingredients: result.ingredients };
}
