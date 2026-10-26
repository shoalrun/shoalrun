import { resolveAgentDiscovery } from './agent-discovery.js';
import { navigationCounts } from './compiler-config.js';
import { navigationTab } from './project-navigation.js';
import type { Document, Frontmatter, NavigationNode, Variant } from './content-source.js';
import type { ApiShape, NamedExample } from './api.js';
import type { CodeSample } from './code-samples.js';
import { highlightedExample, type CodeHighlighter } from './highlight.js';
import { readerFilterAttribute, type ReaderFiltersConfig, type ReaderFilterControl } from './reader-filters.js';
import { surfaceText } from './surface-text.js';
import { normalizeBasePath, sitePath } from './site-path.js';
import { renderHtmlWithHeadings } from './html-renderer.js';

const variantKey = (variant: Variant) => `${variant.channel}|${variant.version}|${variant.language}`;
type PageConfig = { site?: { basePath?: unknown; agentDiscovery?: unknown }; readerFilters?: unknown; [key: string]: unknown };

export type SiteLink = { label: string; href: string };
export type HeaderConfig = { links: Array<SiteLink & { style: 'link' | 'button' | 'primary' }> };
export type FooterConfig = { columns: Array<{ title: string; links: SiteLink[] }>; links: SiteLink[]; text?: string };
export type PageShell = { preset?: string; palette?: string; themeCss?: boolean; paletteCss?: boolean; badgesCss?: boolean; themeSwitcher?: string; fontsCss?: boolean; preloadFont?: string; masthead?: string; share?: { route: string; generated: boolean }; favicon?: string; touchIcon?: boolean; origin?: string; indexing?: boolean; home?: boolean; mode?: 'light' | 'dark' | 'system'; toggle?: boolean; header?: HeaderConfig; footer?: FooterConfig; search?: boolean; publicationAlternates?: Array<{ label: string; url: string; current: boolean }>; breadcrumbs?: Array<{ label: string; url?: string }> };

// Header search is revealed by search.js; without scripts the sidebar filter still works.
function readerFilterSlot(control: ReaderFilterControl, esc: (s: string) => string): string {
  return `<div class="reader-filter-slot" data-reader-filter="${esc(JSON.stringify(control))}"></div>`;
}
function headerTools(shell: PageShell, variant: Variant, esc: (s: string) => string, readerConfig?: ReaderFiltersConfig) {
  const header = shell.header ?? { links: [] };
  const alternates = shell.publicationAlternates ?? [];
  const switcher = alternates.length > 1 ? `<nav class="publication-switcher" aria-label="Switch documentation version"><details><summary><span>Version</span><strong>${esc(alternates.find(item => item.current)?.label ?? '')}</strong></summary><ul>${alternates.map(item => `<li><a href="${esc(item.url)}"${item.current ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`).join('')}</ul></details></nav>` : '';
  const search = shell.search ? `<div class="site-search" data-variant="${esc(variantKey(variant))}" hidden><label class="site-search-label" for="site-search-input">Search documentation</label><input id="site-search-input" type="search" role="combobox" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-expanded="false" aria-controls="site-search-results"><kbd class="site-search-key" aria-hidden="true">/</kbd><ul id="site-search-results" class="site-search-results" role="listbox" aria-label="Search results" hidden></ul><p class="site-search-status" role="status"></p></div>` : '';
  const links = header.links.length ? `<nav class="header-actions" aria-label="Site links">${header.links.map(link => `<a class="header-${link.style}" href="${esc(link.href)}"${/^https?:/.test(link.href) ? ' rel="noopener"' : ''}>${esc(link.label)}</a>`).join('')}</nav>` : '';
  const toggle = shell.toggle ? `<button type="button" class="mode-toggle" aria-pressed="false" hidden><span class="mode-toggle-label">Dark mode</span><svg class="mode-icon-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="mode-icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg></button>` : '';
  const reader = readerConfig?.controls.header ? readerFilterSlot(readerConfig.controls.header, esc) : '';
  return switcher || search || links || toggle || reader ? `<div class="mast-tools">${switcher}${search}${reader}${toggle}${links}</div>` : '';
}

// Page types are kebab-case ids; the eyebrow shows them as words, such as "API reference".
// Text for a page's share card: the same title and description that link previews show.
export function shareCardText(doc: Document, config: PageConfig): { title: string; summary: string; type: string } {
  const title = String(doc.frontmatter.seo?.title ?? doc.frontmatter.title);
  const summary = surfaceText(doc.frontmatter, 'socialCard', config) ?? doc.frontmatter.seo?.description ?? surfaceText(doc.frontmatter, 'htmlDescription', config) ?? doc.frontmatter.summary ?? '';
  return { title, summary: String(summary), type: typeLabel(doc.frontmatter.type) };
}

export function typeLabel(type: string): string {
  const words = String(type).split('-').filter(Boolean).map(word => word === 'api' ? 'API' : word);
  const label = words.join(' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Request samples: one code block per language with a selector. Without JavaScript only the
// first sample (cURL) shows, matching the Markdown twin and the agent bundle.
function codeSamplesBlock(samples: CodeSample[], highlighter: CodeHighlighter | undefined, esc: (value: string) => string, idHint: string): string {
  const first = samples[0];
  if (!first) return '';
  if (samples.length === 1) return highlightedExample(first.code, first.highlight, highlighter);
  const id = `code-language-${idHint}`;
  const options = samples.map((sample, index) => `<option value="${esc(sample.language)}"${index === 0 ? ' selected' : ''}>${esc(sample.label)}</option>`).join('');
  const panes = samples.map((sample, index) => `<div class="code-sample" data-code-language="${esc(sample.language)}"${index === 0 ? '' : ' hidden'}>${highlightedExample(sample.code, sample.highlight, highlighter)}</div>`).join('');
  return `<div class="code-samples" data-code-samples><div class="code-samples-bar"><label for="${id}">Language</label><select id="${id}" hidden>${options}</select></div><div class="code-samples-panes">${panes}</div></div>`;
}

export function buildHtmlPage(doc: Document, tree: any, markdownUrl: string, siteTitle: string, navigation: NavigationNode[], examples: NamedExample[] = [], shapes: ApiShape[] = [], highlighter?: CodeHighlighter, editionLabel = '', customCss = false, shell: PageShell = {}, curl?: string, samples?: CodeSample[], config: PageConfig = {}): string {
  const panelExamples = examples.filter(example => example.location === 'request' || example.location === 'response');
  const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const sampleBlock = (list: CodeSample[] | undefined, fallbackCurl: string | undefined, idHint: string): string => list?.length ? codeSamplesBlock(list, highlighter, esc, idHint) : fallbackCurl ? highlightedExample(fallbackCurl, 'bash', highlighter) : '';
  const subjectLifecycleLabel = (subjectLifecycle: NonNullable<Frontmatter['subjectLifecycle']>) => ({ deprecated: 'Deprecated', 'in-development': 'In development', beta: 'Beta', experimental: 'Experimental' })[subjectLifecycle];
  const badge = (subjectLifecycle: Frontmatter['subjectLifecycle']) => subjectLifecycle ? `<span class="subject-lifecycle-badge subject-lifecycle-${subjectLifecycle}">${subjectLifecycleLabel(subjectLifecycle)}</span>` : '';
  const readerConfig = config.readerFilters as ReaderFiltersConfig | undefined;
  const basePath = normalizeBasePath(config.site?.basePath);
  const agent = resolveAgentDiscovery(config.site?.agentDiscovery);
  const agentLinks = `${agent.message ? `${esc(agent.message)} ` : ''}<a href="#main">${esc(agent.links.article)}</a>. <a href="/llms.min.txt">${esc(agent.links.index)}</a>. <a href="${esc(markdownUrl)}">${esc(agent.links.markdown)}</a>.`;
  const agentBlock = agent.mode === 'off' ? '' : agent.mode === 'disclosure'
    ? `<details class="agent-discovery agent-discovery-disclosure"><summary>${esc(agent.label)}</summary><div class="agent-discovery-body">${agentLinks}</div></details>`
    : `<div class="agent-discovery${agent.mode === 'visible' ? ' agent-discovery-visible' : ''}">${esc(agent.label)}: ${agentLinks}</div>`;
  const audienceLabels = doc.frontmatter.audiences?.filter(label => label.trim()) ?? [];
  const audienceBadges = audienceLabels.length ? `<div class="audience-labels" role="group" aria-label="Intended audience"><span class="audience-label-heading">For</span>${audienceLabels.map(label => `<span class="audience-badge">${esc(readerConfig?.facets.audience?.options[label] ?? label)}</span>`).join('')}</div>` : '';
  const title = doc.frontmatter.seo?.title ?? doc.frontmatter.title;
  const pageTitle = String(title).trim();
  const brandedTitle = `${pageTitle} | ${siteTitle.trim()}`;
  const socialTitle = !doc.frontmatter.seo?.title && pageTitle.length < 30 && brandedTitle.length <= 70 ? brandedTitle : pageTitle;
  const description = doc.frontmatter.seo?.description ?? surfaceText(doc.frontmatter, 'htmlDescription', config) ?? '';
  const socialDescription = shareCardText(doc, config).summary;
  const pageHeader = surfaceText(doc.frontmatter, 'pageHeader', config);
  const absolute = (route: string) => shell.origin ? `${shell.origin}${route}` : route;
  const social = `<meta property="og:type" content="website"><meta property="og:title" content="${esc(socialTitle)}">${shell.origin ? `<meta property="og:url" content="${esc(absolute(doc.route))}">` : ''}${shell.share ? `<meta property="og:image" content="${esc(absolute(shell.share.route))}">${shell.share.generated ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ''}` : ''}<meta name="twitter:title" content="${esc(socialTitle)}">${socialDescription ? `<meta name="twitter:description" content="${esc(socialDescription)}">` : ''}${shell.share ? `<meta name="twitter:image" content="${esc(absolute(shell.share.route))}"><meta name="twitter:card" content="summary_large_image">` : ''}`;
  const icons = `${shell.favicon ? `<link rel="icon" href="${esc(shell.favicon)}"${shell.favicon.endsWith('.svg') ? ' type="image/svg+xml"' : ''}>` : ''}${shell.touchIcon ? '<link rel="apple-touch-icon" href="/apple-touch-icon.png">' : ''}`;
  const footerLink = (link: SiteLink) => `<a href="${esc(link.href)}"${/^https?:/.test(link.href) ? ' rel="noopener"' : ''}>${esc(link.label)}</a>`;
  const footerConfig = shell.footer;
  // Site chrome like the header: HTML only, never part of the Markdown twin or search text.
  const footer = footerConfig ? `<footer class="site-footer"><div class="footer-inner">${footerConfig.columns.length ? `<div class="footer-columns">${footerConfig.columns.map((column, index) => `<section class="footer-column" aria-labelledby="footer-column-${index + 1}"><h2 class="footer-title" id="footer-column-${index + 1}">${esc(column.title)}</h2><ul>${column.links.map(link => `<li>${footerLink(link)}</li>`).join('')}</ul></section>`).join('')}</div>` : ''}${footerConfig.links.length || footerConfig.text ? `<div class="footer-bottom">${footerConfig.text ? `<p class="footer-text">${esc(footerConfig.text)}</p>` : ''}${footerConfig.links.length ? `<nav class="footer-links" aria-label="Footer"><ul>${footerConfig.links.map(link => `<li>${footerLink(link)}</li>`).join('')}</ul></nav>` : ''}</div>` : ''}</div></footer>` : '';
  const endpoint = doc.endpoint ? `<div class="endpoint-route" role="group" aria-label="${doc.endpoint.webhook ? 'Webhook event' : 'Endpoint'}"><span class="endpoint-method method-${esc(doc.endpoint.method.toLowerCase())}">${esc(doc.endpoint.webhook ? 'WEBHOOK' : doc.endpoint.method.toUpperCase())}</span><code>${esc(doc.endpoint.path)}</code>${panelExamples.length || shapes.length || curl ? '<a href="#examples-title">View examples</a>' : ''}</div>` : '';
  // The generated summary repeats the method and path that the endpoint row already shows.
  const routeSummary = doc.endpoint && pageHeader === (doc.endpoint.webhook ? `Webhook event: ${doc.endpoint.path}` : `${doc.endpoint.method.toUpperCase()} ${doc.endpoint.path}`);
  const date = doc.frontmatter.date ? `<time class="page-date" datetime="${esc(doc.frontmatter.date)}">${esc(doc.frontmatter.date)}</time>` : '';
  const changelogEntry = doc.frontmatter.type === 'changelog-entry';
  const updated = doc.frontmatter.updated && !(changelogEntry && doc.frontmatter.date) ? `<span class="page-date">Updated <time datetime="${esc(doc.frontmatter.updated)}">${esc(doc.frontmatter.updated.slice(0, 10))}</time></span>` : '';
  const releaseVersion = doc.frontmatter.releaseVersion ? `<span class="page-version">Version ${esc(doc.frontmatter.releaseVersion)}</span>` : '';
  const pageDates = changelogEntry ? `<div class="page-meta">${date}${updated}${releaseVersion}</div>` : `${date}${updated}${releaseVersion}`;
  const containsCurrent = (item: NavigationNode): boolean => item.route === doc.route || !!item.items?.some(containsCurrent);
  const activeTab = navigationTab(navigation, doc.route);
  const analyticsBootstrap = config.analytics ? `<script type="application/json" id="analytics-config">${JSON.stringify({ pageId: doc.frontmatter.id, pageUrl: doc.route, documentType: doc.frontmatter.type, channel: doc.variant.channel, version: doc.variant.version, language: doc.variant.language, ...(activeTab ? { navigationSectionId: activeTab.id } : {}) }).replaceAll('<', '\\u003c')}</script><script type="module" src="/assets/analytics.js"></script>` : '';
  const pageLayout = doc.frontmatter.layout ?? 'docs';
  const showNavigationTabs = doc.frontmatter.showNavigationTabs ?? (pageLayout === 'docs' || pageLayout === 'wide');
  const sectionLinks = navigation.filter(node => node.tab).map(node => `<a href="${esc(node.route!)}"${node === activeTab ? ' aria-current="true"' : ''}>${esc(node.label)}</a>`).join('');
  const sectionNavigation = showNavigationTabs && sectionLinks ? `<nav class="section-nav" aria-label="Documentation sections"><details class="section-disclosure" open><summary>Sections${activeTab ? ` · ${esc(activeTab.label)}` : ''}</summary><div class="section-nav-links">${sectionLinks}</div></details></nav>` : '';
  const sidebarNavigation = navigation.flatMap(node => node.tab ? node === activeTab ? node.items ?? [] : [] : [node]);
  const leafCount = (items: NavigationNode[]): number => items.reduce((total, item) => total + (item.items ? leafCount(item.items) : item.route ? 1 : 0), 0);
  const expandSmallNavigation = leafCount(sidebarNavigation) <= 12;
  const renderNav = (items: NavigationNode[], ancestors: string[] = []): string => items.map(item => {
    if (item.items?.length) {
      return `<li class="nav-group"><details${expandSmallNavigation || containsCurrent(item) ? ' open' : ''}><summary>${esc(item.label)}${navigationCounts(config.outputs) ? ` <span class="nav-count">${leafCount(item.items)}</span>` : ''}</summary><ul>${renderNav(item.items, [...ancestors, item.label])}</ul></details></li>`;
    }
    if (!item.route) return '';
    const search = [...ancestors, item.label, item.search ?? ''].join(' ');
    const method = item.method ? `<span class="endpoint-method method-${esc(item.method.toLowerCase())}">${esc(item.webhook ? 'WEBHOOK' : item.method.toUpperCase())}</span>` : '';
    const deprecated = item.subjectLifecycle === 'deprecated';
    const label = item.method || deprecated ? `<span class="nav-entry-label">${esc(item.label)}</span>` : esc(item.label);
    const status = deprecated ? '' : badge(item.subjectLifecycle);
    return `<li class="nav-entry${deprecated ? ' nav-deprecated' : ''}" data-search="${esc(search)}"${config.readerFilters ? ` data-reader-filters="${esc(readerFilterAttribute(item.readerFilters ?? {}))}"` : ''}><a href="${esc(item.route)}"${item.route === doc.route ? ' aria-current="page"' : ''}>${method}${label}${status}</a></li>`;
  }).join('');
  const readerControls = readerConfig?.controls.sidebar ? readerFilterSlot({ display: 'checks', label: 'Reader view' }, esc) : '';
  const nav = `<details class="nav-disclosure" open><summary>Menu</summary><div class="nav-body"><a class="region-return" href="#main" data-region-return>Back to article</a><div class="nav-tools"><h2>Explore</h2>${readerControls}<div class="nav-search" hidden><label for="nav-filter">Filter navigation</label><input id="nav-filter" type="search" autocomplete="off"><p class="nav-filter-status" role="status" aria-live="polite"></p></div></div><ul class="nav-tree">${renderNav(sidebarNavigation)}</ul></div></details>`;
  const readerBanner = readerConfig ? '<aside class="reader-outside-view" role="status" hidden></aside>' : '';
const readerBootstrap = readerConfig ? `<script type="application/json" id="reader-filter-config">${JSON.stringify({ facets: readerConfig.facets, storageKey: `shoalrun-reader-view:${basePath || '/'}`, moduleUrl: readerConfig.module ? sitePath(basePath, '/assets/reader-view-custom.js') : null }).replaceAll('<', '\\u003c')}</script><script type="module" src="/assets/reader-filters.js"></script>` : '';
  const groups = new Map<string, { label: string; entries: NamedExample[] }>();
  for (const example of panelExamples) {
    const key = [example.location, example.status ?? '', example.mediaType ?? ''].join('|');
    let label: string;
    if (example.location === 'request') label = `Request · ${example.mediaType ?? 'unspecified media type'}`;
    else if (example.location === 'response') label = `Response ${example.status ?? 'default'} · ${example.mediaType ?? 'unspecified media type'}`;
    else {
      const [, where, ...name] = example.location.split(':');
      label = `${where ? where[0].toUpperCase() + where.slice(1) : 'Parameter'} parameter · ${name.join(':')}`;
    }
    const group = groups.get(key) ?? { label, entries: [] };
    group.entries.push(example);
    groups.set(key, group);
  }
  const namedGroups = [...groups.values()].map(({ label, entries }, index) => {
    const groupId = `example-group-${index + 1}`;
    const compact = entries.length > 3;
    const picker = compact ? `<div class="example-picker" hidden><label for="example-select-${index + 1}">Named example</label><select id="example-select-${index + 1}">${entries.map(example => `<option value="${esc(example.id)}">${esc(example.title)}${example.title === example.key ? '' : ` (${esc(example.key)})`}</option>`).join('')}</select></div>` : '';
    return `<section class="example-group" aria-labelledby="${groupId}"${compact ? ' data-compact=""' : ''}><h3 id="${groupId}">${esc(label)}</h3><p class="example-choices">${compact ? `${entries.length} named examples` : `Available examples: ${entries.map(example => esc(example.title)).join(' · ')}`}</p>${picker}${entries.map((example, exampleIndex) => {
      const value = example.externalValue ? `<p><a href="${esc(example.externalValue)}">Open external example</a></p>` : highlightedExample(typeof example.value === 'string' && example.mediaType?.startsWith('text/') ? example.value : JSON.stringify(example.value, null, 2), example.mediaType?.startsWith('text/') && typeof example.value === 'string' ? 'text' : 'json', highlighter);
      const context = [example.status, example.mediaType, example.location.startsWith('parameter:') ? example.location : null].filter(Boolean).join(' · ');
      const keyLabel = example.title === example.key ? '' : `<span class="example-key">${esc(example.key)}</span>`;
      return `<details id="${esc(example.id)}" name="${groupId}"${exampleIndex === 0 ? ' open' : ''}><summary>${esc(example.title)}${keyLabel}</summary><div class="example-body"><p class="example-context">${esc(context)}</p>${example.description ? `<p>${esc(example.description)}</p>` : ''}<p class="example-provenance">${esc(example.provenance)}</p>${value}${example.curl ? `<h4>Request sample</h4>${sampleBlock(example.samples, example.curl, example.id)}` : ''}<a class="example-link" href="#${esc(example.id)}">Link to this example</a></div></details>`;
    }).join('')}</section>`;
  }).join('');
  const shapeGroups = shapes.map((shape, index) => {
    const label = shape.location === 'request' ? `Request · ${shape.mediaType}` : `Response ${shape.status ?? 'default'} · ${shape.mediaType}`;
    return `<section class="shape-group" aria-labelledby="shape-group-${index + 1}"><h3 id="shape-group-${index + 1}">${esc(label)}</h3>${highlightedExample(JSON.stringify(shape.value, null, 2), 'json', highlighter)}</section>`;
  }).join('');
  const chooser = shapes.length && (panelExamples.length || curl) ? '<div class="api-view-control" hidden><label for="api-view-select">Show</label><select id="api-view-select"><option value="shape">JSON shape</option><option value="examples">Examples</option></select></div>' : '';
  const operationSample = sampleBlock(samples, curl, 'operation');
  const panel = shapes.length || panelExamples.length || curl ? `<section class="examples" aria-labelledby="examples-title" tabindex="0"><div class="examples-heading"><h2 id="examples-title">API data</h2><button type="button" class="examples-expand" aria-pressed="false">Expand</button></div>${chooser}${shapes.length ? `<div class="api-data-view" data-api-view="shape"><p>Type placeholders show the JSON structure. Required and optional fields are described in the reference.</p>${shapeGroups}</div>` : ''}${panelExamples.length || curl ? `<div class="api-data-view" data-api-view="examples"><p>Examples from OpenAPI. Generated samples have not been executed.</p>${curl ? `<section class="example-group"><h3>Example request</h3>${operationSample}</section>` : ''}${namedGroups}</div>` : ''}</section>` : '';
  const sectionIds: string[] = [];
  const findSections = (node: any) => { if (node?.type === 'docSection' && node.sectionId) sectionIds.push(node.sectionId); for (const child of node?.children ?? []) findSections(child); };
  findSections(doc.tree);
  const repeated = sectionIds.find((id, index) => sectionIds.indexOf(id) !== index);
  if (repeated) throw new Error(`${doc.file}: <Section> id "${repeated}" is used more than once`);
  const reservedIds = ['main', 'docs-navigation', 'page-outline', 'nav-filter', 'examples-title', 'api-view-select', ...sectionIds,
    ...panelExamples.map(example => example.id),
    ...[...groups.keys()].map((_, index) => `example-group-${index + 1}`),
    ...shapes.map((_, index) => `shape-group-${index + 1}`)];
  const { html: article, headings } = renderHtmlWithHeadings(tree, highlighter, reservedIds);
  const jumpEntries = doc.endpoint ? headings.filter(item => item.depth === 3 && ['Servers', 'Authentication', 'Parameters', 'Request body', 'Responses'].includes(item.title)) : [];
  const jumps = jumpEntries.length ? `<nav class="api-jumps" aria-label="On this page"><span>On this page</span>${jumpEntries.map(item => `<a href="#${encodeURIComponent(item.id)}">${esc(item.title)}</a>`).join('')}${panel ? '<a class="api-jumps-examples" href="#examples-title">Examples</a>' : ''}</nav>` : '';
  // wide, landing, and splash pages drop the outline; landing and splash also drop the sidebar, and a Hero replaces the page header.
  const layout = doc.frontmatter.layout ?? 'docs';
  const hero = (layout === 'landing' || layout === 'splash') && article.includes('data-hero');
  const depth = layout === 'docs' ? doc.frontmatter.tocDepth ?? 3 : 0;
  // Endpoint pages hide the method-and-path heading in favor of the endpoint row, so the outline skips it too.
  const operationHeading = doc.endpoint ? (doc.endpoint.webhook ? `Webhook: ${doc.endpoint.path}` : `${doc.endpoint.method.toUpperCase()} ${doc.endpoint.path}`) : undefined;
  const entries = headings.filter(item => item.depth <= depth && !(item.depth === 2 && item.title === operationHeading));
  const toc = entries.length ? `<nav class="page-toc" id="page-outline" aria-label="On this page" tabindex="-1"><details class="toc-disclosure" open><summary>On this page</summary><h2>On this page</h2><a class="region-return" href="#main" data-region-return>Back to article</a><ul>${entries.map(item => `<li class="toc-depth-${item.depth}"><a href="#${encodeURIComponent(item.id)}">${esc(item.title)}</a></li>`).join('')}</ul></details></nav>` : '';
  const side = layout === 'landing' || layout === 'splash' ? '' : `<nav class="side" id="docs-navigation" aria-label="Documentation" tabindex="-1">${nav}</nav>`;
  const shortcuts = side || toc ? `<nav class="page-shortcuts" aria-label="Page shortcuts">${side ? '<a href="#docs-navigation" data-region-jump>Documentation navigation</a>' : ''}${toc ? '<a href="#page-outline" data-region-jump>On this page</a>' : ''}</nav>` : '';
  const rail = toc || panel ? `<aside class="page-rail">${doc.endpoint ? `${panel}${toc}` : `${toc}${panel}`}</aside>` : '';
  const breadcrumbs = (shell.breadcrumbs?.length ?? 0) > 1 && !hero ? `<nav class="doc-breadcrumbs" aria-label="Breadcrumb"><ol>${shell.breadcrumbs!.map((item, index) => `<li>${index === shell.breadcrumbs!.length - 1 ? `<span aria-current="page">${esc(item.label)}</span>` : item.url ? `<a href="${esc(item.url)}">${esc(item.label)}</a>` : `<span>${esc(item.label)}</span>`}</li>`).join('')}</ol></nav>` : '';
  const markup = `<!doctype html><html lang="${esc(doc.variant.language)}"${shell.themeCss || shell.paletteCss ? ` data-theme="${esc(shell.preset ?? 'shoal')}" data-palette="${esc(shell.palette ?? '')}"` : ''}${shell.masthead ? ` data-masthead="${esc(shell.masthead)}"` : ''}${layout === 'docs' ? '' : ` data-layout="${layout}"`}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="${shell.mode === 'system' ? 'light dark' : shell.mode ?? 'light'}">${shell.indexing === false || doc.frontmatter.seo?.noindex === true ? '<meta name="robots" content="noindex">' : ''}${shell.origin ? `<link rel="canonical" href="${esc(absolute(doc.route))}">` : ''}${shell.toggle ? '<script src="/assets/mode.js"></script>' : ''}<title>${esc(String(title))}</title>${description ? `<meta name="description" content="${esc(String(description))}">` : ''}${socialDescription ? `<meta property="og:description" content="${esc(socialDescription)}">` : ''}${social}<link rel="alternate" type="text/markdown" href="${esc(markdownUrl)}"><link rel="describedby" href="/llms.min.txt" title="Documentation index">${icons}${shell.preloadFont ? `<link rel="preload" href="/assets/fonts/${esc(shell.preloadFont)}" as="font" type="font/woff2" crossorigin>` : ''}<link rel="stylesheet" href="/assets/site.css">${article.includes('data-theme-preview') ? '<link rel="stylesheet" href="/assets/theme-preview.css">' : ''}${shell.themeCss ? '<link rel="stylesheet" href="/assets/theme.css" data-theme-link="theme">' : ''}${shell.paletteCss ? '<link rel="stylesheet" href="/assets/palette.css" data-theme-link="palette">' : ''}${shell.badgesCss ? '<link rel="stylesheet" href="/assets/badges.css">' : ''}${shell.themeSwitcher ? `<script src="/assets/theme-switcher.js" data-themes="${esc(shell.themeSwitcher)}"></script>` : ''}${shell.fontsCss ? '<link rel="stylesheet" href="/assets/fonts.css">' : ''}${customCss ? '<link rel="stylesheet" href="/assets/project.css">' : ''}</head><body><a class="skip" href="#main">Skip to content</a>${agent.mode === 'disclosure' ? '' : agentBlock}<header class="mast"><div class="mast-inner">${shell.home ? `<a class="brand" href="/">${esc(siteTitle)}</a>` : `<span class="brand">${esc(siteTitle)}</span>`}${editionLabel && (shell.publicationAlternates?.length ?? 0) < 2 ? `<span class="edition">${esc(editionLabel)}</span>` : ''}${headerTools(shell, doc.variant, esc, readerConfig)}${agent.mode === 'disclosure' ? agentBlock : ''}</div></header>${sectionNavigation}${shortcuts}<div class="layout${layout === 'docs' ? '' : ` layout-${layout}`}${rail ? ' has-rail' : ''}${panel ? ' has-examples' : ''}${doc.endpoint ? ' api-reference' : ''}"><main id="main" class="content" tabindex="-1" data-document-type="${esc(doc.frontmatter.type)}"${readerConfig ? ` data-reader-page="${esc(readerFilterAttribute(doc.readerFilters ?? {}))}"` : ''}>${breadcrumbs}${hero ? '' : `<header class="page-head"><span class="eyebrow">${esc(typeLabel(doc.frontmatter.type))}</span>${doc.endpoint ? '' : badge(doc.frontmatter.subjectLifecycle)}<h1>${esc(doc.frontmatter.title)}${doc.endpoint ? badge(doc.frontmatter.subjectLifecycle) : ''}</h1>${pageHeader && !routeSummary ? `<p class="summary">${esc(pageHeader)}</p>` : ''}${pageDates}${endpoint}${audienceBadges}</header>`}${hero ? '' : `<div class="page-formats"><a class="formats" href="${esc(markdownUrl)}">Read as Markdown</a><button type="button" class="formats" data-copy-markdown hidden>Copy as Markdown</button><span role="status" data-copy-markdown-status></span></div>`}${jumps}${readerBanner}<article>${article}</article></main>${rail}${side}</div>${footer}${analyticsBootstrap}${readerBootstrap}<script type="module" src="/assets/copy-markdown.js"></script><script type="module" src="/assets/navigation.js"></script><script type="module" src="/assets/reader.js"></script><script type="module" src="/assets/tabs.js"></script>${shell.search ? '<script type="module" src="/assets/search.js"></script>' : ''}${article.includes('data-tooltip') ? '<script type="module" src="/assets/tooltips.js"></script>' : ''}${article.includes('data-component-module') ? '<script type="module" src="/assets/components.js"></script>' : ''}${article.includes('data-file-tree') ? '<script type="module" src="/assets/file-tree.js"></script>' : ''}${article.includes('data-image-expand') ? '<script type="module" src="/assets/image-viewer.js"></script>' : ''}${article.includes('data-table-filter') || article.includes('data-definition-filter') ? '<script type="module" src="/assets/table-filter.js"></script>' : ''}${article.includes('data-walkthrough') ? '<script type="module" src="/assets/walkthrough.js"></script>' : ''}${article.includes('data-cookbook-chooser') ? '<script type="module" src="/assets/cookbook-chooser.js"></script>' : ''}${article.includes('data-theme-preview') ? '<script type="module" src="/assets/theme-preview.js"></script>' : ''}${panel ? '<script type="module" src="/assets/example-panel.js"></script>' : ''}${panel.includes('data-code-samples') ? '<script type="module" src="/assets/code-samples.js"></script>' : ''}</body></html>`;
  return basePath ? markup.replace(/((?:href|src)=")\/(assets\/|llms(?:\.min)?\.txt|apple-touch-icon\.png)/g, `$1${basePath}/$2`).replace('href="/"', `href="${basePath}/"`) : markup;
}
