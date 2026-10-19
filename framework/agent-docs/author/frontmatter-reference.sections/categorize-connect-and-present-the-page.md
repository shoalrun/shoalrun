---
id: guide.frontmatter-reference
title: Frontmatter field reference
summary: Browse the built-in and project-defined page fields this site supports.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/frontmatter-reference
---

# Frontmatter field reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Generated frontmatter reference

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/frontmatter-reference.md)

This is the field inventory for this documentation site. The tables below are built from Shoalrun's native field definitions and this site's `frontmatter.fields` declarations on each build. They describe source page headers, not the shorter YAML header selected for a published Markdown page.

`agent.intent` in the project-defined table is an optional string. This site's authors use it to describe the task a page helps an agent complete. It is **not** a required Shoalrun field or an instruction to an agent. `editorial.reviewNote` is another site-specific field for internal review notes. A different project can declare different fields.

To publish an equivalent inventory on your site, place `<FrontmatterReference />` on a page. It takes no attributes or child content and renders the current project's native and declared fields in HTML and Markdown.

## Categorize, connect, and present the page

`product`, `area`, and `subarea` are optional, nonempty string categories. They can come from project defaults and appear in the document manifest and search index. A matching configured reader facet makes each category a page filter; without that facet it remains taxonomy only. `operations` links a guide or reference to stable API operation IDs. On a guide or how-to page, `relatedApiReferences` names API reference page IDs to add cross links in both directions within the same publication. Tags help document collections find the page. Card settings change its preview when another page links to it; they do not change the destination. `subjectLifecycle` displays the status of the documented API or feature; `lifecycle` is available for the document's editorial state. `tocDepth` limits the HTML page table of contents; use 0 to hide it. `layout` picks the HTML page layout: `docs`, `wide`, `landing`, or `splash`. `showNavigationTabs` overrides the navigation tab bar for this page; landing and splash pages hide it by default. `image` replaces the generated link-preview image. `date` and `releaseVersion` can identify a changelog entry under the project's `frontmatter.changelogIdentifier` rule.

| Field                  | Type    | Needed   | What it changes                                                                                                                                                                                                           |
| ---------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product`              | string  | Optional | Optional product category. Also selects the product reader facet when that facet is configured.                                                                                                                           |
| `area`                 | string  | Optional | Optional area category. Also selects the area reader facet when that facet is configured.                                                                                                                                 |
| `subarea`              | string  | Optional | Optional finer category. Also selects the subarea reader facet when that facet is configured.                                                                                                                             |
| `operations`           | array   | Optional | Stable API operation IDs that connect this page to endpoint references and related documents.                                                                                                                             |
| `relatedApiReferences` | array   | Optional | API reference page IDs linked automatically from this guide and back from each reference, within the same publication.                                                                                                    |
| `tags`                 | array   | Optional | Editorial labels used to select pages in document collections.                                                                                                                                                            |
| `date`                 | string  | Optional | Publication date in YYYY-MM-DD format; optional for release notes and one possible changelog identifier.                                                                                                                  |
| `releaseVersion`       | string  | Optional | Release label for a note or changelog entry; separate from the documentation publication version.                                                                                                                         |
| `subjectLifecycle`     | string  | Optional | Displays a content status badge in the page and navigation.                                                                                                                                                               |
| `subjectDeprecation`   | object  | Optional | Page-specific subject retirement dates and stable document IDs; requires deprecated subjectLifecycle, including OpenAPI inference. Dates do not change status automatically.                                              |
| `change`               | object  | Optional | Page-specific authored change meaning on a changelog-entry: kind, affected document IDs, and optional migration guide ID in the same publication. Omission means unclassified, not nonbreaking.                           |
| `lifecycle`            | string  | Optional | Editorial lifecycle of the document; validated by an opted-in external vocabulary.                                                                                                                                        |
| `card`                 | object  | Optional | Overrides how this page appears when another page includes a document card; its destination still resolves by page ID.                                                                                                    |
| `card.title`           | string  | Optional | Card title; defaults to the page title.                                                                                                                                                                                   |
| `card.description`     | string  | Optional | Card description; defaults to the page summary.                                                                                                                                                                           |
| `card.eyebrow`         | string  | Optional | Short label above a card title.                                                                                                                                                                                           |
| `card.icon`            | string  | Optional | Optional Lucide icon name such as book-open. Decorative in HTML; omitted from Markdown.                                                                                                                                   |
| `standaloneSections`   | array   | Optional | Page-specific exact level-two heading titles reviewed by the author as self-contained with the page introduction. Allows eligible sections to be recommended alone; omitted means full-page reads.                        |
| `tocDepth`             | integer | Optional | Deepest heading shown in the page table of contents; 0 hides it. Defaults to 3.                                                                                                                                           |
| `layout`               | string  | Optional | HTML page layout: docs (default), wide (no page outline, full content width), landing (no sidebar or outline; a Hero replaces the page header), or splash (full-bleed marketing page built from Hero and Section blocks). |
| `showNavigationTabs`   | boolean | Optional | Show the HTML navigation section bar when tabs are configured. Defaults to true for docs and wide layouts, false for landing and splash. Does not change agent discovery or section membership.                           |
| `image`                | string  | Optional | Local .png or .jpg shown in link previews for this page, relative to the page file; replaces the generated share image. Best at 1200×630.                                                                                 |
