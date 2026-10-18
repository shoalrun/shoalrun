import { builtinComponentNames } from './component-names.js';
/** The supported component-authoring API. No compiler or filesystem dependencies. */
export const componentApiVersion = 1;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Attribute =
  | { type: 'string'; required?: boolean; default?: string; values?: string[] }
  | { type: 'boolean'; required?: boolean; default?: boolean }
  | { type: 'number'; required?: boolean; default?: number; min?: number; max?: number; integer?: boolean };
type AttributeTypes = { string: string; boolean: boolean; number: number };
type AttributeValue<A extends Attribute> = AttributeTypes[A['type']];
export type AttributeValues<A extends Record<string, Attribute>> = { readonly [K in keyof A]: AttributeValue<A[K]> | (A[K] extends { required: true } | { default: string | boolean | number } ? never : undefined) };
export type ComponentOutput = Content | Content[] | { content: Content | Content[]; data?: JsonValue };
export interface ComponentDefinition<A extends Record<string, Attribute> = Record<string, Attribute>> {
  attributes?: A;
  children?: 'none' | 'optional' | 'required';
  /** Required shared documentation; browser behavior never replaces this contract. */
  content(input: { attributes: AttributeValues<A>; children: Content }): ComponentOutput;
}
export function defineComponent<const A extends Record<string, Attribute> = {}>(definition: ComponentDefinition<A>): ComponentDefinition<A> { return definition; }

const brand = Symbol.for('shoalrun.content.v1');
export interface Content { readonly [brand]: true }
type Node = { type: string; [key: string]: any };
type Value = Content & { nodes: Node[] };
const wrap = (nodes: Node[]): Content => ({ [brand]: true, nodes }) as Value;
const nodes = (value: unknown): Node[] => {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || !(value as Content)[brand] || !Array.isArray((value as Value).nodes)) throw new Error('content() must return content helpers or its supplied children; raw HTML and compiler node objects are unsupported');
  return (value as Value).nodes;
};
const inline = (values: Array<string | Content>) => values.flatMap(value => {
  if (typeof value === 'string') return [{ type: 'text', value }];
  const result = nodes(value);
  if (result.some(node => !['text', 'strong', 'emphasis', 'delete', 'inlineCode', 'link', 'image', 'break', 'footnoteReference'].includes(node.type))) throw new Error('This content helper needs inline text, links, or formatting, not block content');
  return result;
});

/** Helpers build shared documentation, without exposing Markdown/MDX AST shapes. */
export const content = {
  text: (value: string): Content => wrap([{ type: 'text', value }]),
  paragraph: (...values: Array<string | Content>): Content => wrap([{ type: 'paragraph', children: inline(values) }]),
  strong: (...values: Array<string | Content>): Content => wrap([{ type: 'strong', children: inline(values) }]),
  emphasis: (...values: Array<string | Content>): Content => wrap([{ type: 'emphasis', children: inline(values) }]),
  inlineCode: (value: string): Content => wrap([{ type: 'inlineCode', value }]),
  code: (value: string, language = 'text'): Content => wrap([{ type: 'code', value, lang: language }]),
  heading: (title: string, depth: 2 | 3 | 4 | 5 | 6 = 2): Content => wrap([{ type: 'heading', depth, children: [{ type: 'text', value: title }] }]),
  link: (label: string, url: string): Content => wrap([{ type: 'link', url, children: [{ type: 'text', value: label }] }]),
  group: (...values: Content[]): Content => wrap(values.flatMap(nodes)),
  list: (items: Content[], ordered = false): Content => wrap([{ type: 'list', ordered, children: items.map(item => ({ type: 'listItem', spread: true, children: nodes(item) })) }]),
  table: (headers: Array<string | Content>, rows: Array<Array<string | Content>>): Content => {
    if (!headers.length || rows.some(row => row.length !== headers.length)) throw new Error('content.table needs headers and rows with matching column counts');
    return wrap([{ type: 'table', align: headers.map(() => null), children: [headers, ...rows].map(row => ({ type: 'tableRow', children: row.map(cell => ({ type: 'tableCell', children: inline([cell]) })) })) }]);
  },
  /** Compose an existing Shoalrun component using its documented attributes. */
  component: (name: string, attributes: Record<string, string | boolean | number>, children: Content[] = []): Content => {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || ['Only', 'ForPublication'].includes(name)) throw new Error('content.component needs a shared Shoalrun component; raw HTML and representation filters are unsupported');
    return wrap([{ type: 'mdxJsxFlowElement', name, attributes: Object.entries(attributes).filter(([, value]) => value !== false || !builtinComponentNames.has(name)).map(([name, value]) => ({ type: 'mdxJsxAttribute', name, value: value === true ? null : String(value) })), children: children.flatMap(nodes) }]);
  }
};

// Internal bridge. Component authors use content helpers, not compiler nodes.
export const componentContent = { wrap, nodes };
