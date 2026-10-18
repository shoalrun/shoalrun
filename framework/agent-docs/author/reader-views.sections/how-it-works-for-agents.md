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

## How it works for agents

Reader views change the interactive HTML. They do not create separate agent publications or a personalized agent navigation tree. An agent can discover and read every **published** page regardless of a browser reader's saved choice or a shared `view` or `pageView` URL parameter. Draft and access-controlled source pages still follow the normal publication rules.

| Agent-facing output   | Reader-view behavior                                                                                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown twin (`.md`) | Includes shared content and every `ReaderSection`, even sections hidden in HTML. Each marked section starts with a readable label such as `**For Reader: UI reader.**`. `<ReaderFilter />` controls are omitted. `ReaderChoice` becomes a link to the interactive HTML page with its `view` or `pageView` choice in the URL. |
| `/llms.txt`           | Lists every published Markdown page. A selected browser view does not remove entries.                                                                                                                                                                                                                                        |
| `/documents.json`     | Lists every published page. `readerFacets` defines the configured choices; each document's `readerFilters` contains its resolved page marks. An empty map means the page is shared. Optional `product`, `area`, and `subarea` categories also appear when set.                                                               |
| `/search-index.json`  | Retains a search record for every published page, with page marks in `readerFilters` and indexed section text in `readerSegments`. The built-in **browser** search applies the site-wide choice when displaying results.                                                                                                     |

For example, [this guide's Markdown twin](https://www.shoalrun.com/author/reader-views.md) contains both the UI and Developer example paragraphs with their reader labels. Choosing a page-only view above leaves those paragraphs in the twin. The page's Markdown YAML header includes reader marks only when `outputs.markdown.metadata` explicitly selects those frontmatter fields. The resolved marks are always available in `/documents.json` when reader views are configured. Reader views help people find relevant content; use `access.policy` to decide whether a page is published at all.
