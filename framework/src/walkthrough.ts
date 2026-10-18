import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

// <Walkthrough> explains code one step at a time. In separate mode each step brings its own code; in unified mode
// one shared code fence sits before the steps and each step highlights lines of it. Every representation keeps
// all steps and their complete code; walkthrough.js only adds the side-by-side scrolling layout.

// Steps are ordinary children so tree passes such as diagram rendering reach their content. A separate-mode
// step's code fence is its last child.
export type WalkthroughStep = { type: 'docWalkthroughStep'; title: string; highlight: number[]; children: any[] };
export type WalkthroughNode = { type: 'docWalkthrough'; id: string; title: string; mode: 'separate' | 'unified'; layout: 'scroll' | 'spotlight'; code?: any; sources: string[]; children: WalkthroughStep[] };
const stepCode = (step: WalkthroughStep) => step.children.at(-1)?.type === 'code' ? step.children.at(-1) : undefined;
const stepBody = (step: WalkthroughStep) => stepCode(step) ? step.children.slice(0, -1) : step.children;

const lineCount = (value: string) => value.split(/\r\n|\r|\n/).length;

// "1-3,5" becomes [1, 2, 3, 5].
export function parseLineRanges(value: string, lines: number, where: string): number[] {
  const result = new Set<number>();
  for (const part of value.split(',').map(item => item.trim())) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) throw new Error(`${where}: highlight must list lines or ranges, such as 1-3,5`);
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start) throw new Error(`${where}: highlight range ${part} is reversed or starts before line 1`);
    if (end > lines) throw new Error(`${where}: highlight range ${part} is past the end of the ${lines}-line code`);
    for (let line = start; line <= end; line++) result.add(line);
  }
  return [...result].sort((a, b) => a - b);
}

const languages: Record<string, string> = {
  ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescript', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', cs: 'csharp', php: 'php', sh: 'bash', bash: 'bash', zsh: 'bash',
  yaml: 'yaml', yml: 'yaml', json: 'json', html: 'html', css: 'css', sql: 'sql', xml: 'xml', md: 'markdown', mdx: 'mdx', http: 'http'
};

// Code can come from a project file instead of a fence, so a walkthrough shows the same code the project tests.
// `region` takes the lines between `#region name` and `#endregion` comments; `lines` takes a fixed range.
function sourceCode(attributes: Record<string, string>, sourceFile: string, where: string, projectRoot?: string): { code: any; file: string } | undefined {
  const { file: source, lines, region, lang } = attributes;
  if (source === undefined) {
    if (lines !== undefined || region !== undefined || lang !== undefined) throw new Error(`${where}: lines, region, and lang need a file attribute`);
    return undefined;
  }
  if (!source || path.isAbsolute(source) || /^[a-z][a-z0-9+.-]*:/i.test(source)) throw new Error(`${where}: file must be a path relative to the page`);
  if (lines !== undefined && region !== undefined) throw new Error(`${where}: use lines or region, not both`);
  const file = path.resolve(path.dirname(sourceFile), source);
  let real: string;
  try { real = realpathSync(file); } catch { throw new Error(`${where}: code file not found: ${file}`); }
  const boundary = sourceBoundary(sourceFile, projectRoot);
  const relative = path.relative(boundary, real);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`${where}: file ${source} is outside ${boundary}; code files must be in the page's Git repository or project directory`);
  let text: string;
  try { text = readFileSync(real, 'utf8'); } catch { throw new Error(`${where}: code file not readable: ${file}`); }
  let all = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  if (lines !== undefined) {
    const match = /^(\d+)-(\d+)$/.exec(lines);
    if (!match || Number(match[1]) < 1 || Number(match[2]) < Number(match[1])) throw new Error(`${where}: lines must be one range, such as 12-30`);
    if (Number(match[2]) > all.length) throw new Error(`${where}: lines ${lines} is past the end of the ${all.length}-line file ${source}`);
    all = all.slice(Number(match[1]) - 1, Number(match[2]));
  }
  if (region !== undefined) {
    if (!region) throw new Error(`${where}: region needs a name`);
    const found = regions(all, source, where).get(region);
    if (!found) throw new Error(`${where}: no "#region ${region}" comment in ${source}`);
    all = all.slice(found.start + 1, found.end).filter(line => !marker(line));
    const indent = Math.min(...all.filter(line => line.trim()).map(line => /^\s*/.exec(line)![0].length));
    if (Number.isFinite(indent)) all = all.map(line => line.slice(indent));
  }
  if (!all.some(line => line.trim())) throw new Error(`${where}: the code taken from ${source} is empty`);
  const language = lang ?? languages[path.extname(file).slice(1).toLowerCase()];
  if (!language) throw new Error(`${where}: set lang for ${source}; its extension doesn't name a language`);
  return { code: { type: 'code', lang: language, meta: `filename="${path.basename(file)}"`, value: all.join('\n') }, file };
}

// Region comments such as `// #region name`, `# region name`, or `<!-- #endregion name -->` start their line,
// after an optional comment opener, so a `#region` inside code or a URL is not a marker. The name is the first
// word; text after it, such as `: what this does`, is a description. An end marker may repeat its region's name.
const marker = (line: string): { end: boolean; name?: string } | undefined => {
  const match = /^\s*(?:\/\/+|\/\*+|<!--|--|;+|')?\s*#\s?(end)?region\b\s*([^\s:]*)/.exec(line);
  return match ? { end: !!match[1], name: match[2].replace(/(?:-->|\*\/)$/, '') || undefined } : undefined;
};

// Pair every region marker in the file, so a stray or mismatched marker fails the build instead of cutting a
// region short.
function regions(lines: string[], source: string, where: string): Map<string, { start: number; end: number }> {
  const found = new Map<string, { start: number; end: number }>();
  const open: Array<{ name: string; start: number }> = [];
  lines.forEach((line, at) => {
    const item = marker(line);
    if (!item) return;
    const number = at + 1;
    if (!item.end) {
      if (!item.name) throw new Error(`${where}: #region at line ${number} of ${source} needs a name`);
      if (found.has(item.name) || open.some(entry => entry.name === item.name)) throw new Error(`${where}: region ${item.name} appears twice in ${source}; give each region its own name`);
      open.push({ name: item.name, start: at });
      return;
    }
    const current = open.pop();
    if (!current) throw new Error(`${where}: #endregion at line ${number} of ${source} has no matching #region`);
    if (item.name && item.name !== current.name) throw new Error(`${where}: #endregion ${item.name} at line ${number} of ${source} closes region ${current.name}`);
    found.set(current.name, { start: current.start, end: at });
  });
  const unclosed = open.pop();
  if (unclosed) throw new Error(`${where}: region ${unclosed.name} at line ${unclosed.start + 1} of ${source} has no #endregion`);
  return found;
}

// A page may read code from anywhere in its Git repository, so docs can show code that lives beside them, but
// never from outside it: a docs change must not publish other files from the build machine. Outside a
// repository, the project directory is the limit.
function sourceBoundary(sourceFile: string, projectRoot?: string): string {
  for (let directory = path.dirname(sourceFile); ; directory = path.dirname(directory)) {
    if (existsSync(path.join(directory, '.git'))) return realpathSync(directory);
    if (path.dirname(directory) === directory) return realpathSync(projectRoot ?? path.dirname(sourceFile));
  }
}

const formatRanges = (lines: number[]) => {
  const label = lines.length === 1 ? 'Line' : 'Lines';
  const parts: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const start = lines[index];
    while (lines[index + 1] === lines[index] + 1) index++;
    parts.push(start === lines[index] ? String(start) : `${start}–${lines[index]}`);
  }
  return `${label} ${parts.join(', ')}`;
};

export function walkthroughComponent(node: any, sourceFile: string, documentId: string, index: number, childrenOf: (nodes: any[]) => any[], projectRoot?: string): WalkthroughNode {
  const literal = (element: any, allowed: string[]) => {
    const attributes = element.attributes ?? [];
    if (attributes.some((item: any) => item.type !== 'mdxJsxAttribute' || !allowed.includes(item.name) || typeof item.value !== 'string') || new Set(attributes.map((item: any) => item.name)).size !== attributes.length) throw new Error(`${sourceFile}: <${element.name}> only accepts literal ${allowed.join(' and ')} attributes`);
    return Object.fromEntries(attributes.map((item: any) => [item.name, item.value.trim()])) as Record<string, string>;
  };
  if (node.type !== 'mdxJsxFlowElement') throw new Error(`${sourceFile}: <Walkthrough> must be a block on its own lines`);
  const settings = literal(node, ['title', 'layout', 'file', 'lines', 'region', 'lang']);
  const { title } = settings;
  if (!title) throw new Error(`${sourceFile}: <Walkthrough> needs a nonempty title`);
  const layout = settings.layout ?? 'scroll';
  if (layout !== 'scroll' && layout !== 'spotlight') throw new Error(`${sourceFile}: <Walkthrough> layout must be scroll or spotlight`);
  const sources: string[] = [];
  const children = node.children ?? [];
  const fence = children[0]?.type === 'code' ? children[0] : undefined;
  const shared = sourceCode(settings, sourceFile, `${sourceFile}: <Walkthrough>`, projectRoot);
  if (shared && fence) throw new Error(`${sourceFile}: <Walkthrough> takes its shared code from a file or a code fence, not both`);
  if (shared) sources.push(shared.file);
  const code = shared?.code ?? fence;
  const stepNodes = fence ? children.slice(1) : children;
  if (stepNodes.some((child: any) => child.type !== 'mdxJsxFlowElement' || child.name !== 'Step')) throw new Error(`${sourceFile}: <Walkthrough> accepts one optional code fence followed by <Step> children`);
  if (stepNodes.length < 2) throw new Error(`${sourceFile}: <Walkthrough> needs at least two steps`);
  const steps = stepNodes.map((step: any, at: number): WalkthroughStep => {
    const where = `${sourceFile}: <Step> ${at + 1}`;
    const attributes = literal(step, ['title', 'highlight', 'file', 'lines', 'region', 'lang']);
    if (!attributes.title) throw new Error(`${where} needs a nonempty title`);
    const body = childrenOf(step.children ?? []);
    const included = sourceCode(attributes, sourceFile, where, projectRoot);
    if (included && body.some(child => child.type === 'code')) throw new Error(`${where} takes its code from a file or a code fence, not both`);
    if (included) { sources.push(included.file); body.push(included.code); }
    const codes = body.filter(child => child.type === 'code');
    if (code && codes.length) throw new Error(`${where}: steps cannot add code when the walkthrough shares one code fence`);
    if (codes.length > 1) throw new Error(`${where} can contain one code fence`);
    if (codes.length && body.at(-1) !== codes[0]) throw new Error(`${where}: put the code fence after the step's explanation`);
    const shown = code ?? codes[0];
    if (attributes.highlight !== undefined && !shown) throw new Error(`${where}: highlight needs code to highlight`);
    const highlight = attributes.highlight === undefined ? [] : parseLineRanges(attributes.highlight, lineCount(shown.value), where);
    if (!body.some(child => child.type !== 'code')) throw new Error(`${where} needs an explanation`);
    return { type: 'docWalkthroughStep', title: attributes.title, highlight, children: body };
  });
  const id = `walk-${createHash('sha256').update(`${documentId}|${index}`).digest('hex').slice(0, 10)}`;
  return { type: 'docWalkthrough', id, title, mode: code ? 'unified' : 'separate', layout, code, sources, children: steps };
}

// Markdown keeps every step as a section; unified steps repeat the lines they explain so an agent can quote them.
export function walkthroughMarkdown(node: WalkthroughNode, walk: (node: any) => any[], helpers: { heading: (depth: number, value: string) => any; paragraph: (...children: any[]) => any; text: (value: string) => any }): any[] {
  const { heading, paragraph, text } = helpers;
  const lines = node.code?.value.split(/\r\n|\r|\n/) ?? [];
  return [
    paragraph({ type: 'strong', children: [text(`Walkthrough: ${node.title}`)] }),
    ...(node.code ? [node.code] : []),
    ...node.children.flatMap((step, index) => [
      heading(3, `Step ${index + 1}: ${step.title}`),
      ...stepBody(step).flatMap(walk),
      ...(node.code && step.highlight.length ? [
        paragraph(text(`${formatRanges(step.highlight)}:`)),
        { type: 'code', lang: node.code.lang, value: step.highlight.map(line => lines[line - 1]).join('\n') }
      ] : []),
      ...(stepCode(step) ? [stepCode(step)] : [])
    ])
  ];
}

export function walkthroughHtml(node: WalkthroughNode, walk: (node: any) => any[], element: (name: string, properties: Record<string, unknown>, children: any[]) => any, text: (value: string) => any): any[] {
  const codeBox = (code: any, highlight: number[]) => element('div', { className: ['walkthrough-code'], ...(highlight.length ? { 'data-highlight': highlight.join(' ') } : {}) }, [code]);
  const steps = node.children.map((step, index) => element('li', {
    id: `${node.id}-step-${index + 1}`, className: ['walkthrough-step'],
    ...(node.mode === 'unified' && step.highlight.length ? { 'data-highlight': step.highlight.join(' ') } : {})
  }, [
    element('h3', { className: ['walkthrough-step-title'] }, [element('span', { className: ['walkthrough-step-number'] }, [text(`Step ${index + 1}`)]), text(' '), text(step.title)]),
    ...stepBody(step).flatMap(walk),
    ...(node.mode === 'unified' && step.highlight.length ? [element('p', { className: ['walkthrough-lines'] }, [text(formatRanges(step.highlight))])] : []),
    ...(stepCode(step) ? [codeBox(stepCode(step), step.highlight)] : [])
  ]));
  return [element('section', { className: ['walkthrough'], id: node.id, 'data-walkthrough': '', 'data-mode': node.mode, 'data-layout': node.layout, 'aria-label': node.title }, [
    element('p', { className: ['walkthrough-title'] }, [text(node.title)]),
    ...(node.code ? [codeBox(node.code, [])] : []),
    element('ol', { className: ['walkthrough-steps'] }, steps)
  ])];
}

// After highlighting: split each walkthrough code block into lines and give tokens keys that stay the same
// between consecutive steps, so the browser can move unchanged code instead of redrawing it.
type Piece = { text: string; style?: string };
const hasClass = (node: any, name: string) => [node.properties?.className].flat().includes(name);
const textOf = (node: any): string => node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');

function pieces(code: any): Piece[] {
  const result: Piece[] = [];
  for (const child of code.children ?? []) {
    const style = child.type === 'element' ? child.properties?.style : undefined;
    // Finer pieces make movement read as code shifting rather than whole lines fading.
    for (const part of textOf(child).match(/\r\n|\r|\n|[^\S\r\n]+|\w+|[^\w\s]/g) ?? []) result.push({ text: part, style });
  }
  return result;
}

// Longest common subsequence of token text; returns pairs of matching indexes.
function matches(before: string[], after: string[]): Array<[number, number]> {
  if (before.length * after.length > 2_000_000) return [];
  const table = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i--) for (let j = after.length - 1; j >= 0; j--) {
    table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const pairs: Array<[number, number]> = [];
  for (let i = 0, j = 0; i < before.length && j < after.length;) {
    if (before[i] === after[j]) { pairs.push([i, j]); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

export function walkthroughCode() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.type === 'element' && hasClass(node, 'walkthrough')) return keyWalkthrough(node);
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

function keyWalkthrough(root: any) {
  const boxes: any[] = [];
  const collect = (node: any) => {
    if (node.type === 'element' && hasClass(node, 'walkthrough-code')) boxes.push(node);
    else node.children?.forEach(collect);
  };
  collect(root);
  let next = 0;
  let previous: { texts: string[]; keys: string[] } | undefined;
  for (const box of boxes) {
    const pre = (function find(node: any): any { return node.tagName === 'pre' ? node : (node.children ?? []).map(find).find(Boolean); })(box);
    const code = pre?.children?.find((child: any) => child.tagName === 'code');
    if (!code) continue;
    const highlighted = new Set(String(box.properties?.dataHighlight ?? box.properties?.['data-highlight'] ?? '').split(' ').filter(Boolean).map(Number));
    const all = pieces(code);
    const visible = all.filter(piece => piece.text.trim());
    const texts = visible.map(piece => piece.text);
    const keys: string[] = new Array(texts.length);
    if (previous) for (const [from, to] of matches(previous.texts, texts)) keys[to] = previous.keys[from];
    for (let index = 0; index < keys.length; index++) keys[index] ??= `k${(next++).toString(36)}`;
    previous = { texts, keys };
    let visibleIndex = 0;
    const lines: any[][] = [[]];
    for (const piece of all) {
      if (/^(?:\r\n|\r|\n)$/.test(piece.text)) { lines.push([]); continue; }
      if (!piece.text.trim()) { lines.at(-1)!.push({ type: 'text', value: piece.text }); continue; }
      lines.at(-1)!.push({ type: 'element', tagName: 'span', properties: { ...(piece.style ? { style: piece.style } : {}), dataK: keys[visibleIndex++] }, children: [{ type: 'text', value: piece.text }] });
    }
    code.children = lines.flatMap((line, index) => [
      ...(index ? [{ type: 'text', value: '\n' }] : []),
      { type: 'element', tagName: 'span', properties: { className: ['line', ...(highlighted.has(index + 1) ? ['is-highlighted'] : [])] }, children: line }
    ]);
    if (highlighted.size) pre.properties = { ...pre.properties, dataFocus: '' };
  }
}
