import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { unified } from 'unified';
import rehypeStringify from 'rehype-stringify';

export type HighlightToken = { text: string; color?: string };
export type CodeHighlighter = { highlight: (code: string, language?: string) => HighlightToken[]; background?: string; foreground?: string; dark?: boolean; dependency?: string };
const plain: CodeHighlighter = { highlight: text => [{ text }] };
const stringify = unified().use(rehypeStringify);
const hex = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
// The site theme colors tokens with CSS variables that each palette sets.
const siteColor = /^var\(--code-(?:foreground|token-[a-z-]+)\)$/;

export async function createCodeHighlighter(config: any = {}, declaringFile?: string): Promise<CodeHighlighter> {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('outputs.html.highlighting must be a mapping');
  const provider = config.provider ?? 'shiki';
  const allowed = provider === 'shiki' ? ['provider', 'theme'] : provider === 'custom' ? ['provider', 'module'] : ['provider'];
  for (const key of Object.keys(config)) if (!allowed.includes(key)) throw new Error(`Unsupported highlighting setting ${key} for ${provider}`);
  if (provider === 'none') return plain;
  if (provider === 'custom') {
    if (typeof config.module !== 'string' || !config.module || !declaringFile) throw new Error('Custom highlighting needs a local module path');
    const file = path.resolve(path.dirname(declaringFile), config.module);
    const adapter = await import(pathToFileURL(file).href);
    if (typeof adapter.highlight !== 'function') throw new Error(`${file}: export a synchronous highlight(code, language) function`);
    return { highlight: adapter.highlight, dependency: file };
  }
  if (provider !== 'shiki') throw new Error(`Unknown highlighting provider ${provider}`);
  // Load only when selected. Shiki caches its build-time instance and grammars.
  const { getSingletonHighlighter, bundledThemes, createCssVariablesTheme } = await import('shiki');
  const theme = config.theme ?? 'site';
  if (typeof theme !== 'string' || (theme !== 'site' && !Object.hasOwn(bundledThemes, theme))) throw new Error(`Unknown Shiki theme ${theme}; use site or a bundled Shiki theme name`);
  const highlighter = await getSingletonHighlighter({
    themes: [theme === 'site' ? createCssVariablesTheme({ name: 'site', variablePrefix: '--code-' }) : theme as keyof typeof bundledThemes],
    langs: ['json', 'yaml', 'bash', 'javascript', 'typescript', 'python', 'html', 'css', 'mdx', 'markdown', 'http', 'xml', 'sql', 'go', 'java', 'ruby', 'csharp', 'php', 'rust']
  });
  const languages = new Set(highlighter.getLoadedLanguages());
  const colors = highlighter.getTheme(theme);
  return {
    ...(theme === 'site' ? {} : { background: colors.bg, foreground: colors.fg, dark: colors.type === 'dark' }),
    highlight(value, language) {
      const lang = language?.toLowerCase();
      if (!lang || !languages.has(lang)) return [{ text: value }];
      const breaks = value.match(/\r\n|\r|\n/g) ?? [];
      return highlighter.codeToTokens(value, { lang: lang as any, theme }).tokens.flatMap((line, index) => [
        ...(index ? [{ text: breaks[index - 1] }] : []),
        ...line.map(token => ({ text: token.content, color: token.color }))
      ]);
    }
  };
}

function tokens(value: string, language: string | undefined, highlighter: CodeHighlighter): any[] {
  const result = highlighter.highlight(value, language);
  if (!Array.isArray(result) || result.some(token => !token || typeof token.text !== 'string' || (token.color !== undefined && (typeof token.color !== 'string' || !(hex.test(token.color) || siteColor.test(token.color))))) || result.map(token => token.text).join('') !== value) {
    throw new Error('Highlighter must return text tokens with optional hex colors and preserve the exact code text');
  }
  return result.map(token => token.color ? {
    type: 'element', tagName: 'span', properties: { style: `color:${token.color}` }, children: [{ type: 'text', value: token.text }]
  } : { type: 'text', value: token.text });
}

// A dark theme leaves the background to the palette so the block matches its toolbar.
function preProperties(highlighter: CodeHighlighter): Record<string, string> {
  if (!highlighter.background || !highlighter.foreground) return {};
  return { style: highlighter.dark ? `color:${highlighter.foreground}` : `background-color:${highlighter.background};color:${highlighter.foreground}` };
}

export function highlightCode(highlighter: CodeHighlighter = plain) {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.children) node.children = node.children.map((child: any) => visit(child));
      if (node.tagName === 'pre') {
        const code = node.children?.find((child: any) => child.tagName === 'code');
        if (code && code.children.every((child: any) => child.type === 'text')) {
          const language = code.properties?.className?.find((name: string) => name.startsWith('language-'))?.slice(9);
          code.children = tokens(code.children.map((child: any) => child.value).join(''), language, highlighter);
          node.properties = { ...node.properties, ...preProperties(highlighter) };
        }
        const metadata = new Map<string, string>();
        for (const match of String(code?.data?.meta ?? '').matchAll(/(?:^|\s)(title|filename)=(?:"([^"]+)"|'([^']+)'|([^\s]+))(?=\s|$)/g)) metadata.set(match[1], match[2] ?? match[3] ?? match[4]);
        const title = metadata.get('title');
        const filename = metadata.get('filename');
        if (title || filename) return {
          type: 'element', tagName: 'div', properties: { className: ['code-block'] }, children: [
            { type: 'element', tagName: 'div', properties: { className: ['code-toolbar'] }, children: [
              { type: 'element', tagName: 'span', properties: { className: ['code-block-meta'] }, children: [
                ...(title ? [{ type: 'element', tagName: 'span', properties: { className: ['code-block-title'] }, children: [{ type: 'text', value: title }] }] : []),
                ...(filename ? [{ type: 'element', tagName: 'span', properties: { className: ['code-block-filename'] }, children: [{ type: 'text', value: filename }] }] : [])
              ] }
            ] },
            node
          ]
        };
      }
      return node;
    };
    visit(tree);
  };
}

export function highlightedExample(value: string, language: string, highlighter: CodeHighlighter = plain): string {
  return stringify.stringify({
    type: 'root', children: [{
      type: 'element', tagName: 'pre', properties: preProperties(highlighter), children: [{
        type: 'element', tagName: 'code', properties: { className: [`language-${language}`] }, children: tokens(value, language, highlighter)
      }]
    }]
  } as any);
}
