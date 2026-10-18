// Reader views are presentation filters. Published pages remain available at their URLs.
const source = document.querySelector('#reader-filter-config');
if (source) {
  const config = JSON.parse(source.textContent);
  const facets = config.facets;
  const slots = [...document.querySelectorAll('[data-reader-filter]')];
  const page = document.querySelector('[data-reader-page]');
  const banner = document.querySelector('.reader-outside-view');
  if (banner) {
    const message = document.createElement('p');
    const actions = document.createElement('div');
    for (const [attribute, label] of [['data-reader-switch', 'Switch to this page’s view'], ['data-reader-reset', 'Show all']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute(attribute, '');
      button.textContent = label;
      actions.append(button);
    }
    banner.append(message, actions);
  }
  const parseData = value => {
    try { return JSON.parse(value || '{}'); } catch { return {}; }
  };
  const pageFilters = parseData(page?.dataset.readerPage);
  const controlScope = slot => parseData(slot.dataset.readerFilter).scope === 'page' ? 'page' : 'site';
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const mountControl = (slot, index) => {
    const control = parseData(slot.dataset.readerFilter);
    const names = control.facet ? [control.facet] : Object.keys(facets);
    const checks = control.display === 'checks';
    const wrapper = make(checks ? 'details' : 'div', checks ? 'reader-filter-controls' : 'reader-filter-control');
    if (checks) {
      const summary = make('summary', '', control.label || 'Reader view');
      summary.append(make('span', 'reader-view-label', 'All content'));
      wrapper.append(summary);
    } else if (control.label && names.length > 1) wrapper.append(make('span', 'reader-filter-title', control.label));
    for (const facet of names) {
      const definition = facets[facet];
      if (!definition) continue;
      if (checks) {
        const fieldset = make('fieldset');
        fieldset.dataset.readerFacet = facet;
        fieldset.append(make('legend', '', definition.label));
        for (const [value, title] of Object.entries(definition.options)) {
          const label = make('label');
          const input = make('input');
          input.type = 'checkbox';
          input.value = value;
          label.append(input, make('span', '', title));
          fieldset.append(label);
        }
        wrapper.append(fieldset);
      } else {
        const field = make('div', 'reader-filter-field');
        field.dataset.readerFacet = facet;
        const id = `reader-filter-${index}-${facet}`;
        const label = make('label', '', control.label && names.length === 1 ? control.label : definition.label);
        label.htmlFor = id;
        const select = make('select');
        select.id = id;
        const all = make('option', '', 'All');
        all.value = '';
        select.append(all);
        const multiple = make('option', '', 'Multiple selected');
        multiple.value = '__multiple__';
        multiple.disabled = true;
        select.append(multiple);
        for (const [value, title] of Object.entries(definition.options)) {
          const option = make('option', '', title);
          option.value = value;
          select.append(option);
        }
        field.append(label, select);
        wrapper.append(field);
      }
    }
    if (checks) {
      const actions = make('div', 'reader-filter-actions');
      const reset = make('button', '', 'Show all');
      reset.type = 'button';
      reset.dataset.readerReset = '';
      const copy = make('button', '', 'Copy view link');
      copy.type = 'button';
      copy.dataset.readerCopy = '';
      actions.append(reset, copy);
      if (control.scope === 'page') {
        const inherit = make('button', '', 'Follow site view');
        inherit.type = 'button';
        inherit.dataset.readerInherit = '';
        actions.append(inherit);
      }
      const status = make('span', 'reader-filter-status');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      wrapper.append(actions, status);
    }
    slot.replaceChildren(wrapper);
  };
  slots.forEach(mountControl);
  const validateSelection = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Reader selection must map facets to choice lists');
    const result = {};
    for (const [facet, choices] of Object.entries(value)) {
      if (!Object.hasOwn(facets, facet) || !Array.isArray(choices) || new Set(choices).size !== choices.length || choices.some(choice => typeof choice !== 'string' || !Object.hasOwn(facets[facet].options, choice))) {
        throw new Error(`Invalid reader selection for ${facet}`);
      }
      if (choices.length) result[facet] = [...choices];
    }
    return result;
  };
  const knownSelection = value => {
    try { return validateSelection(value); } catch { return {}; }
  };
  const parseView = value => {
    if (value === 'all') return {};
    if (!value) return null;
    const selection = {};
    for (const part of value.split(';')) {
      const [facet, values, extra] = part.split(':');
      if (extra !== undefined || !Object.hasOwn(facets, facet) || Object.hasOwn(selection, facet) || !values) return null;
      selection[facet] = values.split(',');
    }
    try { return validateSelection(selection); } catch { return null; }
  };
  const formatView = selection => Object.entries(selection).filter(([, values]) => values.length).map(([facet, values]) => `${facet}:${values.join(',')}`).join(';') || 'all';
  const matches = (required, selection) => Object.entries(required).every(([facet, values]) => !selection[facet]?.length || values.some(value => selection[facet].includes(value)));
  const describe = selection => Object.entries(selection).flatMap(([facet, values]) => values.map(value => facets[facet].options[value]));
  const url = new URL(location.href);
  const fromUrl = url.searchParams.has('view') ? parseView(url.searchParams.get('view')) : null;
  const fromPageUrl = url.searchParams.has('pageView') ? parseView(url.searchParams.get('pageView')) : null;
  let stored = null;
  try { stored = localStorage.getItem(config.storageKey); } catch { /* Storage may be disabled. */ }
  let selected = knownSelection(fromUrl ?? parseView(stored) ?? {});
  let pageOverride = fromPageUrl !== null;
  let pageSelected = knownSelection(fromPageUrl ?? {});
  const apply = () => {
    const active = Object.keys(selected).length > 0;
    const outside = active && !matches(pageFilters, selected);
    const localSelection = pageOverride ? pageSelected : selected;
    const localActive = Object.keys(localSelection).length > 0;
    window.shoalrunReaderSelection = structuredClone(selected);
    window.shoalrunReaderPageSelection = structuredClone(localSelection);
    for (const entry of document.querySelectorAll('.nav-entry[data-reader-filters]')) {
      entry.dataset.readerHidden = String(active && !matches(parseData(entry.dataset.readerFilters), selected));
    }
    for (const item of document.querySelectorAll('.reader-section, .doc-card[data-reader-filters], .related-reading li[data-reader-filters]')) {
      item.hidden = (!outside || pageOverride) && localActive && !matches(parseData(item.dataset.readerFilters), localSelection);
    }
    let linkedSection = false;
    if ((!outside || pageOverride) && location.hash) {
      let id = location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Keep literal fragment. */ }
      const containing = document.getElementById(id)?.closest('.reader-section[hidden]');
      if (containing) { containing.hidden = false; linkedSection = true; }
    }
    if (banner) {
      banner.hidden = !outside && !linkedSection;
      const message = banner.querySelector('p');
      if (message) message.textContent = linkedSection
        ? 'This linked section is outside your current reader view. It is shown so the link still works.'
        : pageOverride
          ? 'This page is outside your site reader view. The page-only view is active here.'
          : 'This page is outside your current reader view. Its full content is shown so this link still works.';
    }
    for (const slot of slots) {
      const control = slot.firstElementChild;
      const controlSelection = controlScope(slot) === 'page' ? localSelection : selected;
      for (const field of control.querySelectorAll('[data-reader-facet]')) {
        const values = controlSelection[field.dataset.readerFacet] ?? [];
        const select = field.querySelector('select');
        if (select) select.value = values.length > 1 ? '__multiple__' : values[0] ?? '';
        for (const input of field.querySelectorAll('input[type="checkbox"]')) input.checked = values.includes(input.value);
      }
      const label = control.querySelector('.reader-view-label');
      if (label) label.textContent = Object.keys(controlSelection).length ? describe(controlSelection).join(', ') : 'All content';
    }
    for (const choice of document.querySelectorAll('.reader-choice')) {
      const required = parseData(choice.dataset.readerChoice);
      const choiceSelection = choice.dataset.readerScope === 'page' ? localSelection : selected;
      choice.setAttribute('aria-pressed', String(Object.entries(required).every(([facet, values]) => values.every(value => choiceSelection[facet]?.includes(value)))));
    }
    document.dispatchEvent(new CustomEvent('reader-view-change', { detail: structuredClone(selected) }));
    document.dispatchEvent(new CustomEvent('reader-page-view-change', { detail: structuredClone(localSelection) }));
  };
  const choose = next => {
    const before = formatView(selected);
    selected = validateSelection(next);
    try { localStorage.setItem(config.storageKey, formatView(selected)); } catch { /* View still works. */ }
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('view', formatView(selected));
    history.replaceState(history.state, '', nextUrl);
    apply();
    if (before !== formatView(selected)) globalThis.shoalrunAnalytics?.track('reader_filter_change', { scope: 'site', ...Object.fromEntries(Object.entries(selected).map(([key, value]) => [`filter_${key.replaceAll('-', '_')}`, value])) });
  };
  const choosePage = next => {
    const changed = !pageOverride || formatView(pageSelected) !== formatView(validateSelection(next));
    pageSelected = validateSelection(next);
    pageOverride = true;
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('pageView', formatView(pageSelected));
    history.replaceState(history.state, '', nextUrl);
    apply();
    if (changed) globalThis.shoalrunAnalytics?.track('reader_filter_change', { scope: 'page', ...Object.fromEntries(Object.entries(pageSelected).map(([key, value]) => [`filter_${key.replaceAll('-', '_')}`, value])) });
  };
  const inheritSiteView = () => {
    const changed = pageOverride;
    pageOverride = false;
    pageSelected = {};
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.delete('pageView');
    history.replaceState(history.state, '', nextUrl);
    apply();
    if (changed) globalThis.shoalrunAnalytics?.track('reader_filter_change', { scope: 'page', inherit: true });
  };
  if (fromUrl !== null) {
    try { localStorage.setItem(config.storageKey, formatView(selected)); } catch { /* Optional persistence. */ }
  } else if (stored !== null) {
    url.searchParams.set('view', formatView(selected));
    history.replaceState(history.state, '', url);
  }
  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const field = target.closest('[data-reader-filter] [data-reader-facet]');
    if (!field) return;
    const values = target instanceof HTMLSelectElement ? target.value ? [target.value] : []
      : [...field.querySelectorAll('input:checked')].map(input => input.value);
    const pageControl = controlScope(target.closest('[data-reader-filter]')) === 'page';
    const base = pageControl ? pageOverride ? pageSelected : selected : selected;
    (pageControl ? choosePage : choose)({ ...base, [field.dataset.readerFacet]: values });
  });
  document.addEventListener('click', async event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    if (button.matches('[data-reader-reset]')) {
      const slot = button.closest('[data-reader-filter]');
      (slot && controlScope(slot) === 'page' ? choosePage : choose)({});
    }
    else if (button.matches('[data-reader-inherit]')) inheritSiteView();
    else if (button.matches('[data-reader-switch]')) {
      const next = { ...selected };
      for (const [facet, values] of Object.entries(pageFilters)) if (!next[facet]?.some(value => values.includes(value))) next[facet] = [values[0]];
      choose(next);
    } else if (button.matches('.reader-choice')) {
      const pageChoice = button.dataset.readerScope === 'page';
      (pageChoice ? choosePage : choose)({ ...(pageChoice ? pageOverride ? pageSelected : selected : selected), ...parseData(button.dataset.readerChoice) });
    }
    else if (button.matches('[data-reader-copy]')) {
      const status = button.closest('[data-reader-filter]')?.querySelector('.reader-filter-status');
      try { await navigator.clipboard.writeText(location.href); if (status) status.textContent = 'View link copied.'; }
      catch { if (status) status.textContent = 'Copy this page’s URL to share the view.'; }
    }
  });
  window.addEventListener('hashchange', apply);
  window.addEventListener('popstate', () => {
    const nextUrl = new URL(location.href);
    selected = knownSelection(parseView(nextUrl.searchParams.get('view')) ?? {});
    const nextPage = nextUrl.searchParams.has('pageView') ? parseView(nextUrl.searchParams.get('pageView')) : null;
    pageOverride = nextPage !== null;
    pageSelected = knownSelection(nextPage ?? {});
    apply();
  });
  const api = Object.freeze({
    facets: structuredClone(facets),
    getSelection: () => structuredClone(selected),
    setSelection: (next, options = {}) => choose(options.merge ? { ...selected, ...next } : next),
    reset: () => choose({}),
    getPageSelection: () => structuredClone(pageOverride ? pageSelected : selected),
    setPageSelection: (next, options = {}) => choosePage(options.merge ? { ...(pageOverride ? pageSelected : selected), ...next } : next),
    resetPage: () => choosePage({}),
    inheritSiteView,
    subscribe: listener => {
      if (typeof listener !== 'function') throw new Error('Reader view listener must be a function');
      const onChange = event => listener(structuredClone(event.detail));
      document.addEventListener('reader-view-change', onChange);
      listener(structuredClone(selected));
      return () => document.removeEventListener('reader-view-change', onChange);
    },
    subscribePage: listener => {
      if (typeof listener !== 'function') throw new Error('Reader page view listener must be a function');
      const onChange = event => listener(structuredClone(event.detail));
      document.addEventListener('reader-page-view-change', onChange);
      listener(structuredClone(pageOverride ? pageSelected : selected));
      return () => document.removeEventListener('reader-page-view-change', onChange);
    },
    shareUrl: () => {
      const link = new URL(location.href);
      link.searchParams.set('view', formatView(selected));
      return link.href;
    }
  });
  window.shoalrunReaderViews = api;
  apply();
  document.dispatchEvent(new CustomEvent('reader-views-ready', { detail: api }));
  if (config.moduleUrl) import(config.moduleUrl).then(module => {
    const mount = module.mountReaderViews ?? module.default;
    if (typeof mount !== 'function') throw new Error('readerFilters.module must export mountReaderViews(api) or a default function');
    mount(api);
  }).catch(error => console.error('Reader view integration failed:', error));
}
