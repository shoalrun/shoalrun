---
id: guide.reader-filters
title: Reader views
summary: Reader-view configuration, page and section marks, controls, and
  agent-facing behavior.
type: reference
area: discovery
subarea: discovery-reader-views
canonical: /author/reader-views
---

# Reader views

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Reader views

**Updated: 2026-10-23.**

A reader view changes which pages appear in navigation and search. It also controls document cards and marked sections within pages. The site still publishes one URL for each page. A first-time visitor sees all content; a choice is saved in the browser and added to the URL so it can be shared.

Reader views are visibility controls, not access controls. All published page and section content remains available in site files and Markdown twins. Use `access.policy` to exclude a page from a public build, and host-level authorization to protect private content.

To build separate sites from the same source using these facets, use [build-time page selection](https://www.shoalrun.com/publish/single-source-sites.md) with `site.contentFilter`. That selector excludes unmatched pages from the output. A browser reader view continues to affect visibility within a published site.

## Try the controls here

### Filter the navigation

This site's **Focus** dropdown changes navigation, search, and document cards. The same control appears in the header on every page. Your choice persists across visits and can be shared in the URL.

- Choose **Write documentation** to bring forward pages about metadata, authoring, components, and API documentation. Pages about styling and deployment leave the navigation and search results.
- Choose **Configure & publish** to bring forward styling, search, chat, hosting, and deployment. Authoring-specific pages leave the navigation and search results.
- Choose **All** to see both paths. Foundational pages, such as [How Shoalrun works](https://www.shoalrun.com/concepts.md), stay in every view.

All published pages still work at their direct URLs. A focus choice is a reading aid, not an access rule.

This site's `focus` facet has `write` and `configure` choices. Generated API references use a `typeDefaults` mark of `write`. It also retains an internal `audience` facet for the hosted chat's author view and a `persona` facet for the page-only examples below. The header shows only Focus. These machine IDs contain no spaces; the longer labels are only shown to readers.

### Filter examples on this page

The controls below use a separate `persona` facet and `scope="page"`. They change the examples below without changing this site's navigation or search. Choose a reader to see one example, or use the controls to show both.

[Show UI example](https://www.shoalrun.com/author/reader-views?pageView=persona%3Aui)

[Show developer example](https://www.shoalrun.com/author/reader-views?pageView=persona%3Adeveloper)

**For Reader: UI reader.**

**UI example**

In a dashboard guide, show the menu names and screen actions a reader needs. This section appears when **UI reader** is selected.

**For Reader: Developer.**

**Developer example**

In an API guide, show the request, required fields, and expected response. This section appears when **Developer** is selected.

**Show all** in the multi-select keeps both sections visible on this page. **Follow site view** removes the page-only choice and returns to the site's current reader view. The page-only choice is shareable with **Copy view link** and is not saved across visits.

## Configure the choices

Define the available reader choices once in `readerFilters.facets` in `docs.config.yaml`. The facet names and choices are yours; Shoalrun has no fixed list of reader types. Each facet and choice has a stable lowercase ID and a label for readers. Pages and sections refer to these IDs, and unknown IDs fail the build. `typeDefaults` is optional; it is useful when generated API references should start in the Developer view without marking every operation separately.

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Reader
      options:
        ui: Use the UI
        developer: Build with the API
    product:
      label: Product
      options:
        payments: Payments
        reports: Reports
    area:
      label: Area
      options:
        reporting: Reporting
        setup: Setup
    subarea:
      label: Subarea
      options:
        settlements: Settlements
        exports: Exports
  typeDefaults:
    api-reference:
      audience: [developer]
  controls:
    sidebar: false
    header: { facet: audience, display: select, label: Reader }
```

Nothing is selected by default, so every page and section is visible. Readers can select more than one choice within a facet: a page marked for either selected choice appears. Different facets combine: a page marked `audience: [ui]` and `product: [payments]` appears when both selections match. A page with no mark for a facet is shared across that facet.

## Mark pages

Use the existing `audiences` field for the `audience` facet. `product`, `area`, and `subarea` can each supply a single choice for a same-named facet. Use `readerFilters` for other facets or when a page needs multiple choices in one facet. All of these fields work with frontmatter defaults and enforced values.

```yaml title="content/payments-dashboard.mdx"
---
id: guide.payments-dashboard
title: Review payments in the dashboard
type: guide
slug: /payments/dashboard
audiences: [ui]
product: payments
area: reporting
subarea: settlements
---
```

When a facet is configured, `audiences` and same-named category values must use its choice IDs. You can instead use `readerFilters.audience` or `readerFilters.product`, but do not put both forms for the same facet on one page. An explicit page value overrides a `typeDefaults` value for that facet. Categories without matching configured facets remain taxonomy metadata only. Pages with no marks remain visible in every view.

The page marks control navigation, search, and cards that point to the page. They do not change its URL. A direct link to a page outside the current view opens the page in full. A notice offers actions to switch view or show all content.

## Mark sections and add an entry choice

Use `ReaderSection` for content that belongs to a narrower view within an otherwise shared page. Content outside these blocks stays visible to everyone. Sections can contain Markdown and supported MDX components, but reader sections cannot be nested.

```mdx title="content/get-started.mdx"
<ReaderChoice audience="ui" label="Use the dashboard" />
<ReaderChoice audience="developer" label="Build with the API" />

Everyone needs an account before starting.

<ReaderSection audience="ui">
Open **Settings** in the dashboard.
</ReaderSection>

<ReaderSection audience="developer" product="payments">
Create an API token, then run the payment CLI.
</ReaderSection>
```

`ReaderChoice` changes only the facets named on the button. It can set several facets at once, and comma-separated values select more than one choice within a facet.

## Place filter controls

The site config above puts a compact reader dropdown in the header and removes the sidebar control. `controls.sidebar` defaults to `true`; `controls.header` is optional. Both can be present, and they stay in sync. Each header control accepts `facet`, `display: select` or `checks`, and an optional `label`. Omit `facet` to show every configured facet.

Authors can place the same controls inside a page:

```mdx
<ReaderFilter facet="audience" display="select" label="I use…" />
<ReaderFilter facet="product" display="checks" />
```

`select` allows one choice per facet and includes **All**. `checks` allows multiple choices and includes **Show all** and **Copy view link**. `<ReaderFilter />` controls every facet. The component is interactive in HTML and omitted from the Markdown twin; marked content and `ReaderChoice` links remain in Markdown.

Set `scope="page"` on an in-page `ReaderChoice` or `ReaderFilter` to control only marked sections and cards on the current page. The site-wide choice still controls navigation and search. Page-only choices use the `pageView` URL parameter for sharing; they do not enter local storage. With no page-only choice, the page follows the site view. A page-scoped multi-select includes **Follow site view** to return to that state. The default scope is `site`.

## How it works for agents

Reader views change the interactive HTML. They do not create separate agent publications or a personalized agent navigation tree. An agent can discover and read every **published** page regardless of a browser reader's saved choice or a shared `view` or `pageView` URL parameter. Draft and access-controlled source pages still follow the normal publication rules.

| Agent-facing output   | Reader-view behavior                                                                                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown twin (`.md`) | Includes shared content and every `ReaderSection`, even sections hidden in HTML. Each marked section starts with a readable label such as `**For Reader: UI reader.**`. `<ReaderFilter />` controls are omitted. `ReaderChoice` becomes a link to the interactive HTML page with its `view` or `pageView` choice in the URL. |
| `/llms.txt`           | Lists every published Markdown page. A selected browser view does not remove entries.                                                                                                                                                                                                                                        |
| `/documents.json`     | Lists every published page. `readerFacets` defines the configured choices; each document's `readerFilters` contains its resolved page marks. An empty map means the page is shared. Optional `product`, `area`, and `subarea` categories also appear when set.                                                               |
| `/search-index.json`  | Retains a search record for every published page, with page marks in `readerFilters` and indexed section text in `readerSegments`. The built-in **browser** search applies the site-wide choice when displaying results.                                                                                                     |

For example, [this guide's Markdown twin](https://www.shoalrun.com/author/reader-views.md) contains both the UI and Developer example paragraphs with their reader labels. Choosing a page-only view above leaves those paragraphs in the twin. The page's Markdown YAML header includes reader marks only when `outputs.markdown.metadata` explicitly selects those frontmatter fields. The resolved marks are always available in `/documents.json` when reader views are configured. Reader views help people find relevant content; use `access.policy` to decide whether a page is published at all.

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
