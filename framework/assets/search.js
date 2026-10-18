// Header search box. Retrieval comes from /assets/search-provider.js, which a project can replace.
import { appendHighlighted } from './search-highlight.js';
const siteRoot = new URL('../', import.meta.url);
const container = document.querySelector('.site-search');
const input = container?.querySelector('input');
const list = container?.querySelector('.site-search-results');
const status = container?.querySelector('.site-search-status');

if (container && input && list && status) {
  input.placeholder = 'Search';
  container.hidden = false;
  const context = { variant: container.dataset.variant, language: document.documentElement.lang, indexUrl: new URL('search-index.json', siteRoot).pathname, limit: 8, readerSelection: window.shoalrunReaderSelection ?? {} };
  let provider = null;
  let controller = null;
  let results = [];
  let active = -1;
  let analyticsTimer;
  const outcome = properties => {
    clearTimeout(analyticsTimer);
    analyticsTimer = setTimeout(() => globalThis.shoalrunAnalytics?.track('search_results', properties, input), 300);
  };

  const load = () => provider ??= import('./search-provider.js').then(module => {
    if (typeof module.search !== 'function') throw new Error('search-provider.js must export search(query, context)');
    return module;
  });
  const warm = () => load().then(module => module.prepare?.(context)).catch(() => {});

  const valid = result => result && typeof result.url === 'string' && typeof result.title === 'string'
    && (result.section === undefined || typeof result.section === 'string')
    && (result.summary === undefined || typeof result.summary === 'string')
    && (/^\/(?![\/\\])[^\\\u0000-\u001f]*$/.test(result.url) || /^https?:\/\/[^\s\\]+$/i.test(result.url));

  const setActive = index => {
    active = index;
    [...list.children].forEach((item, position) => item.setAttribute('aria-selected', String(position === active)));
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', `site-search-option-${active}`);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  };
  const show = (items, count) => {
    list.replaceChildren(...items);
    status.textContent = count === null ? 'Search is unavailable' : `${count} ${count === 1 ? 'result' : 'results'}`;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(count ? 0 : -1);
  };

  const render = async () => {
    clearTimeout(analyticsTimer);
    const query = input.value.trim();
    controller?.abort();
    if (!query) { results = []; list.replaceChildren(); status.textContent = ''; close(); return; }
    controller = new AbortController();
    const signal = controller.signal;
    try {
      const module = await load();
      const found = await module.search(query, { ...context, signal });
      if (signal.aborted) return;
      results = (Array.isArray(found) ? found : []).filter(valid).slice(0, context.limit);
    } catch (error) {
      if (signal.aborted) return;
      results = [];
      show([emptyResult('Search is unavailable right now.')], null);
      outcome({ queryLength: query.length, resultCount: 0, status: 'error' });
      return;
    }
    const terms = query.split(/\s+/).filter(Boolean);
    show(results.length ? results.map((result, index) => resultItem(result, index, terms))
      : [emptyResult(`No pages match “${query}”`)], results.length);
    outcome({ queryLength: query.length, resultCount: results.length, status: results.length ? 'results' : 'empty' });
  };

  const emptyResult = message => {
    const item = document.createElement('li');
    item.className = 'site-search-empty';
    item.setAttribute('role', 'presentation');
    item.textContent = message;
    return item;
  };
  const resultItem = (result, index, terms) => {
    const item = document.createElement('li');
    item.id = `site-search-option-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    const anchor = document.createElement('a');
    anchor.href = result.url;
    anchor.tabIndex = -1;
    anchor.addEventListener('click', () => {
      const url = new URL(anchor.href);
      globalThis.shoalrunAnalytics?.track('search_result_click', { queryLength: input.value.trim().length, resultIndex: index, targetPath: url.pathname }, anchor);
    });
    const title = document.createElement('span');
    title.className = 'search-hit-title';
    appendHighlighted(title, result.title, terms);
    if (result.section) {
      const section = document.createElement('span');
      section.className = 'search-hit-section';
      section.append(document.createTextNode(' › '));
      appendHighlighted(section, result.section, terms);
      title.append(section);
    }
    anchor.append(title);
    if (result.summary) {
      const summary = document.createElement('span');
      summary.className = 'search-hit-summary';
      appendHighlighted(summary, result.summary, terms);
      anchor.append(summary);
    }
    item.append(anchor);
    return item;
  };

  input.addEventListener('focus', () => { warm(); if (input.value.trim()) render(); });
  input.addEventListener('input', render);
  document.addEventListener('reader-view-change', event => { context.readerSelection = event.detail; if (input.value.trim()) render(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && results.length && list.hidden) {
      // Reopen the closed list before moving through it, so aria-activedescendant never points into a hidden listbox.
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      setActive(0);
      event.preventDefault();
    }
    else if (event.key === 'ArrowDown' && results.length) { setActive((active + 1) % results.length); event.preventDefault(); }
    else if (event.key === 'ArrowUp' && results.length && !list.hidden) { setActive((active - 1 + results.length) % results.length); event.preventDefault(); }
    else if (event.key === 'Enter' && active >= 0 && !list.hidden) { list.children[active].querySelector('a').click(); event.preventDefault(); }
    else if (event.key === 'Escape') {
      if (!list.hidden) close();
      else if (input.value) { input.value = ''; render(); }
      else input.blur();
      event.preventDefault();
    }
  });
  document.addEventListener('pointerdown', event => { if (!container.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
    if ((event.key === '/' && !typing) || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
      input.focus();
      input.select();
      event.preventDefault();
    }
  });
}
