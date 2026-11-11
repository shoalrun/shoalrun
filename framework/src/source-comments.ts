import { unified, type Processor } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Construct, Extension, State, Tokenizer } from 'micromark-util-types';
import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';

declare module 'micromark-util-types' {
  interface TokenTypeMap { shoalrunComment: 'shoalrunComment'; shoalrunCommentData: 'shoalrunCommentData'; shoalrunOpaque: 'shoalrunOpaque' }
  interface Token { sourceComment?: { end: number; unclosed?: string } }
}

type Range = [start: number, end: number];
const ranges = new WeakMap<object, Range[]>();
export const sourceCommentRanges = (tree: object): readonly Range[] => ranges.get(tree) ?? [];
const lineEnding = (code: number | null) => code === -3 || code === -4 || code === -5;

// In discovery, valid JSX tags/expressions are opaque. Invalid ones are plain
// text: they might be inside a comment whose end is beyond this paragraph.
// Only the final, ordinary MDX parse validates authored syntax.
function opaque(construct: Construct): Construct {
  return {
    ...construct,
    tokenize(effects, ok, nok) {
      let active = true;
      const done: State = code => { active = false; return ok(code); };
      const fail: State = code => { active = false; return nok(code); };
      const guard = (state: State): State => code => {
        try {
          const next = state(code);
          return active && next ? guard(next) : next;
        } catch (error) {
          if (!active) throw error;
          return fail(code);
        }
      };
      return guard(construct.tokenize.call(this, effects, done, fail));
    },
    resolve(events) {
      // Preserve native line-ending events: micromark uses them to associate
      // flow chunks with source lines. Collapsing a multiline tag corrupts
      // that bookkeeping. Only its root AST handler needs to be opaque.
      const roots = new Set(events.filter(event => event[1].type === construct.name).map(event => event[1]));
      for (const token of roots) token.type = 'shoalrunOpaque';
      return events;
    }
  };
}

function jsxCommentEnd(source: string, start: number): { end: number; unclosed?: string } | undefined {
  if (source[start] !== '{') return;
  let cursor = start + 1;
  while (/\s/.test(source[cursor] ?? '')) cursor++;
  if (!source.startsWith('/*', cursor)) return;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) { cursor++; continue; }
    if (source.startsWith('/*', cursor)) {
      const end = source.indexOf('*/', cursor + 2);
      if (end < 0) return { end: source.length, unclosed: 'JSX comment; expected */}' };
      cursor = end + 2;
    } else if (source.startsWith('//', cursor)) {
      const end = source.slice(cursor).search(/[\r\n]/);
      cursor = end < 0 ? source.length : cursor + end;
    } else return source[cursor] === '}' ? { end: cursor + 1 } : undefined;
  }
  return { end: source.length, unclosed: 'JSX comment; expected }' };
}

function normalize(source: string, extensions: Extension[], pointAt: ReturnType<typeof coordinates>['point']) {
  let projected = source;
  const comments: Range[] = [];
  const normalized = new Set<number>();
  const native: Record<number, Construct[]> = {};
  const nativeFlow: Record<number, Construct[]> = {};
  for (const extension of extensions) for (const code of [60, 123]) {
    const value = extension.text?.[code];
    for (const construct of Array.isArray(value) ? value : value ? [value] : []) {
      if (construct.name === 'mdxJsxTextTag' || construct.name === 'mdxTextExpression') (native[code] ??= []).push(opaque(construct));
    }
    const flow = extension.flow?.[code];
    for (const construct of Array.isArray(flow) ? flow : flow ? [flow] : []) {
      if (construct.name === 'mdxJsxFlowTag' || construct.name === 'mdxFlowExpression') (nativeFlow[code] ??= []).push(opaque(construct));
    }
  }
  const comment = (flow: boolean): Construct => ({
    name: 'shoalrunComment', concrete: flow,
    tokenize(effects, ok, nok) {
      const start = this.now().offset;
      if (normalized.has(start)) return nok;
      let span: { end: number; unclosed?: string } | undefined;
      if (projected.startsWith('<!--', start)) {
        const end = projected.indexOf('-->', start + 4);
        span = end < 0 ? { end: projected.length, unclosed: 'HTML comment; expected -->' } : { end: end + 3 };
      } else span = jsxCommentEnd(projected, start);
      if (!span) return nok;
      const token = effects.enter('shoalrunComment');
      token.sourceComment = span;
      let dataOpen = false;
      const content: State = code => {
        // null can mean the end of a paragraph or container, not source EOF.
        // Keep the original end so normalization can cover the whole comment.
        if (code === null || this.now().offset >= span!.end) {
          if (dataOpen) effects.exit('shoalrunCommentData');
          effects.exit('shoalrunComment');
          return flow ? after(code) : ok(code);
        }
        if (lineEnding(code)) {
          if (dataOpen) effects.exit('shoalrunCommentData');
          dataOpen = false;
          effects.enter('lineEnding'); effects.consume(code); effects.exit('lineEnding');
        } else {
          if (!dataOpen) { effects.enter('shoalrunCommentData'); dataOpen = true; }
          effects.consume(code);
        }
        return content;
      };
      const after: State = code => {
        if (code === 32 || code === -1 || code === -2) {
          effects.enter('whitespace'); effects.consume(code); effects.exit('whitespace');
          return after;
        }
        // Let normal Markdown parse trailing prose, including continuations
        // and setext headings. Discovery has no throwing JSX flow construct.
        return code === null || lineEnding(code) ? ok(code) : nok(code);
      };
      return content;
    }
  });
  const discovery = unified().use(remarkParse).use(remarkGfm).use(function () {
    const data = this.data();
    (data.micromarkExtensions ??= []).push({
      disable: { null: ['htmlFlow', 'htmlText', 'codeIndented'] },
      flow: { 60: [comment(true), ...nativeFlow[60] ?? []], 123: [comment(true), ...nativeFlow[123] ?? []] },
      text: { 60: [comment(false), ...native[60] ?? []], 123: [comment(false), ...native[123] ?? []] }
    });
    const fromMarkdown: FromMarkdownExtension = {
      enter: {
        shoalrunComment(token) { this.enter({ type: 'sourceComment', span: token.sourceComment } as any, token); },
        shoalrunOpaque(token) { this.enter({ type: 'sourceOpaque', children: [] } as any, token); }
      },
      exit: {
        shoalrunComment(token) { this.exit(token); },
        shoalrunOpaque(token) { this.exit(token); }
      }
    };
    (data.fromMarkdownExtensions ??= []).push(fromMarkdown);
  });
  for (;;) {
    const found: any[] = [];
    const collect = (node: any) => {
      if (node.type === 'sourceComment') found.push(node);
      else node.children?.forEach(collect);
    };
    collect(discovery.parse(projected));
    if (!found.length) return { source: projected, comments };
    found.sort((a, b) => a.position.start.offset - b.position.start.offset);
    const batch: Range[] = [];
    for (const node of found) {
      const start = node.position.start.offset;
      if (batch.length && start < batch.at(-1)![1]) continue;
      if (node.span.unclosed) {
        const point = pointAt(start);
        const [kind, expected] = node.span.unclosed.split('; ');
        throw new Error(`Unclosed ${kind} at ${point.line}:${point.column}; ${expected}`);
      }
      batch.push([start, node.span.end]);
      // A comment spanning a block boundary may hide fences or tags that
      // affected discovery of later nodes. Reparse after this range before
      // trusting those later contexts. Ordinary inline tests batch together.
      if (node.position.end.offset < node.span.end) break;
    }
    const parts: string[] = [];
    let cursor = 0;
    for (const [start, end] of batch) {
      parts.push(projected.slice(cursor, start), '{/*' + ' '.repeat(end - start - 6) + '*/}');
      normalized.add(start);
      comments.push([start, end]);
      cursor = end;
    }
    parts.push(projected.slice(cursor));
    projected = parts.join('');
  }
}

function coordinates(source: string) {
  const starts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '\r') {
      if (source[index + 1] === '\n') index++;
      starts.push(index + 1);
    } else if (source[index] === '\n') starts.push(index + 1);
  }
  return {
    offset: (line: number, column: number) => starts[line - 1] + column - 1,
    point(offset: number) {
      let low = 0;
      let high = starts.length;
      while (low + 1 < high) {
        const middle = (low + high) >>> 1;
        if (starts[middle] <= offset) low = middle; else high = middle;
      }
      return { line: low + 1, column: offset - starts[low] + 1, offset };
    }
  };
}

/** Normalize only recognized comments, retaining offsets for diagnostics/tools. */
export function sourceComments(this: Processor) {
  const parser = this.parser!;
  this.parser = (document, file) => {
    const original = String(document);
    let projected = original;
    let comments: Range[] = [];
    let tree: any;
    const originalCoordinates = coordinates(original);
    try {
      if (original.includes('<!--') || original.includes('/*') && original.includes('{')) {
        const normalized = normalize(original, this.data().micromarkExtensions ?? [], originalCoordinates.point);
        projected = normalized.source;
        comments = normalized.comments;
      }
      tree = parser(projected, file);
    } catch (error) {
      if (error instanceof Error) {
        const diagnostic = error as any;
        const place = diagnostic.place;
        if (projected !== original && place) {
          const projectedCoordinates = coordinates(projected);
          const points = place.start ? [place.start, place.end].filter(Boolean) : [place];
          for (const point of points) Object.assign(point, originalCoordinates.point(point.offset ?? projectedCoordinates.offset(point.line, point.column)));
          const start = place.start ?? place;
          diagnostic.line = start.line;
          diagnostic.column = start.column;
          diagnostic.file = file.path;
          error.message = `${start.line}:${start.column}: ${error.message}`;
          diagnostic.name = file.path ? `${file.path}:${start.line}:${start.column}` : `${start.line}:${start.column}`;
        }
        if (file.path) error.message = `${file.path}: ${error.message}`;
      }
      throw error;
    }
    const commentStarts = new Set(comments.map(range => range[0]));
    const omit = (node: any): any[] => {
      const program = node.data?.estree;
      if (['mdxFlowExpression', 'mdxTextExpression'].includes(node.type)
        && program?.body?.length === 0 && program.comments?.some((comment: any) => comment.type === 'Block')) {
        const start = node.position.start.offset;
        if (!commentStarts.has(start)) {
          commentStarts.add(start);
          comments.push([start, node.position.end.offset]);
        }
        return [];
      }
      if (node.children) {
        const hadChildren = node.children.length > 0;
        node.children = node.children.flatMap(omit);
        if (node.type === 'paragraph' && hadChildren && !node.children.length) return [];
      }
      return [node];
    };
    omit(tree);
    const visited = new WeakSet<object>();
    const projectedCoordinates = coordinates(projected);
    const restore = (value: any) => {
      if (!value || typeof value !== 'object' || visited.has(value)) return;
      visited.add(value);
      if (value.position) for (const point of [value.position.start, value.position.end]) Object.assign(point, originalCoordinates.point(point.offset));
      if (value.loc) for (const point of [value.loc.start, value.loc.end]) {
        const restored = originalCoordinates.point(point.offset ?? projectedCoordinates.offset(point.line, point.column + 1));
        Object.assign(point, restored, { column: restored.column - 1 });
      }
      for (const [key, child] of Object.entries(value)) if (key !== 'position' && key !== 'loc') {
        if (Array.isArray(child)) child.forEach(restore); else restore(child);
      }
    };
    if (projected !== original) restore(tree);
    ranges.set(tree, comments);
    return tree;
  };
}
