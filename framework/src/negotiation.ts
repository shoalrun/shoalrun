export type PublishedRoute = { url: string; markdownUrl: string };

export function homeUrl(documents: Array<{ id?: string; url: string }>): string | undefined {
  return (documents.find(item => item.id === 'guide.overview') ?? documents.find(item => item.url === '/reference') ?? documents[0])?.url;
}

function quality(accept: string, mediaType: string): number {
  let exact: number | undefined;
  let wildcard: number | undefined;
  for (const entry of accept.split(',')) {
    const [type, ...parameters] = entry.trim().toLowerCase().split(';').map(part => part.trim());
    if (type !== mediaType && type !== 'text/*' && type !== '*/*') continue;
    const q = parameters.find(part => part.startsWith('q='));
    const value = q ? Number(q.slice(2)) : 1;
    if (!Number.isFinite(value) || value < 0 || value > 1) continue;
    if (type === mediaType) exact = Math.max(exact ?? 0, value);
    else wildcard = Math.max(wildcard ?? 0, value);
  }
  return exact ?? wildcard ?? 0;
}

export function wantsMarkdown(accept: string | undefined): boolean {
  if (!accept) return false;
  if (!accept.split(',').some(entry => entry.trim().toLowerCase().split(';')[0].trim() === 'text/markdown')) return false;
  const markdown = quality(accept, 'text/markdown');
  return markdown > 0 && markdown >= quality(accept, 'text/html');
}

export function negotiatedDocument(pathname: string, accept: string | undefined, documents: PublishedRoute[]): PublishedRoute | undefined {
  const route = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  if (!wantsMarkdown(accept)) return undefined;
  return documents.find(document => document.url === route);
}
