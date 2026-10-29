import { lowerComponent, type ComponentRegistry } from './component-plugins.js';
import { cardComponent } from './cards.js';
import { cookbookChooserComponent } from './cookbook-chooser.js';
import { calloutIcon, validateLucideIcon } from './icons.js';
import { resolveCalloutTypes, type CalloutTypes } from './callouts.js';
import { resolveBadgeVariants, type BadgeVariants } from './badges.js';
import { apiEmbedComponent } from './api-embeds.js';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import katex from 'katex';
import { SnippetDefinition, SnippetUse, snippetAttribute, resolveSnippetValues } from './snippets.js';
import { frontmatterReference } from './frontmatter.js';
import { validateReaderFilterControl, validateReaderSelection, type ReaderFiltersConfig } from './reader-filters.js';
import { walkthroughComponent } from './walkthrough.js';
import { procedureComponent } from './procedure-components.js';
import type { Document, Variant } from './content-source.js';
import { parsePlainMarkdown, paragraph, link, text } from './semantic-markdown.js';
import { lowerSectionMarkers, sectionIdentities } from './section-identity.js';

type MdxAttribute =
  | { type: 'mdxJsxAttribute'; name: string; value: string | null | Record<string, unknown> }
  | { type: 'mdxJsxExpressionAttribute'; name: string; value: string };

/** Parsed input nodes are checked at the traversal boundary. */
interface MdxInputNode {
  type: string;
  name?: string;
  value?: string | number;
  url?: string;
  lang?: string | null;
  children?: MdxInputNode[];
  attributes?: MdxAttribute[];
  [key: string]: unknown;
}

/** The semantic Markdown tree produced by adapters. */
interface SemanticNode {
  type: string;
  name?: string;
  value?: string | number;
  url?: string;
  lang?: string | null;
  children?: SemanticNode[];
  [key: string]: unknown;
}

interface FileTreeItem {
  kind: string;
  name: string;
  url?: string;
  icon?: string;
  children: FileTreeItem[];
  collapsed: boolean;
}

interface MdxRoot {
  type: 'root';
  children: unknown[];
}

function isMdxRoot(tree: unknown): tree is MdxRoot {
  return !!tree && typeof tree === 'object'
    && (tree as { type?: unknown }).type === 'root'
    && Array.isArray((tree as { children?: unknown }).children);
}

function isMdxInputNode(value: unknown): value is MdxInputNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const node = value as Record<string, unknown>;
  if (typeof node.type !== 'string') return false;
  if (node.name !== undefined && typeof node.name !== 'string') return false;
  if (node.value !== undefined && typeof node.value !== 'string' && typeof node.value !== 'number') return false;
  if (node.url !== undefined && typeof node.url !== 'string') return false;
  if (node.lang !== undefined && node.lang !== null && typeof node.lang !== 'string') return false;
  if (node.children !== undefined && (!Array.isArray(node.children) || !node.children.every(isMdxInputNode))) return false;
  if (node.attributes !== undefined && (!Array.isArray(node.attributes) || !node.attributes.every(isMdxAttribute))) return false;
  return true;
}

function isMdxAttribute(value: unknown): value is MdxAttribute {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (typeof item.name !== 'string') return false;
  if (item.type === 'mdxJsxAttribute') {
    return typeof item.value === 'string' || item.value === null
      || !!item.value && typeof item.value === 'object' && !Array.isArray(item.value);
  }
  return item.type === 'mdxJsxExpressionAttribute' && typeof item.value === 'string';
}

function literalAttributes(attributes: MdxAttribute[]): attributes is Array<MdxAttribute & { value: string }> {
  return attributes.every(item => item.type === 'mdxJsxAttribute' && typeof item.value === 'string');
}

export function transformMdx(tree: unknown, current: Document, registry: Map<string, Document>, snippets: Map<string, SnippetDefinition> = new Map(), projectValues: Record<string, unknown> = {}, uses: SnippetUse[] = [], calloutTypes: CalloutTypes = resolveCalloutTypes(undefined, current.file), projectRoot?: string, readerConfig?: ReaderFiltersConfig, frontmatterConfig: unknown = {}, publicationConfig?: { channels: Record<string, unknown>; versions: Record<string, unknown> }, badgeVariants: BadgeVariants = resolveBadgeVariants(undefined, current.file), componentPlugins: ComponentRegistry = new Map()): unknown {
  if (!isMdxRoot(tree)) throw new Error(`${current.file}: parsed content must be a root with children`);
  tree = lowerSectionMarkers(tree, current.file);
  let pluginDepth = 0;
  let tabsIndex = 0;
  let walkthroughIndex = 0;
  const imageReferences = new Map<string, Set<string>>();
  const collectImageReferences = (value: unknown, file: string) => {
    const references = new Set<string>();
    const visit = (node: unknown) => {
      if (!isMdxInputNode(node)) return;
      if (node.type === 'imageReference' && typeof node.identifier === 'string') references.add(node.identifier);
      node.children?.forEach(visit);
    };
    visit(value);
    imageReferences.set(file, references);
  };
  collectImageReferences(tree, current.file);
  for (const snippet of snippets.values()) collectImageReferences(snippet.tree, snippet.file);
  function attr(node: { name?: string; attributes?: MdxAttribute[] }, key: string): string {
    const item = node.attributes?.find(x => x.name === key);
    if (!item || typeof item.value !== 'string') throw new Error(`${current.file}: <${node.name}> needs literal ${key}`);
    return item.value;
  }
  const childrenOf = (nodes: unknown[], scope: Record<string, unknown>, stack: string[], sourceFile: string): SemanticNode[] => nodes.flatMap(node => {
    const result = walk(node, scope, stack, sourceFile);
    return result === null ? [] : Array.isArray(result) ? result : [result];
  });
  function walk(input: unknown, scope: Record<string, unknown>, stack: string[], sourceFile: string): SemanticNode | SemanticNode[] | null {
    if (!isMdxInputNode(input)) throw new Error(`${sourceFile}: parsed content has an invalid node`);
    const node = input;
    if (node.type === 'mdxjsEsm' && /^import\s+/.test(String(node.value ?? ''))) return null;
    if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression' || node.type === 'mdxjsEsm') throw new Error(`${sourceFile}: dynamic MDX expression has no semantic adapter`);
    if (node.type === 'heading' && stack.length) throw new Error(`${sourceFile}: snippet headings need an anchor adapter; put headings in the page`);
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      if (node.name === 'Anchor') throw new Error(`${sourceFile}: <Anchor> must be the single trailing marker of an authored root level-two heading`);
      if (node.name && componentPlugins.has(node.name)) {
        const start = (node.position as any)?.start;
        const location = `${sourceFile}${start ? `:${start.line}:${start.column}` : ''}: <${node.name}>`;
        if (++pluginDepth > 32) throw new Error(`${location}: component lowering exceeded 32 nested expansions`);
        try {
          const result = lowerComponent(node, componentPlugins, location);
          const children = childrenOf(result.nodes, scope, stack, sourceFile);
          const browser = componentPlugins.get(node.name)!.browser;
          if (browser && node.type !== 'mdxJsxFlowElement') throw new Error(`${location}: browser-enhanced components must be block elements`);
          return browser ? { type: 'docComponent', name: node.name, browser, componentData: result.data, children } : children;
        } catch (error) {
          const message = (error as Error).message;
          if (message.startsWith(location)) throw error;
          throw new Error(`${location}: ${message}`);
        }
        finally { pluginDepth--; }
      }
      if (node.name === 'FrontmatterReference') {
        if (node.type !== 'mdxJsxFlowElement' || node.children?.length || node.attributes?.length) throw new Error(`${sourceFile}: <FrontmatterReference> must be an empty block`);
        return childrenOf(parsePlainMarkdown(frontmatterReference(frontmatterConfig, true)), scope, stack, sourceFile);
      }
      if (node.name === 'ForPublication') {
        const attributes = node.attributes ?? [];
        const allowed = ['channel', 'version', 'language'];
        if (node.type !== 'mdxJsxFlowElement' || !node.children?.length || !attributes.length || !literalAttributes(attributes) || attributes.some((item) => !allowed.includes(item.name) || !item.value.trim()) || new Set(attributes.map((item) => item.name)).size !== attributes.length) {
          throw new Error(`${sourceFile}: <ForPublication> needs block content and distinct literal channel, version, or language attributes`);
        }
        for (const item of attributes) if ((item.name === 'channel' || item.name === 'version') && publicationConfig && !Object.hasOwn(publicationConfig[item.name === 'channel' ? 'channels' : 'versions'], item.value)) {
          throw new Error(`${sourceFile}: <ForPublication> names unknown ${item.name} ${item.value}`);
        }
        if (attributes.some((item) => current.variant[item.name as keyof Variant] !== item.value)) return [];
        return childrenOf(node.children, scope, stack, sourceFile);
      }
      if (node.name === 'ReaderSection' || node.name === 'ReaderChoice' || node.name === 'ReaderFilter') {
        if (!readerConfig || node.type !== 'mdxJsxFlowElement') throw new Error(`${sourceFile}: <${node.name}> needs configured readerFilters and a block element`);
        const attributes = node.attributes ?? [];
        if (!literalAttributes(attributes) || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <${node.name}> needs distinct literal attributes`);
        if (node.name === 'ReaderFilter') {
          if (node.children?.length) throw new Error(`${sourceFile}: <ReaderFilter> cannot contain content`);
          const control = validateReaderFilterControl(Object.fromEntries(attributes.map((item) => [item.name, item.value])), readerConfig, `${sourceFile}: <ReaderFilter>`, true);
          return { type: 'docReaderFilter', control };
        }
        const labels = attributes.filter((item) => item.name === 'label');
        if (node.name === 'ReaderSection' && (labels.length || !node.children?.length)) throw new Error(`${sourceFile}: <ReaderSection> needs content and only configured filter attributes`);
        if (node.name === 'ReaderChoice' && (node.children?.length || labels.length !== 1 || !labels[0].value.trim())) throw new Error(`${sourceFile}: <ReaderChoice> needs a label and no child content`);
        const choiceScope = attributes.find((item) => item.name === 'scope')?.value ?? 'site';
        if (node.name === 'ReaderChoice' && !['site', 'page'].includes(choiceScope)) throw new Error(`${sourceFile}: <ReaderChoice> scope must be site or page`);
        const choices = Object.fromEntries(attributes.filter((item) => item.name !== 'label' && (node.name !== 'ReaderChoice' || item.name !== 'scope')).map((item) => [item.name, item.value.split(',').map((value: string) => value.trim())]));
        const selection = validateReaderSelection(choices, readerConfig, `${sourceFile}: <${node.name}>`);
        if (!Object.keys(selection).length) throw new Error(`${sourceFile}: <${node.name}> needs at least one filter choice`);
        const description = Object.entries(selection).map(([facet, values]) => `${readerConfig.facets[facet].label}: ${values.map(value => readerConfig.facets[facet].options[value]).join(' or ')}`).join('; ');
        const children = node.name === 'ReaderSection' ? childrenOf(node.children ?? [], scope, stack, sourceFile) : [];
        const containsSection = (item: SemanticNode): boolean => item.type === 'docReaderSection' || (item.children ?? []).some(containsSection);
        if (children.some(containsSection)) throw new Error(`${sourceFile}: <ReaderSection> cannot contain another <ReaderSection>`);
        return node.name === 'ReaderSection'
          ? { type: 'docReaderSection', selection, description, children }
          : { type: 'docReaderChoice', selection, label: labels[0].value, route: current.route, scope: choiceScope };
      }
      if (node.name === 'Only') {
        if (node.type !== 'mdxJsxFlowElement' || (node.attributes ?? []).length !== 1 || node.attributes?.[0]?.name !== 'format' || !node.children?.length) throw new Error(`${sourceFile}: <Only> needs block content and one format attribute`);
        const format = attr(node, 'format');
        if (format !== 'html' && format !== 'markdown') throw new Error(`${sourceFile}: <Only> format must be html or markdown`);
        return { type: 'docRepresentation', representation: format, children: childrenOf(node.children, scope, stack, sourceFile) };
      }
      if (node.name === 'Badge') {
        const attributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxTextElement' || attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['variant', 'icon'].includes(item.name) || typeof item.value !== 'string') || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Badge> needs inline text and literal variant or icon attributes`);
        const variant = attributes.some((item) => item.name === 'variant') ? attr(node, 'variant') : 'neutral';
        if (!badgeVariants.has(variant)) throw new Error(`${sourceFile}: unknown <Badge> variant "${variant}"; register it in badges.variants`);
        const icon = attributes.some((item) => item.name === 'icon') ? attr(node, 'icon') : undefined;
        if (icon) validateLucideIcon(icon, sourceFile, 'Badge icon');
        const children = childrenOf(node.children ?? [], scope, stack, sourceFile);
        if (children.length !== 1 || children[0].type !== 'text' || !String(children[0].value ?? '').trim()) throw new Error(`${sourceFile}: <Badge> needs plain, nonempty inline text`);
        return { type: 'docBadge', variant, icon, label: children[0].value };
      }
      if (node.name === 'Kbd') {
        if (node.type !== 'mdxJsxTextElement' || node.attributes?.length) throw new Error(`${sourceFile}: <Kbd> needs plain inline text without attributes`);
        const children = childrenOf(node.children ?? [], scope, stack, sourceFile);
        if (children.length !== 1 || children[0].type !== 'text' || !String(children[0].value ?? '').trim()) throw new Error(`${sourceFile}: <Kbd> needs nonempty plain text`);
        return { type: 'docKbd', label: children[0].value };
      }
      if (node.name === 'Tooltip' || node.name === 'InfoHint') {
        const attributes = node.attributes ?? [];
        if (node.name === 'InfoHint' && node.type !== 'mdxJsxFlowElement' || attributes.length !== 1 || attributes[0].type !== 'mdxJsxAttribute' || attributes[0].name !== 'label' || typeof attributes[0].value !== 'string' || !attributes[0].value.trim()) throw new Error(`${sourceFile}: <${node.name}> needs a literal label${node.name === 'InfoHint' ? ' and a block element' : ''}`);
        const children = childrenOf(node.children ?? [], scope, stack, sourceFile);
        const definition = children.length === 1 && children[0].type === 'paragraph' ? children[0].children ?? [] : children;
        if (definition.length !== 1 || definition[0].type !== 'text' || !String(definition[0].value ?? '').trim()) throw new Error(`${sourceFile}: <${node.name}> needs one brief plain-text definition`);
        return { type: node.name === 'Tooltip' ? 'docTooltip' : 'docInfoHint', inline: node.type === 'mdxJsxTextElement', label: attributes[0].value.trim(), definition: String(definition[0].value ?? '').trim() };
      }
      if (node.name === 'Progress') {
        const attributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || node.children?.length || attributes.length !== 3 || attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['label', 'value', 'max'].includes(item.name) || typeof item.value !== 'string') || new Set(attributes.map((item) => item.name)).size !== 3) throw new Error(`${sourceFile}: <Progress> needs literal label, value, and max attributes with no body`);
        const label = attr(node, 'label').trim();
        const value = Number(attr(node, 'value'));
        const max = Number(attr(node, 'max'));
        if (!label || !Number.isFinite(value) || !Number.isFinite(max) || value < 0 || max <= 0 || value > max) throw new Error(`${sourceFile}: <Progress> needs a nonempty label and a value from 0 through positive max`);
        return { type: 'docProgress', label, value, max };
      }
      if (node.name === 'Math') {
        const attributes = node.attributes ?? [];
        if (attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['expression', 'display'].includes(item.name)) || new Set(attributes.map((item) => item.name)).size !== attributes.length || node.children?.length) throw new Error(`${sourceFile}: <Math> needs an expression and no child content`);
        const expression = attr(node, 'expression');
        const display = attributes.find((item) => item.name === 'display');
        if (!expression.trim() || (display && display.value !== null)) throw new Error(`${sourceFile}: <Math> needs nonempty expression; display is a bare boolean attribute`);
        if (display && node.type !== 'mdxJsxFlowElement') throw new Error(`${sourceFile}: display <Math> must be a block`);
        try { katex.renderToString(expression, { output: 'mathml', displayMode: !!display, throwOnError: true, strict: 'error', trust: false, maxExpand: 1000 }); }
        catch (error) { throw new Error(`${sourceFile}: invalid <Math> expression: ${(error as Error).message}`); }
        return { type: 'docMath', expression, display: !!display, block: node.type === 'mdxJsxFlowElement' };
      }
      if (node.name === 'ActionLink' || node.name === 'Button') {
        const attributes = node.attributes ?? [];
        if (attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['href', 'doc', 'variant'].includes(item.name) || typeof item.value !== 'string') || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <${node.name}> needs literal href or doc and optional variant`);
        if (Number(attributes.some((item) => item.name === 'href')) + Number(attributes.some((item) => item.name === 'doc')) !== 1) throw new Error(`${sourceFile}: <${node.name}> needs exactly one href or doc`);
        const variant = attributes.some((item) => item.name === 'variant') ? attr(node, 'variant') : 'primary';
        if (!['primary', 'secondary'].includes(variant)) throw new Error(`${sourceFile}: <${node.name}> variant must be primary or secondary`);
        const target = attributes.some((item) => item.name === 'doc') ? registry.get(attr(node, 'doc'))?.route : attr(node, 'href');
        if (!target) throw new Error(`${sourceFile}: <${node.name}> has an unknown or empty destination`);
        if (!/^(?:\/(?!\/)|#|https?:\/\/|mailto:)/i.test(target)) throw new Error(`${sourceFile}: <${node.name}> needs a site path, fragment, HTTP(S), or mailto destination`);
        const children = childrenOf(node.children ?? [], scope, stack, sourceFile);
        if (!children.length || children.some((child) => !['text', 'strong', 'emphasis', 'inlineCode'].includes(child.type))) throw new Error(`${sourceFile}: <${node.name}> needs nonempty inline text`);
        return { type: 'docActionLink', url: target, variant, children };
      }
      if (node.name === 'DefinitionList') {
        const attributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || attributes.some((item) => item.type !== 'mdxJsxAttribute' || item.name !== 'filter' || item.value !== null) || attributes.length > 1 || !node.children?.length) throw new Error(`${sourceFile}: <DefinitionList> only accepts a bare filter attribute and direct <Term> and <Definition> pairs`);
        const directChildren = node.children.flatMap((child) => child.type === 'paragraph' ? child.children ?? [] : [child]).filter((child) => child.type !== 'text' || String(child.value ?? '').trim());
        const items: Array<{ term: SemanticNode[]; definition: SemanticNode[] }> = [];
        for (let index = 0; index < directChildren.length; index += 2) {
          const term = directChildren[index];
          const definition = directChildren[index + 1];
          if (!term || !definition || term.name !== 'Term' || definition.name !== 'Definition' || term.attributes?.length || definition.attributes?.length) throw new Error(`${sourceFile}: <DefinitionList> needs alternating <Term> and <Definition> children without attributes`);
          const termChildren = childrenOf(term.children ?? [], scope, stack, sourceFile);
          const definitionChildren = childrenOf(definition.children ?? [], scope, stack, sourceFile);
          if (!termChildren.length || !definitionChildren.length) throw new Error(`${sourceFile}: <Term> and <Definition> need content`);
          items.push({ term: termChildren, definition: definitionChildren });
        }
        return { type: 'docDefinitionList', filter: attributes.length === 1, items };
      }
      if (node.name === 'Term' || node.name === 'Definition') throw new Error(`${sourceFile}: <${node.name}> must be directly inside <DefinitionList>`);
      if (node.name === 'Steps' || node.name === 'Timeline') return procedureComponent(node, sourceFile, children => childrenOf(children, scope, stack, sourceFile));
      if (node.name === 'Milestone') throw new Error(`${sourceFile}: <Milestone> must be directly inside <Timeline>`);
      if (node.name === 'FileTree' || node.name === 'Tree') {
        const controls = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || controls.length > 1 || controls.some(a => a.type !== 'mdxJsxAttribute' || a.name !== 'controls' || a.value !== null) || !node.children?.length) throw new Error(`${sourceFile}: <${node.name}> accepts a bare controls attribute and direct <Folder> or <File> children`);
        const treeItem = (input: MdxInputNode): FileTreeItem => {
          let item = input;
          if (item.type === 'paragraph' && item.children?.length === 1) item = item.children[0];
          if (item.type !== 'mdxJsxFlowElement' || (!item.name || !['Folder', 'File'].includes(item.name))) throw new Error(`${sourceFile}: <${node.name}> only accepts <Folder> and <File> nodes`);
          const attributes = item.attributes ?? [];
          if (attributes.some((entry) => entry.type !== 'mdxJsxAttribute' || !['name', 'href', 'doc', 'icon', 'collapsed'].includes(entry.name) || (entry.name === 'collapsed' ? item.name !== 'Folder' || entry.value !== null : typeof entry.value !== 'string')) || new Set(attributes.map((entry) => entry.name)).size !== attributes.length) throw new Error(`${sourceFile}: <${item.name}> has an unsupported or duplicate attribute`);
          const name = attr(item, 'name');
          if (!name.trim()) throw new Error(`${sourceFile}: <${item.name}> needs a nonempty name`);
          if (attributes.some((entry) => entry.name === 'href') && attributes.some((entry) => entry.name === 'doc')) throw new Error(`${sourceFile}: <${item.name}> accepts href or doc, not both`);
          const url = attributes.some((entry) => entry.name === 'doc') ? registry.get(attr(item, 'doc'))?.route : attributes.some((entry) => entry.name === 'href') ? attr(item, 'href') : undefined;
          if (attributes.some((entry) => entry.name === 'doc') && !url) throw new Error(`${sourceFile}: <${item.name}> has an unknown doc target`);
          if (url && !/^(?:\/(?!\/)|#|https?:\/\/|mailto:)/i.test(url)) throw new Error(`${sourceFile}: <${item.name}> needs a site path, fragment, HTTP(S), or mailto destination`);
          const icon = attributes.some((entry) => entry.name === 'icon') ? attr(item, 'icon') : undefined;
          if (icon) validateLucideIcon(icon, sourceFile, `${item.name} icon`);
          if (item.name === 'File' && item.children?.length) throw new Error(`${sourceFile}: <File> cannot have children`);
          const children = item.name === 'Folder' ? (item.children ?? []).map(treeItem) : [];
          return { kind: item.name.toLowerCase(), name, url, icon, children, collapsed: attributes.some(a => a.name === 'collapsed') };
        };
        return { type: 'docFileTree', controls: !!controls.length, items: node.children.map(treeItem) };
      }
      if (node.name === 'Folder' || node.name === 'File') throw new Error(`${sourceFile}: <${node.name}> must be inside <FileTree>`);
      if (node.name === 'Table') {
        const attributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['filter', 'sticky'].includes(item.name) || item.value !== null) || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Table> only accepts bare filter and sticky attributes`);
        const children = childrenOf(node.children ?? [], scope, stack, sourceFile);
        if (children.length !== 1 || children[0].type !== 'table') throw new Error(`${sourceFile}: <Table> needs exactly one Markdown table`);
        return { type: 'docTable', filter: attributes.some((item) => item.name === 'filter'), sticky: attributes.some((item) => item.name === 'sticky'), children };
      }
      if (node.name === 'CollapsibleGroup') {
        if (node.type !== 'mdxJsxFlowElement' || node.attributes?.length || !node.children?.length || node.children.some(child => child.type !== 'mdxJsxFlowElement' || child.name !== 'Collapsible')) throw new Error(`${sourceFile}: <CollapsibleGroup> needs direct <Collapsible> children and no attributes`);
        return { type: 'docCollapsibleGroup', children: childrenOf(node.children, scope, stack, sourceFile) };
      }
      if (node.name === 'Collapsible') {
        if (node.type !== 'mdxJsxFlowElement' || !node.children?.length) throw new Error(`${sourceFile}: <${node.name}> needs block content`);
        const attributes = node.attributes ?? [];
        if (attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['title', 'open'].includes(item.name)) || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <${node.name}> only accepts title and open`);
        const title = attr(node, 'title');
        if (!title.trim()) throw new Error(`${sourceFile}: <${node.name}> title must be nonempty text`);
        const open = attributes.find((item) => item.name === 'open');
        if (open && open.value !== null) throw new Error(`${sourceFile}: <${node.name}> open must be a boolean attribute`);
        return { type: 'docCollapsible', title, open: !!open, children: childrenOf(node.children, scope, stack, sourceFile) };
      }
      if (node.name === 'Section') {
        const attributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || !node.children?.length || attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['variant', 'id'].includes(item.name) || typeof item.value !== 'string') || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Section> needs block content and only literal variant and id attributes`);
        if (current.frontmatter.layout !== 'splash') throw new Error(`${sourceFile}: <Section> needs layout: splash in the page frontmatter`);
        const variant = attributes.some((item) => item.name === 'variant') ? attr(node, 'variant').trim() : undefined;
        if (variant !== undefined && !/^[a-z][a-z0-9-]*$/.test(variant)) throw new Error(`${sourceFile}: <Section> variant must be lowercase letters, numbers, and dashes`);
        const sectionId = attributes.some((item) => item.name === 'id') ? attr(node, 'id').trim() : undefined;
        if (sectionId !== undefined && !/^[a-z][a-z0-9-]*$/.test(sectionId)) throw new Error(`${sourceFile}: <Section> id must be lowercase letters, numbers, and dashes`);
        const children = childrenOf(node.children, scope, stack, sourceFile);
        const containsSection = (item: SemanticNode): boolean => item.type === 'docSection' || (item.children ?? []).some(containsSection);
        if (children.some(containsSection)) throw new Error(`${sourceFile}: <Section> cannot contain another <Section>`);
        return { type: 'docSection', variant, sectionId, children };
      }
      if (node.name === 'Hero') {
        const attributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['title', 'tagline', 'align', 'image', 'imageAlt'].includes(item.name) || typeof item.value !== 'string') || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Hero> must be a block on its own lines, with only literal title, tagline, align, image, and imageAlt attributes`);
        if (current.frontmatter.layout !== 'landing' && current.frontmatter.layout !== 'splash') throw new Error(`${sourceFile}: <Hero> needs layout: landing or splash in the page frontmatter`);
        const tagline = attributes.some((item) => item.name === 'tagline') ? attr(node, 'tagline').trim() : '';
        if (!tagline) throw new Error(`${sourceFile}: <Hero> needs a nonempty tagline`);
        const title = attributes.some((item) => item.name === 'title') ? attr(node, 'title').trim() : undefined;
        if (title === '') throw new Error(`${sourceFile}: <Hero> title must be nonempty text`);
        const align = attributes.some((item) => item.name === 'align') ? attr(node, 'align') : 'center';
        if (!['center', 'start'].includes(align)) throw new Error(`${sourceFile}: <Hero> align must be center or start`);
        // Actions are ordinary Markdown links in the body; the first is the primary button. One fenced code block can sit beside the text.
        const links: SemanticNode[] = [];
        const codes: SemanticNode[] = [];
        const collect = (child: SemanticNode): void => {
          if (child.type === 'link') { links.push(child); return; }
          if (child.type === 'code') { codes.push(child); return; }
          if (child.type === 'text' && !String(child.value ?? '').trim()) return;
          if (['paragraph', 'list', 'listItem'].includes(child.type)) return (child.children ?? []).forEach(collect);
          throw new Error(`${sourceFile}: <Hero> body may contain only action links and one code block`);
        };
        childrenOf(node.children ?? [], scope, stack, sourceFile).forEach(collect);
        if (links.length > 3) throw new Error(`${sourceFile}: <Hero> accepts at most three action links`);
        if (codes.length > 1) throw new Error(`${sourceFile}: <Hero> accepts one code block`);
        const hasImage = attributes.some((item) => item.name === 'image');
        const hasAlt = attributes.some((item) => item.name === 'imageAlt');
        if (hasImage !== hasAlt) throw new Error(`${sourceFile}: <Hero> image needs imageAlt, which describes the image or is empty when it is decorative`);
        if (hasImage && codes.length) throw new Error(`${sourceFile}: <Hero> can show an image or a code block, not both`);
        let image: { url: string; alt: string; file?: string } | undefined;
        if (hasImage) {
          const source = attr(node, 'image').trim();
          const alt = attr(node, 'imageAlt').trim();
          if (/^https:\/\//i.test(source)) image = { url: source, alt };
          else {
            if (/^[a-z][a-z0-9+.-]*:/i.test(source) || !/\.(?:png|jpe?g|webp|svg)$/i.test(source)) throw new Error(`${sourceFile}: <Hero> image must be an https URL or a local .png, .jpg, .webp, or .svg file`);
            const file = path.resolve(path.dirname(sourceFile), source);
            if (!existsSync(file)) throw new Error(`${sourceFile}: <Hero> image not found: ${file}`);
            if (!/^[\w.-]+$/.test(path.basename(file))) throw new Error(`${sourceFile}: <Hero> image file name may use only letters, numbers, dots, dashes, and underscores`);
            image = { url: `/assets/pages${current.route === '/' ? '/index' : current.route}/${path.basename(file)}`, alt, file };
          }
        }
        return { type: 'docHero', align, title: title ?? current.frontmatter.title, customTitle: title !== undefined && title !== current.frontmatter.title, tagline, links, image, code: codes[0] };
      }
      if (node.name === 'ThemePreview') {
        if (node.type !== 'mdxJsxFlowElement' || node.children?.length || node.attributes?.length) throw new Error(`${sourceFile}: <ThemePreview /> must be an empty block element with no attributes`);
        return { type: 'themePreview' };
      }
      if (node.name === 'Diagram') {
        const attributes = node.attributes ?? [];
        const allowed = ['title', 'summary', 'engine', 'layout', 'width'];
        if (node.type !== 'mdxJsxFlowElement' || attributes.some((item) => item.type !== 'mdxJsxAttribute' || !allowed.includes(item.name)) || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Diagram> needs a block with only title, summary, engine, layout, and width attributes`);
        const title = attr(node, 'title').trim();
        const summary = attr(node, 'summary').trim();
        const engine = attributes.some((item) => item.name === 'engine') ? attr(node, 'engine') : 'd2';
        const layout = attributes.some((item) => item.name === 'layout') ? attr(node, 'layout') : 'tala';
        const width = attributes.some((item) => item.name === 'width') ? attr(node, 'width') : undefined;
        if (width !== undefined && (!/^[1-9]\d{0,3}$/.test(width) || Number(width) > 4096)) throw new Error(`${sourceFile}: <Diagram> width must be a positive pixel number up to 4096`);
        if (!title || !summary) throw new Error(`${sourceFile}: <Diagram> title and summary must be nonempty text`);
        if (!['d2', 'mermaid'].includes(engine)) throw new Error(`${sourceFile}: <Diagram> engine must be d2 or mermaid`);
        if (engine === 'd2' ? !['tala', 'elk', 'dagre'].includes(layout) : attributes.some((item) => item.name === 'layout')) throw new Error(`${sourceFile}: <Diagram> layout must be tala, elk, or dagre and is only available for D2`);
        const children = childrenOf(node.children ?? [], scope, stack, sourceFile);
        if (children.length !== 1 || children[0].type !== 'code' || children[0].lang !== engine || !String(children[0].value ?? '').trim()) throw new Error(`${sourceFile}: <Diagram> needs exactly one nonempty ${engine} code fence`);
        return { type: 'docDiagram', title, summary, engine, layout, width: width ? Number(width) : undefined, source: children[0].value, file: sourceFile };
      }
      if (node.name === 'Image') {
        const attributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || node.children?.length || attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['src', 'alt', 'width', 'align', 'caption', 'expand'].includes(item.name)) || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Image> must be an empty block with literal src, alt, optional width/align/caption, and a bare expand attribute`);
        if (!attributes.some(a => a.name === 'src' && typeof a.value === 'string') || !attributes.some(a => a.name === 'alt' && typeof a.value === 'string') || attributes.some(a => a.name === 'expand' ? a.value !== null : typeof a.value !== 'string')) throw new Error(`${sourceFile}: <Image> needs literal src/alt, optional width/align/caption, and a bare expand attribute`);
        const source = attr(node, 'src').trim();
        const alt = attr(node, 'alt').trim();
        const width = attributes.some(a => a.name === 'width') ? attr(node, 'width') : undefined;
        if (attributes.some(a => a.name === 'width') && (!/^[1-9]\d{0,3}$/.test(width ?? '') || Number(width) > 4096)) throw new Error(`${sourceFile}: <Image> width must be a positive pixel number up to 4096`);
        let image: { url: string; file?: string };
        if (/^https:\/\//i.test(source)) image = { url: source };
        else {
          if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith('/') || !/\.(?:png|jpe?g|webp|svg)$/i.test(source)) throw new Error(`${sourceFile}: <Image> src must be an https URL or a local .png, .jpg, .webp, or .svg file`);
          const file = path.resolve(path.dirname(sourceFile), source);
          if (!existsSync(file)) throw new Error(`${sourceFile}: <Image> file not found: ${file}`);
          if (!/^[\w.-]+$/.test(path.basename(file))) throw new Error(`${sourceFile}: <Image> file name may use only letters, numbers, dots, dashes, and underscores`);
          image = { url: `/assets/pages${current.route === '/' ? '/index' : current.route}/${path.basename(file)}`, file };
        }
        const align = attributes.some(a => a.name === 'align') ? attr(node, 'align') : undefined;
        if (attributes.some(a => a.name === 'align') && !['left', 'center', 'right'].includes(align ?? '')) throw new Error(`${sourceFile}: <Image> align must be left, center, or right`);
        return { type: 'docImage', ...image, alt, align, width: width ? Number(width) : undefined, caption: attributes.some(a => a.name === 'caption') ? attr(node, 'caption') : undefined, expand: attributes.some(a => a.name === 'expand') };
      }
      if (node.name === 'Tabs') {
        const tabsAttributes = node.attributes ?? [];
        if (node.type !== 'mdxJsxFlowElement' || tabsAttributes.some((item) => item.type !== 'mdxJsxAttribute' || !['label', 'equalHeight', 'sync'].includes(item.name)) || new Set(tabsAttributes.map((item) => item.name)).size !== tabsAttributes.length || !tabsAttributes.some((item) => item.name === 'label')) throw new Error(`${sourceFile}: <Tabs> needs a literal label`);
        const equalHeight = tabsAttributes.find((item) => item.name === 'equalHeight');
        if (equalHeight && equalHeight.value !== null) throw new Error(`${sourceFile}: <Tabs> equalHeight must be a boolean attribute`);
        const sync = tabsAttributes.some(a => a.name === 'sync') ? attr(node, 'sync') : undefined;
        if (sync !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(sync)) throw new Error(`${sourceFile}: <Tabs> sync needs a group name using letters, numbers, dashes, or underscores (up to 64 characters)`);
        const label = attr(node, 'label');
        if (!label.trim() || (node.children?.length ?? 0) < 2) throw new Error(`${sourceFile}: <Tabs> needs a label and at least two tabs`);
        const id = `tabs-${createHash('sha256').update(`${current.frontmatter.id}|${++tabsIndex}`).digest('hex').slice(0, 10)}`;
        const children = (node.children ?? []).map((tab) => {
          if (tab.type !== 'mdxJsxFlowElement' || tab.name !== 'Tab' || (tab.attributes ?? []).some(a => a.type !== 'mdxJsxAttribute' || !['label', 'value'].includes(a.name) || typeof a.value !== 'string') || new Set((tab.attributes ?? []).map(a => a.name)).size !== (tab.attributes ?? []).length || !tab.children?.length) throw new Error(`${sourceFile}: <Tabs> only accepts nonempty <Tab label="..."> children`);
          const tabLabel = attr(tab, 'label');
          if (!tabLabel.trim()) throw new Error(`${sourceFile}: <Tab> label must be nonempty text`);
          const value = (tab.attributes ?? []).some(a => a.name === 'value') ? attr(tab, 'value') : tabLabel;
          if (!value.trim()) throw new Error(`${sourceFile}: <Tab> value must be nonempty text`);
          return { type: 'docTab', label: tabLabel, value, children: childrenOf(tab.children, scope, stack, sourceFile) };
        });
        if (new Set(children.map(tab => tab.value)).size !== children.length) throw new Error(`${sourceFile}: <Tabs> needs unique tab values (labels by default)`);
        return { type: 'docTabs', label, id, sync, equalHeight: !!equalHeight, children };
      }
      if (node.name === 'Walkthrough') return walkthroughComponent(node, sourceFile, current.frontmatter.id, ++walkthroughIndex, children => childrenOf(children, scope, stack, sourceFile), projectRoot);
      if (node.name === 'Step') throw new Error(`${sourceFile}: <Step> must be directly inside <Steps> or <Walkthrough>`);
      if (node.name === 'Tab') throw new Error(`${sourceFile}: <Tab> must be directly inside <Tabs>`);
      if (node.name === 'Fields') {
        if (node.type !== 'mdxJsxFlowElement' || (node.attributes ?? []).length || !node.children?.length) throw new Error(`${sourceFile}: <Fields> needs direct <Field> children and no attributes`);
        const items = node.children.map((child) => {
          const field = child.type === 'paragraph' && child.children?.length === 1 && child.children[0].name === 'Field' ? child.children[0] : child;
          if (!['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(field.type) || field.name !== 'Field') throw new Error(`${sourceFile}: <Fields> only accepts direct <Field> children`);
          const attributes = field.attributes ?? [];
          const allowed = ['name', 'type', 'required', 'optional', 'nullable', 'deprecated', 'min', 'max', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'format', 'pattern', 'example', 'default'];
          if (attributes.some((item) => item.type !== 'mdxJsxAttribute' || !allowed.includes(item.name)) || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Field> has an unknown or duplicate attribute`);
          const name = attr(field, 'name').trim();
          const fieldType = attr(field, 'type').trim();
          if (!name || !fieldType) throw new Error(`${sourceFile}: <Field> name and type must be nonempty text`);
          const boolean = (key: string): boolean => {
            const item = attributes.find((entry) => entry.name === key);
            if (item && item.value !== null) throw new Error(`${sourceFile}: <Field> ${key} must be a boolean attribute`);
            return !!item;
          };
          const required = boolean('required');
          const optional = boolean('optional');
          const nullable = boolean('nullable');
          const deprecated = boolean('deprecated');
          if (required && optional) throw new Error(`${sourceFile}: <Field> cannot be both required and optional`);
          if (attributes.some((item) => item.name === 'min') && attributes.some((item) => item.name === 'minimum') || attributes.some((item) => item.name === 'max') && attributes.some((item) => item.name === 'maximum')) throw new Error(`${sourceFile}: <Field> cannot combine min with minimum or max with maximum`);
          const numeric = (key: string, integer: boolean): number | undefined => {
            if (!attributes.some((item) => item.name === key)) return undefined;
            const raw = attr(field, key);
            const value = Number(raw);
            if (!raw.trim() || !Number.isFinite(value) || (integer && (!Number.isInteger(value) || value < 0))) throw new Error(`${sourceFile}: <Field> ${key} must be ${integer ? 'a nonnegative integer' : 'a finite number'}`);
            return value;
          };
          const minimum = numeric(attributes.some((item) => item.name === 'min') ? 'min' : 'minimum', false);
          const maximum = numeric(attributes.some((item) => item.name === 'max') ? 'max' : 'maximum', false);
          const minLength = numeric('minLength', true);
          const maxLength = numeric('maxLength', true);
          const minItems = numeric('minItems', true);
          const maxItems = numeric('maxItems', true);
          for (const [low, high, label] of [[minimum, maximum, 'min/max'], [minLength, maxLength, 'minLength/maxLength'], [minItems, maxItems, 'minItems/maxItems']] as const) if (low !== undefined && high !== undefined && low > high) throw new Error(`${sourceFile}: <Field> ${label} range is reversed`);
          const details = [fieldType, ...(nullable ? ['nullable'] : []), ...(deprecated ? ['deprecated'] : []), ...(minimum !== undefined ? [`minimum: ${minimum}`] : []), ...(maximum !== undefined ? [`maximum: ${maximum}`] : []), ...(minLength !== undefined ? [`minLength: ${minLength}`] : []), ...(maxLength !== undefined ? [`maxLength: ${maxLength}`] : []), ...(minItems !== undefined ? [`minItems: ${minItems}`] : []), ...(maxItems !== undefined ? [`maxItems: ${maxItems}`] : []), ...['format', 'pattern'].filter(key => attributes.some((item) => item.name === key)).map(key => {
            const value = attr(field, key).trim();
            if (!value) throw new Error(`${sourceFile}: <Field> ${key} must be nonempty text`);
            return `${key}: ${value}`;
          })];
          const title = paragraph({ type: 'inlineCode', value: name }, text(' — '), { type: 'strong', children: [text(required ? 'required' : 'optional')] });
          const examples = ['example', 'default'].filter(key => attributes.some((item) => item.name === key)).map(key => paragraph(text(`${key === 'example' ? 'Example' : 'Default'}: `), { type: 'inlineCode', value: attr(field, key) }));
          const body = childrenOf(field.children ?? [], scope, stack, sourceFile);
          return { type: 'listItem', spread: true, data: { hProperties: { 'data-field': '', 'data-presence': required ? 'present' : 'optional' } }, children: [title, paragraph(text(details.join('; '))), ...examples, ...(field.type === 'mdxJsxTextElement' ? [paragraph(...body)] : body)] };
        });
        return { type: 'list', ordered: false, children: items };
      }
      if (node.name === 'Field') throw new Error(`${sourceFile}: <Field> must be directly inside <Fields>`);
      if (node.name === 'CookbookChooser') return cookbookChooserComponent(node, sourceFile);
      if (node.name && ['DocCard', 'DocCards', 'DocCollection', 'RelatedReading'].includes(node.name)) return cardComponent(node, sourceFile);
      if (node.name && ['ApiExample', 'ApiSchema'].includes(node.name)) {
        if (stack.length) throw new Error(`${sourceFile}: API includes need page-level headings; place them in the page`);
        return apiEmbedComponent(node, sourceFile);
      }
      if (node.name === 'Snippet') {
        if (node.type !== 'mdxJsxFlowElement' || node.children?.length) throw new Error(`${sourceFile}: <Snippet> must be a standalone empty element`);
        const id = attr(node, 'id');
        const definition = snippets.get(id);
        if (!definition) throw new Error(`${sourceFile}: unknown snippet ${id}`);
        if (stack.includes(id)) throw new Error(`${sourceFile}: recursive snippet include ${[...stack, id].join(' -> ')}`);
        const settings = node.attributes ?? [];
        if (settings.some((item) => item.type !== 'mdxJsxAttribute' || !['id', 'values'].includes(item.name))) throw new Error(`${sourceFile}: <Snippet> only accepts id and values`);
        if (new Set(settings.map((item) => item.name)).size !== settings.length) throw new Error(`${sourceFile}: <Snippet> has duplicate attributes`);
        const valuesAttribute = settings.find((item) => item.name === 'values');
        const invocation = valuesAttribute ? snippetAttribute(valuesAttribute, `${sourceFile}: <Snippet>`) : {};
        if (!invocation || typeof invocation !== 'object' || Array.isArray(invocation)) throw new Error(`${sourceFile}: snippet values must be a literal mapping`);
        const values = resolveSnippetValues(id, definition, projectValues, { ...(current.frontmatter.variables as Record<string, unknown> ?? {}), ...scope }, invocation as Record<string, unknown>);
        uses.push({ id, file: definition.file, documentId: current.frontmatter.id });
        return childrenOf(definition.tree.children, values, [...stack, id], definition.file);
      }
      if (node.name === 'Var') {
        if (!stack.length || node.type !== 'mdxJsxTextElement' || node.children?.length) throw new Error(`${sourceFile}: <Var> must be an inline snippet variable`);
        const name = attr(node, 'name');
        if (node.attributes?.length !== 1 || !Object.prototype.hasOwnProperty.call(scope, name)) throw new Error(`${sourceFile}: unresolved snippet variable ${name}`);
        return text(String(scope[name]));
      }
      if (node.name === 'DocLink') {
        const target = registry.get(attr(node, 'doc'));
        if (!target) throw new Error(`${sourceFile}: unknown DocLink target`);
        return link(target.route, (node.children ?? []).map((x) => x.value ?? '').join('') || target.frontmatter.title);
      }
      if (node.name === 'Callout') {
        const attributes = node.attributes ?? [];
        if (attributes.some((item) => item.type !== 'mdxJsxAttribute' || !['type', 'label'].includes(item.name)) || new Set(attributes.map((item) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <Callout> only accepts type and label`);
        const hasLabel = attributes.some((item) => item.name === 'label');
        const type = attributes.some((item) => item.name === 'type') ? attr(node, 'type') : hasLabel ? undefined : 'note';
        const definition = type === undefined ? undefined : calloutTypes.get(type);
        if (type !== undefined && !definition) throw new Error(`${sourceFile}: unknown <Callout> type "${type}"; register it in callouts.types`);
        const label = hasLabel ? attr(node, 'label').trim() : definition!.label;
        if (!label) throw new Error(`${sourceFile}: <Callout> label must be nonempty text`);
        const children = childrenOf(node.children ?? [], scope, stack, sourceFile);
        const inlineTypes = new Set(['text', 'inlineCode', 'strong', 'emphasis', 'delete', 'link', 'image', 'break']);
        let first: SemanticNode;
        if (children[0]?.type === 'paragraph') first = children.shift()!;
        else {
          const blockIndex = children.findIndex((child) => !inlineTypes.has(child.type));
          first = paragraph(...children.splice(0, blockIndex < 0 ? children.length : blockIndex));
        }
        first.children = [...(definition?.icon ? [calloutIcon(definition.icon)] : []), { type: 'strong', children: [text(`${label}:`)] }, text(' '), ...(first.children ?? [])];
        const colors = definition?.colors;
        return { type: 'blockquote', data: { hProperties: { className: ['callout', `callout-${definition?.tone ?? 'neutral'}`], ...(type ? { 'data-callout-type': type } : {}), ...(colors ? { style: `--callout-line:${colors.line};--callout-bg:${colors.background};--callout-text:${colors.text}${colors.dark ? `;--callout-dark-line:${colors.dark.line};--callout-dark-bg:${colors.dark.background};--callout-dark-text:${colors.dark.text}` : ''}` } : {}), ...(colors?.dark ? { 'data-callout-dark': '' } : {}) } }, children: [first, ...children] };
      }
      throw new Error(`${sourceFile}: <${node.name}> has no semantic/Markdown adapter`);
    }
    if (['link', 'definition'].includes(node.type) && typeof node.url === 'string' && node.url.startsWith('doc:')) {
      const target = registry.get(node.url.slice(4));
      if (!target) throw new Error(`${sourceFile}: unknown document link ${node.url}`);
      return { ...node, url: target.route, exportDocumentId: target.frontmatter.id, children: childrenOf(node.children ?? [], scope, stack, sourceFile) };
    }
    const markdownImage = node.type === 'image' || (node.type === 'definition' && typeof node.identifier === 'string' && imageReferences.get(sourceFile)?.has(node.identifier));
    if (stack.length && (node.type === 'link' || markdownImage) && typeof node.url === 'string' && !/^(?:\/|#|[a-z][a-z0-9+.-]*:)/i.test(node.url)) throw new Error(`${sourceFile}: snippet links and assets need absolute or doc: URLs`);
    if (markdownImage && typeof node.url === 'string' && !/^(?:\/|#|[a-z][a-z0-9+.-]*:)/i.test(node.url)) {
      const [, pathname, suffix = ''] = /^([^?#]*)([?#].*)?$/.exec(node.url)!;
      let localPath: string;
      try { localPath = decodeURIComponent(pathname); }
      catch { throw new Error(`${sourceFile}: invalid local image URL ${node.url}`); }
      if (!/\.(?:png|jpe?g|webp|svg|gif|avif)$/i.test(localPath)) throw new Error(`${sourceFile}: local Markdown image must be a .png, .jpg, .jpeg, .webp, .svg, .gif, or .avif file`);
      const file = path.resolve(path.dirname(sourceFile), localPath);
      if (!existsSync(file)) throw new Error(`${sourceFile}: image not found: ${file}`);
      const extension = path.extname(file);
      const stem = path.basename(file, extension).replace(/[^A-Za-z0-9._-]/g, '-');
      const identity = createHash('sha256').update(path.relative(path.dirname(sourceFile), file).split(path.sep).join('/')).digest('hex').slice(0, 12);
      return { ...node, url: `/assets/pages${current.route === '/' ? '/index' : current.route}/${stem}-${identity}${extension}${suffix}`, file };
    }
    if (node.children) {
      const children = childrenOf(node.children, scope, stack, sourceFile);
      if (node.type === 'paragraph' && children.length === 1 && children[0].type === 'blockquote') return children[0];
      return { ...node, children };
    }
    return node;
  }
  const transformed = walk(tree, {}, [], current.file);
  sectionIdentities(transformed, current.file);
  return transformed;
}
