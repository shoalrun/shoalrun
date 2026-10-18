export type NotFoundAppearance = {
  stylesheets: Array<{ url: string; kind?: 'theme' | 'palette' }>;
  theme: string;
  palette: string;
  mode: 'light' | 'dark' | 'system';
  modeScript?: string;
  switcher?: { url: string; settings: string };
};
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function addNotFoundTwin(html: string, twin: string): string {
  return html.replace(/(<ul>[\s\S]*?<\/li>)/, match => `${match}<li><a href="${escape(twin)}"><span class="label">Read the HTML page<span aria-hidden="true">→</span></span><span class="description">The browser version of this page is still available.</span></a></li>`);
}

export function notFoundPage(basePath: string, home: string, markdown = false, twin?: string, search = true, appearance?: NotFoundAppearance): string {
  const links = [
    { title: 'Go to homepage', url: home },
    ...(twin ? [{ title: 'Read the HTML page', url: twin }] : []),
    { title: 'Documentation index', url: `${basePath}/${markdown ? 'llms.min.txt' : 'llms.txt'}` },
    ...(search ? [{ title: 'Search index', url: `${basePath}/${markdown ? 'search-index.min.json' : 'search-index.json'}` }] : [])
  ];
  if (markdown) return `# 404: Page not found\n\nTry one of these resources:\n\n${links.map(link => `- [${link.title}](${encodeURI(link.url).replace(/[()]/g, c => c === '(' ? '%28' : '%29')})`).join('\n')}\n`;
  const descriptions: Record<string, string> = {
    'Read the HTML page': 'The browser version of this page is still available.',
    'Documentation index': 'Browse the published pages and their summaries.',
    'Search index': 'Explore the downloadable index of documentation text.',
    'Go to homepage': 'Return to the beginning and choose a new path.'
  };
  const head = appearance ? `${appearance.modeScript ? `<script src="${escape(appearance.modeScript)}"></script>` : ''}${appearance.stylesheets.map(sheet => `<link rel="stylesheet" href="${escape(sheet.url)}"${sheet.kind ? ` data-theme-link="${sheet.kind}"` : ''}>`).join('')}${appearance.switcher ? `<script src="${escape(appearance.switcher.url)}" data-themes="${escape(appearance.switcher.settings)}"></script>` : ''}` : '';
  return `<!doctype html><html lang="en"${appearance ? ` data-theme="${escape(appearance.theme)}" data-palette="${escape(appearance.palette)}"` : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>404: Page not found</title>${head}<style>
:root{color-scheme:${appearance?.mode === 'system' || !appearance ? 'light dark' : appearance.mode};font-family:var(--font-body,ui-sans-serif),system-ui,sans-serif;color:var(--color-text,#193b33);background:var(--color-page,#f5f8f6);--surface:var(--color-surface,#fff);--muted:var(--color-muted,#526b62);--line:var(--color-border,#d4e2db);--accent:var(--color-link,#177866);--wash:var(--color-field-surface,#e8f2ed)}
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:clamp(1.25rem,5vw,4rem);background:radial-gradient(ellipse at 10% 0%,var(--wash),transparent 55%)}main{width:100%;max-width:46rem;padding:clamp(1.5rem,5vw,3.5rem);background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--radius-panel,.75rem)*2);box-shadow:0 20px 65px #173c3210}.status{display:inline-block;padding:.3rem .7rem;border-radius:2rem;background:var(--wash);color:var(--accent);font-size:.8rem;font-weight:750;letter-spacing:.08em}h1{font-family:var(--font-heading,inherit);font-size:clamp(2.2rem,6vw,3.8rem);line-height:1.1;letter-spacing:-.045em;margin:1.15rem 0}p{color:var(--muted);font-size:1.05rem;line-height:1.65;max-width:34rem;margin:0 0 2rem}ul{list-style:none;padding:0;margin:0;display:grid;gap:.7rem}li{margin:0}a{display:block;padding:1rem 1.2rem;border:1px solid var(--line);border-radius:var(--radius-panel,.85rem);text-decoration:none;color:inherit}a:hover{background:var(--wash);border-color:var(--accent)}a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}.label{font-family:var(--font-ui,var(--font-body,inherit));display:flex;justify-content:space-between;gap:1rem;color:var(--accent);font-weight:700}.description{display:block;margin-top:.3rem;color:var(--muted);font-size:.9rem;line-height:1.5}${appearance ? '' : '@media(prefers-color-scheme:dark){:root{color:#e1eee7;background:#10231e;--surface:#172f28;--muted:#b5c9bf;--line:#355448;--accent:#8dd9be;--wash:#213f33}}'}@media(max-width:400px){main{border-radius:var(--radius-panel,1rem)}a{padding:.85rem}}
</style></head><body><main><span class="status">404</span><h1>Page not found</h1><p>The page you’re looking for couldn’t be found. These links can help you find your way back.</p><ul>${links.map(link => `<li><a href="${escape(link.url)}"><span class="label">${escape(link.title)}<span aria-hidden="true">→</span></span><span class="description">${escape(descriptions[link.title])}</span></a></li>`).join('')}</ul></main></body></html>\n`;
}
