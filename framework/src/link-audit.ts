import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseHtml, type DefaultTreeAdapterTypes } from 'parse5';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { homeUrl } from './negotiation.js';

type Finding = { target: string; message: string };
type Link = { value: string; resource: boolean };
type HtmlPage = { ids: Set<string>; links: Link[] };
const routeKey = (route: string) => route === '/' ? '/' : route.replace(/\/+$/, '');

function htmlPage(source: string): HtmlPage {
  const ids = new Set<string>();
  const links: Link[] = [];
  const walk = (node: DefaultTreeAdapterTypes.Node): void => {
    if ('attrs' in node) {
      const attrs = new Map(node.attrs.map(attr => [attr.name, attr.value]));
      if (attrs.has('id')) ids.add(attrs.get('id')!);
      if (node.tagName === 'a' && attrs.has('name')) ids.add(attrs.get('name')!);
      if (['a', 'area', 'link'].includes(node.tagName) && attrs.has('href')) links.push({ value: attrs.get('href')!, resource: node.tagName === 'link' });
      if (['img', 'script', 'source', 'iframe'].includes(node.tagName) && attrs.has('src')) links.push({ value: attrs.get('src')!, resource: true });
    }
    if ('childNodes' in node) node.childNodes.forEach(walk);
  };
  walk(parseHtml(source));
  return { ids, links };
}

function markdownLinks(source: string): Link[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
  const links: Link[] = [];
  const definitions = new Map<string, string>();
  const references: Array<{ identifier: string; resource: boolean }> = [];
  const walk = (node: any): void => {
    if (node.type === 'definition') definitions.set(node.identifier.toLowerCase(), node.url);
    if (node.type === 'link' || node.type === 'image') links.push({ value: node.url, resource: node.type === 'image' });
    if (node.type === 'linkReference' || node.type === 'imageReference') references.push({ identifier: node.identifier.toLowerCase(), resource: node.type === 'imageReference' });
    node.children?.forEach(walk);
  };
  walk(tree);
  for (const reference of references) if (definitions.has(reference.identifier)) links.push({ value: definitions.get(reference.identifier)!, resource: reference.resource });
  return links;
}

/** Check published local links without requesting external URLs or launching a browser. */
export async function auditLinks(directory: string, siteOrigin?: string) {
  const root = await realpath(directory);
  const manifest = JSON.parse(await readFile(path.join(root, 'documents.json'), 'utf8')) as {
    basePath?: string;
    documents: Array<{ id?: string; url: string; markdownUrl: string; sections?: Array<{ markdownUrl: string }> }>;
    redirects?: Array<{ from: string; to: string; markdownFrom?: string; markdownTo?: string }>;
    navigationTabs?: Array<{ indexUrl: string }>;
  };
  const origin = siteOrigin ?? 'https://shoalrun-check.invalid';
  const pages = new Map<string, { file: string; html: HtmlPage }>();
  const files = new Map<string, string>();
  const redirects = new Map<string, string>();
  for (const document of manifest.documents) {
    const file = path.join(root, document.url.slice(1), 'index.html');
    pages.set(routeKey(document.url), { file, html: htmlPage(await readFile(file, 'utf8')) });
    files.set(document.markdownUrl, path.join(root, document.markdownUrl.slice(1)));
  }
  for (const redirect of manifest.redirects ?? []) {
    redirects.set(routeKey(redirect.from), redirect.to);
    if (redirect.markdownFrom && redirect.markdownTo) redirects.set(redirect.markdownFrom, redirect.markdownTo);
  }
  const home = manifest.documents.find(document => document.url === manifest.basePath)?.url ?? homeUrl(manifest.documents);
  for (const route of ['/', manifest.basePath ?? '']) if (route && !pages.has(routeKey(route)) && !redirects.has(routeKey(route)) && home) redirects.set(routeKey(route), home);

  const findings: Finding[] = [];
  const seen = new Set<string>();
  let checked = 0;
  const check = async (from: string, link: Link): Promise<void> => {
    let url: URL;
    try { url = new URL(link.value, new URL(from.endsWith('/') || from.endsWith('.md') ? from : `${from}/`, origin)); }
    catch { findings.push({ target: from, message: `Invalid link ${JSON.stringify(link.value)}. Fix its URL.` }); return; }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(origin).origin) return;
    const identity = `${from}|${url.href}|${link.resource}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    checked++;
    try {
      let route = routeKey(decodeURIComponent(url.pathname));
      const visited = new Set<string>();
      while (redirects.has(route)) {
        if (visited.has(route)) throw new Error('Redirect cycle. Fix the redirect targets.');
        visited.add(route);
        const next = new URL(redirects.get(route)!, url);
        route = routeKey(decodeURIComponent(next.pathname));
        if (!url.hash && next.hash) url.hash = next.hash;
      }
      const page = pages.get(route);
      let file = page?.file ?? files.get(route) ?? path.resolve(root, `.${route}`);
      const relative = path.relative(root, file);
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Target escapes the built site. Fix the URL.');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const resolved = await realpath(file);
      const realRelative = path.relative(root, resolved);
      if (realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) throw new Error('Target escapes the built site. Fix the URL.');
      if (!link.resource && url.hash && file.endsWith('.html')) {
        const ids = page?.html.ids ?? htmlPage(await readFile(file, 'utf8')).ids;
        const fragment = decodeURIComponent(url.hash.slice(1)).split(':~:text=', 1)[0];
        if (fragment && !ids.has(fragment)) throw new Error(`Missing fragment #${fragment}. Fix the anchor or link to an existing heading.`);
      }
    } catch (error) {
      const message = (error as NodeJS.ErrnoException).code === 'ENOENT'
        ? 'Target is not published. Fix the URL or publish the target page or asset.'
        : (error as Error).message;
      findings.push({ target: from, message: `${JSON.stringify(link.value)}: ${message}` });
    }
  };
  for (const document of manifest.documents) {
    for (const link of pages.get(routeKey(document.url))!.html.links) await check(document.url, link);
    const markdown = await readFile(files.get(document.markdownUrl)!, 'utf8');
    for (const link of markdownLinks(markdown)) await check(document.markdownUrl, link);
    for (const section of document.sections ?? []) {
      const content = await readFile(path.join(root, section.markdownUrl.slice(1)), 'utf8');
      for (const link of markdownLinks(content)) await check(section.markdownUrl, link);
    }
  }
  for (const tab of manifest.navigationTabs ?? []) {
    const content = await readFile(path.join(root, tab.indexUrl.slice(1)), 'utf8');
    for (const link of markdownLinks(content)) await check(tab.indexUrl, link);
  }
  return { status: findings.length ? 'error' as const : 'ok' as const, pages: manifest.documents.length, checked, findings };
}
