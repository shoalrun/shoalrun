// Sitemaps use the same published routes as HTML, with no build-time dates pretending to be content updates.
const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const maxUrls = 50_000;
const maxBytes = 50 * 1024 * 1024;
const escapeXml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
export type SitemapPage = { route: string; updated?: string };
const entry = (url: string, updated?: string) => `  <url><loc>${escapeXml(url)}</loc>${updated ? `<lastmod>${escapeXml(updated)}</lastmod>` : ''}</url>`;
const urlset = (entries: Array<{ url: string; updated?: string }>) => `${header}<urlset xmlns="${namespace}">\n${entries.map(page => entry(page.url, page.updated)).join('\n')}\n</urlset>\n`;

export function sitemapFiles(origin: string, pages: SitemapPage[], limits: { urls?: number; bytes?: number } = {}, basePath = ''): Map<string, string> {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('site.origin must be an HTTPS origin without a path, query, or fragment');
  const urls = pages.map(({ route, updated }) => {
    if (!route.startsWith('/') || route.startsWith('//') || /[?#\\]/.test(route)) throw new Error(`Invalid sitemap route ${route}`);
    return { url: new URL(route, base).href, updated };
  }).sort((a, b) => a.url.localeCompare(b.url));
  if (new Set(urls.map(page => page.url)).size !== urls.length) throw new Error('The sitemap has duplicate canonical URLs');
  const files = new Map<string, string>();
  const chunks: typeof urls[] = [];
  let current: typeof urls = [];
  let size = Buffer.byteLength(urlset([]));
  for (const page of urls) {
    const added = Buffer.byteLength(entry(page.url, page.updated)) + (current.length ? 1 : 0);
    if (current.length + 1 > (limits.urls ?? maxUrls) || size + added > (limits.bytes ?? maxBytes)) {
      if (!current.length) throw new Error(`Sitemap URL is too large: ${page.url}`);
      chunks.push(current);
      current = [page];
      size = Buffer.byteLength(urlset(current));
    } else { current.push(page); size += added; }
  }
  if (current.length) chunks.push(current);
  if (!chunks.length) return files;
  if (chunks.length === 1) { files.set(`${basePath}/sitemap.xml`, urlset(chunks[0])); return files; }
  if (chunks.length > maxUrls) throw new Error('The sitemap needs more than 50,000 child files; split this site by origin');
  const children = chunks.map((chunk, index) => {
    const route = `${basePath}/sitemap-${index + 1}.xml`;
    files.set(route, urlset(chunk));
    return `${base.origin}${route}`;
  });
  const index = `${header}<sitemapindex xmlns="${namespace}">\n${children.map(url => `  <sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  if (Buffer.byteLength(index) > maxBytes) throw new Error('The sitemap index exceeds 50 MB; split this site by origin');
  files.set(`${basePath}/sitemap.xml`, index);
  return files;
}
