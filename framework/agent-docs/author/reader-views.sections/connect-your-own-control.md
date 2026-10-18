---
id: guide.reader-filters
title: Reader views
summary: Reader-view configuration, page and section marks, controls, and
  agent-facing behavior.
type: reference
canonical: /author/reader-views
---

# Reader views

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Reader views

**Updated: 2026-10-01.**

Parent page: [Full Markdown page](/author/reader-views.md)

A reader view changes which pages appear in navigation and search. It also controls document cards and marked sections within pages. The site still publishes one URL for each page. A first-time visitor sees all content; a choice is saved in the browser and added to the URL so it can be shared.

Reader views are visibility controls, not access controls. All published page and section content remains available in site files and Markdown twins. Use `access.policy` to exclude a page from a public build, and host-level authorization to protect private content.

## Connect your own control

Set `readerFilters.module` to a local `.js` or `.mjs` file. The build copies that file into the site and calls its `mountReaderViews(api)` export after the reader view is ready. This is useful for a custom header, a host application, or a login-based starting view.

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Reader
      options: { ui: Use the UI, developer: Build with the API }
  controls: { sidebar: false }
  module: ./reader-view.js
```

```js title="reader-view.js"
export function mountReaderViews(api) {
  const picker = document.querySelector('#my-reader-picker');
  if (!picker) return;
  picker.addEventListener('change', () => {
    api.setSelection({ audience: picker.value ? [picker.value] : [] }, { merge: true });
  });
  api.subscribe(selection => { picker.value = selection.audience?.[0] ?? ''; });
}
```

The API provides `facets`, `getSelection()`, `setSelection(selection, { merge? })`, `reset()`, `subscribe(listener)`, and `shareUrl()` for the site view. For the current page it provides `getPageSelection()`, `setPageSelection(selection, { merge? })`, `resetPage()`, `inheritSiteView()`, and `subscribePage(listener)`. `setSelection` and `setPageSelection` validate facet and choice IDs; they replace their respective selection unless `merge: true` is supplied. Subscribers are called immediately and return an unsubscribe function. The API is also available as `window.shoalrunReaderViews`; the page dispatches `reader-views-ready`, `reader-view-change`, and `reader-page-view-change` events. The module is copied as one file, so bundle relative imports before publishing it.

**Copy view link** includes the current choice in the URL; a shared URL overrides the recipient's saved choice. A host can use the API to supply a reader's initial view, but reader filters are presentation controls. Protect private content at the host or build layer.

The built-in browser search provider excludes pages and section text outside the current site view. A custom search provider receives `context.readerSelection` and must apply the same rules if it wants matching behavior. Reader views are a reading aid, not access control. Use `access.policy` to keep a page out of a public build.
