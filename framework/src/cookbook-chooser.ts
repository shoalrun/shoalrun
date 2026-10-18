import type { Document } from './content.js';

type Option = { id: string; label: string; doc: string; when?: string; needs?: string; outcome?: string };
export type Cookbook = { title: string; options: Option[]; mode?: 'single' | 'multiple' };
export type Cookbooks = Record<string, Cookbook>;

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
const validId = (value: unknown) => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
const nonempty = (value: unknown) => typeof value === 'string' && !!value.trim();

export function validateCookbooks(value: unknown, file: string): Cookbooks {
  if (value === undefined) return {};
  if (!object(value)) throw new Error(`${file}: cookbooks must be a mapping`);
  const result: Cookbooks = {};
  for (const [id, raw] of Object.entries(value)) {
    const prefix = `${file}: cookbooks.${id}`;
    if (!validId(id) || !object(raw) || !keys(raw, ['title', 'options', 'mode']) || !nonempty(raw.title)) throw new Error(`${prefix} needs a kebab-case ID, title, and options`);
    if (raw.mode !== undefined && !['single', 'multiple'].includes(raw.mode as string)) throw new Error(`${prefix}.mode must be single or multiple`);
    if (!Array.isArray(raw.options) || !raw.options.length || raw.options.some(option => !object(option) || !keys(option, ['id', 'label', 'doc', 'when', 'needs', 'outcome']) || !validId(option.id) || !nonempty(option.label) || !nonempty(option.doc) || ['when', 'needs', 'outcome'].some(key => option[key] !== undefined && !nonempty(option[key])))) throw new Error(`${prefix}.options needs an ID, label, and recipe document ID for each choice; when, needs, and outcome must be nonempty text`);
    const options = raw.options as Option[];
    const optionIds = new Set(options.map(option => option.id));
    if (optionIds.size !== options.length) throw new Error(`${prefix}.options repeats an ID`);
    if (new Set(options.map(option => option.label.trim().toLowerCase())).size !== options.length) throw new Error(`${prefix}.options repeats a label`);
    if (new Set(options.map(option => option.doc)).size !== options.length) throw new Error(`${prefix}.options repeats a recipe target`);
    result[id] = { title: raw.title as string, options, ...(raw.mode ? { mode: raw.mode as 'single' | 'multiple' } : {}) };
  }
  return result;
}

export function cookbookChooserComponent(node: any, file: string): any {
  const attributes = node.attributes ?? [];
  if (node.type !== 'mdxJsxFlowElement' || node.children?.length || attributes.length !== 1 || attributes[0].type !== 'mdxJsxAttribute' || attributes[0].name !== 'id' || !nonempty(attributes[0].value)) throw new Error(`${file}: <CookbookChooser> needs only a literal id and no content`);
  return { type: 'docCookbookChooser', id: attributes[0].value, sourceFile: file };
}

export function resolveCookbookTree(tree: any, current: Document, documents: Map<string, Document>, cookbooks: Cookbooks, targets: string[]): any {
  const sameVariant = (a: Document, b: Document) => a.variant.channel === b.variant.channel && a.variant.version === b.variant.version && a.variant.language === b.variant.language;
  const walk = (node: any): any => {
    if (node.type !== 'docCookbookChooser') return node.children ? { ...node, children: node.children.map(walk) } : node;
    const cookbook = cookbooks[node.id];
    if (!cookbook) throw new Error(`${node.sourceFile}: unknown cookbook ${node.id}`);
    const options = cookbook.options.map(option => {
      const doc = [...documents.values()].find(candidate => candidate.frontmatter.id === option.doc && sameVariant(candidate, current));
      if (!doc || doc.frontmatter.type !== 'recipe') throw new Error(`${node.sourceFile}: cookbook ${node.id} target ${option.doc} needs a published recipe in this publication`);
      if (!targets.includes(option.doc)) targets.push(option.doc);
      return { ...option, title: doc.frontmatter.title, summary: doc.frontmatter.summary, route: doc.route, markdownRoute: doc.markdownRoute };
    });
    return { type: 'docCookbookChooser', id: node.id, mode: cookbook.mode ?? 'multiple', title: cookbook.title, options };
  };
  return walk(tree);
}
