// No service SDK, endpoint, storage, or transport belongs to this module.
// The project adapter owns initialization, consent, and delivery.
const source = document.querySelector('#analytics-config');
if (source) {
  const page = Object.freeze(JSON.parse(source.textContent));
  let adapter;
  let ready = false;
  let enabled = true;
  const setEnabled = value => { if (typeof value === 'boolean') enabled = value; };
  const scalar = value => typeof value === 'string' ? value.slice(0, 256)
    : typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const propertiesOf = properties => Object.fromEntries(Object.entries(properties ?? {}).slice(0, 32).flatMap(([key, value]) => {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key) || ['constructor', 'prototype'].includes(key)) return [];
    const safe = Array.isArray(value) ? value.slice(0, 32).map(scalar).filter(value => value !== undefined) : scalar(value);
    return safe === undefined ? [] : [[key, safe]];
  }));
  const component = element => {
    if (!(element instanceof Element)) return {};
    const scope = element.closest('article, .examples, .side, .page-toc, .mast') ?? document.body;
    const heading = element.closest('article') ? [...document.querySelectorAll('article :is(h2,h3,h4)[id]')].filter(h => h.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1) : undefined;
    const kind = element.matches('.walkthrough') ? 'walkthrough' : element.matches('.doc-tabs') ? 'tabs' : element.matches('details') ? 'disclosure' : element.matches('.code-block') ? 'code' : 'control';
    const selector = kind === 'walkthrough' ? '.walkthrough' : kind === 'tabs' ? '.doc-tabs' : kind === 'disclosure' ? 'details' : kind === 'code' ? '.code-block' : 'a,button,select';
    const ordinal = [...scope.querySelectorAll(selector)].indexOf(element) + 1;
    return { componentId: element.dataset.analyticsId || element.id || `${heading?.id ?? 'page'}:${kind}:${ordinal}`, componentType: kind, ...(heading ? { headingId: heading.id } : {}) };
  };
  const track = (name, properties = {}, element) => {
    if (!ready || !enabled || typeof name !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(name)) return false;
    try {
      const event = { schemaVersion: 1, name, properties: { ...propertiesOf(properties), ...component(element), ...page } };
      Promise.resolve(adapter.track(event)).catch(() => {});
      return true;
    } catch { return false; }
  };
  globalThis.shoalrunAnalytics = Object.freeze({ track, setEnabled, get enabled() { return ready && enabled; } });

  // Links retain normal browser behavior, including keyboard and modified clicks.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const summary = target?.closest('summary');
    if (summary?.parentElement.matches('details.doc-collapsible, article details.doc-info-hint')) intendedDisclosures.add(summary.parentElement);
    const anchor = target?.closest('a[href]');
    if (!anchor || anchor.closest('.doc-tablist, .site-search-results') || anchor.matches('.heading-anchor')) return;
    const region = anchor.closest('.section-nav, .side, .page-toc, .doc-breadcrumbs, .related-reading, .doc-card, .hero-actions, .site-footer, .mast, article, .page-formats');
    if (!region) return;
    let url;
    try { url = new URL(anchor.href); } catch { return; }
    if (!['http:', 'https:'].includes(url.protocol)) return;
    const names = { 'section-nav': 'sections', side: 'sidebar', 'page-toc': 'toc', 'doc-breadcrumbs': 'breadcrumbs', 'related-reading': 'related', 'doc-card': 'card', 'hero-actions': 'hero', 'site-footer': 'footer', mast: 'header', 'page-formats': 'formats' };
    const regionName = Object.entries(names).find(([className]) => region.classList.contains(className))?.[1] ?? 'content';
    track('navigation_click', { region: regionName, targetPath: url.pathname, external: url.origin !== location.origin }, anchor);
  });
  const intendedDisclosures = new WeakSet();
  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!intendedDisclosures.has(details)) return;
    intendedDisclosures.delete(details);
    track('disclosure_toggle', { open: details.open }, details);
  }, true);

  // Import and init never block component scripts or normal navigation. Events
  // before readiness or while disabled are discarded rather than queued.
  import('./analytics-adapter.js').then(async module => {
    if (typeof module.track !== 'function') throw new Error('Missing track export');
    adapter = module;
    if (module.init !== undefined) {
      if (typeof module.init !== 'function') throw new Error('Invalid init export');
      await module.init(Object.freeze({ page, setEnabled, track }));
    }
    ready = true;
    track('page_view');
  }).catch(() => { enabled = false; });
}
