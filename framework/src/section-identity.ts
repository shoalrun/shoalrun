/** Section identities are independent of a representation's DOM anchors. */
export type StandaloneSectionDeclaration = string | { id: string; context: 'section' };
export type SectionIdentity = { id: string; title: string; depth: 2; start: number; end: number; explicit: boolean };
export const validSectionId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,511}$/.test(value);
const textOf = (node: any): string => typeof node.value === 'string' ? node.value : (node.children ?? []).map(textOf).join('');
const marker = (node: any) => ['mdxJsxTextElement', 'mdxJsxFlowElement'].includes(node.type) && node.name === 'Anchor';

/** Consume only a direct trailing marker on an authored root H2. Code stays inert. */
export function lowerSectionMarkers(tree: any, label = 'document'): any {
  const allowed = new Set<any>();
  const children = (tree.children ?? []).map((node: any) => {
    if (node.type !== 'heading' || node.depth !== 2) return node;
    const parts = [...(node.children ?? [])];
    while (parts.at(-1)?.type === 'text' && !parts.at(-1).value.trim()) parts.pop();
    const last = parts.at(-1);
    if (!last || !marker(last)) return node;
    const attributes = last.attributes ?? [];
    if (last.type !== 'mdxJsxTextElement' || last.children?.length || attributes.length !== 1 || attributes[0].type !== 'mdxJsxAttribute' || attributes[0].name !== 'id' || !validSectionId(attributes[0].value)) {
      throw new Error(`${label}: <Anchor> needs only a literal id of 1–512 lowercase letters, numbers, or dashes and no children`);
    }
    allowed.add(last);
    parts.pop();
    if (parts.at(-1)?.type === 'text') parts[parts.length - 1] = { ...parts.at(-1), value: parts.at(-1).value.trimEnd() };
    if (!parts.map(textOf).join('').trim()) throw new Error(`${label}: an anchored heading needs a title`);
    const id = attributes[0].value;
    return { ...node, children: parts, data: { ...node.data, sectionId: id, hProperties: { ...node.data?.hProperties, 'data-shoalrun-section-id': id } } };
  });
  const check = (node: any) => {
    if (marker(node) && !allowed.has(node)) throw new Error(`${label}: <Anchor> must be the single trailing marker of a root level-two heading`);
    node.children?.forEach(check);
  };
  check(tree);
  return { ...tree, children };
}

export function sectionIdentities(tree: any, label = 'document'): SectionIdentity[] {
  const children: any[] = tree.children ?? [];
  const starts = children.flatMap((node, index) => node.type === 'heading' && node.depth === 2 ? [index] : []);
  const used = new Set<string>();
  const sections = starts.map(start => {
    const node = children[start];
    const title = textOf(node).trim();
    const stem = title.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '') || 'section';
    let generated = stem;
    for (let suffix = 2; used.has(generated); suffix++) generated = `${stem}-${suffix}`;
    used.add(generated);
    const explicit = node.data?.sectionId !== undefined;
    if (explicit && !validSectionId(node.data.sectionId)) throw new Error(`${label}: invalid explicit section ID`);
    const end = children.findIndex((child, index) => index > start && child.type === 'heading' && child.depth <= 2);
    return { id: explicit ? node.data.sectionId : generated, title, depth: 2 as const, start, end: end < 0 ? children.length : end, explicit, generated };
  });
  const owners = new Map<string, number>();
  for (const item of sections) {
    if (owners.has(item.id)) throw new Error(`${label}: duplicate section ID ${item.id}`);
    owners.set(item.id, item.start);
    if (item.explicit && sections.some(other => other.start !== item.start && other.generated === item.id)) throw new Error(`${label}: explicit section ID ${item.id} conflicts with another heading's derived ID`);
  }
  return sections.map(({ generated, ...section }) => section);
}

export function validateStandaloneSectionDeclarations(value: unknown, label = 'document'): asserts value is StandaloneSectionDeclaration[] | undefined {
  if (value === undefined) return;
  if (!Array.isArray(value)) throw new Error(`${label}: standaloneSections must be an array`);
  const seen = new Set<string>();
  for (const item of value) {
    const legacy = typeof item === 'string';
    if (legacy ? !item.trim() || item !== item.trim() : !item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'context,id' || item.context !== 'section' || !validSectionId(item.id)) {
      throw new Error(`${label}: standaloneSections needs trimmed heading titles or { id, context: section } declarations`);
    }
    const key = legacy ? `title:${item}` : `id:${item.id}`;
    if (seen.has(key)) throw new Error(`${label}: standaloneSections declarations must be unique`);
    seen.add(key);
  }
}

export function validateStandaloneSections(tree: any, declarations: StandaloneSectionDeclaration[] = [], label = 'document'): SectionIdentity[] {
  validateStandaloneSectionDeclarations(declarations, label);
  const sections = sectionIdentities(tree, label);
  const seen = new Set<number>();
  for (const declaration of declarations) {
    const matches = sections.filter(section => typeof declaration === 'string' ? section.title === declaration : section.id === declaration.id);
    if (matches.length !== 1) throw new Error(`${label}: standaloneSections ${typeof declaration === 'string' ? `title "${declaration}"` : `ID "${declaration.id}"`} must match exactly one top-level level-two heading`);
    if (seen.has(matches[0].start)) throw new Error(`${label}: standaloneSections declares the same heading more than once`);
    seen.add(matches[0].start);
  }
  return sections;
}

/** Slice-only delivery is a distinct author approval from contextual discovery. */
export function selectSection(tree: any, id: string, declarations: StandaloneSectionDeclaration[] = [], label = 'document'): { section: SectionIdentity; tree: any } {
  const section = validateStandaloneSections(tree, declarations, label).find(item => item.id === id);
  if (!section) throw new Error(`${label}: unknown section ${id}`);
  if (!declarations.some(item => typeof item !== 'string' && item.id === id && item.context === 'section')) throw new Error(`${label}: section ${id} needs standaloneSections: [{ id: ${id}, context: section }] approval`);
  const definitions = new Map<string, any>();
  const key = (node: any) => `${node.type === 'footnoteDefinition' || node.type === 'footnoteReference' ? 'footnote' : 'link'}:${node.identifier}`;
  const comparable = (value: any): any => Array.isArray(value) ? value.map(comparable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([name]) => name !== 'position' && name !== 'exportSourceKey').map(([name, item]) => [name, comparable(item)])) : value;
  const collect = (node: any) => {
    if (['definition', 'footnoteDefinition'].includes(node.type)) {
      const previous = definitions.get(key(node));
      if (previous && JSON.stringify(comparable(previous)) !== JSON.stringify(comparable(node))) throw new Error(`${label}: ambiguous definition ${node.identifier} for section ${id}`);
      if (!previous) definitions.set(key(node), node);
    }
    node.children?.forEach(collect);
  };
  collect(tree);
  const strip = (node: any): any[] => ['definition', 'footnoteDefinition'].includes(node.type) ? [] : [{ ...node, ...(node.children ? { children: node.children.flatMap(strip) } : {}) }];
  const nodes = tree.children.slice(section.start, section.end).flatMap(strip);
  const included = new Set<string>();
  const closure: any[] = [];
  const visit = (node: any) => {
    if (['linkReference', 'imageReference', 'footnoteReference'].includes(node.type)) {
      const identity = key(node);
      if (!included.has(identity)) {
        included.add(identity);
        const definition = definitions.get(identity);
        if (!definition) throw new Error(`${label}: section ${id} has an unresolved reference ${node.identifier}`);
        closure.push(definition);
        visit(definition);
      }
    }
    node.children?.forEach(visit);
  };
  nodes.forEach(visit);
  return { section, tree: { type: 'root', children: [...nodes, ...closure] } };
}
