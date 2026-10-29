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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Page metadata > Generated frontmatter reference

**Updated: 2026-10-28.**

This is the field inventory for this documentation site. The tables below are built from Shoalrun's native field definitions and this site's `frontmatter.fields` declarations on each build. They describe source page headers, not the shorter YAML header selected for a published Markdown page.

`agent.intent` in the project-defined table is an optional string. This site's authors use it to describe the task a page helps an agent complete. It is **not** a required Shoalrun field or an instruction to an agent. `editorial.reviewNote` is another site-specific field for internal review notes. A different project can declare different fields.

To publish an equivalent inventory on your site, place `<FrontmatterReference />` on a page. It takes no attributes or child content and renders the current project's native and declared fields in HTML and Markdown.

For section exports, declare `standaloneSections` with `{ id, context: section }` objects after reviewing each section without its page introduction. Older heading-title strings remain supported for contextual discovery. See [section identity and compatibility](https://www.shoalrun.com/content-delivery/sections.md) before changing an existing declaration.

## Identify and route a page

Use the page ID for links and cards that should survive a URL change. The slug supplies the page part of the URL; publication prefixes may be added around it. Summary is short preview text; description is a separate, optional fuller account. Project output rules choose which field supplies each surface.

| Field         | Type   | Needed            | What it changes                                                                              |
| ------------- | ------ | ----------------- | -------------------------------------------------------------------------------------------- |
| `id`          | string | On each page      | Stable page identity used by document links and cards; keep it when the file or URL changes. |
| `title`       | string | After inheritance | Page heading and default browser title.                                                      |
| `summary`     | string | After inheritance | Short page preview, used by cards and other configured text surfaces.                        |
| `description` | string | Optional          | Fuller description of what the page covers; kept distinct from the short summary.            |
| `type`        | string | After inheritance | Document kind, such as guide or api-reference; can select a Markdown metadata profile.       |
| `slug`        | string | On each page      | Page URL path before channel, version, and language prefixes.                                |

## Choose a publication and visibility

The project enables specific channel/version/language combinations. A page is built only for combinations matching its resolved values. `audiences` and `readerFilters` select reader views when the site config enables them; `access.policy` determines whether the page enters this public build. A draft page is excluded.

| Field           | Type   | Needed      | What it changes                                                                                                                |
| --------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `channel`       | string | Public page | Publication environment, such as sandbox or production; selects an enabled publication and API source.                         |
| `version`       | string | Public page | API or documentation edition, such as v1; selects an enabled publication and API source.                                       |
| `language`      | string | Optional    | Content language; uses frontmatter defaults/enforced values, then publications.defaults.language, then en.                     |
| `locale`        | string | Optional    | Formatting conventions used in the content; can inherit a project locale for the page language and can be overridden per page. |
| `access`        | object | Public page | Controls whether the page enters a public build; this object is not exported to Markdown metadata.                             |
| `access.policy` | string | With access | Use public to publish this page; draft pages are excluded from the built site.                                                 |
| `audiences`     | array  | Optional    | Readers this page is intended for; does not control who can access it.                                                         |
| `readerFilters` | object | Optional    | Configured reader filter choices for this page. Missing facets are shared.                                                     |

Language is the content language and selects a publication. Locale describes formatting conventions in the content and does not select a publication. `frontmatter.locales` can set a project locale for each language; pages may override it.

## Categorize, connect, and present the page

By default, `product`, `area`, and `subarea` are optional, nonempty string categories. They can come from project defaults and appear in the document manifest and search index. A matching configured reader facet makes each category a page filter; without that facet it remains taxonomy only. `operations` links a guide or reference to stable API operation IDs. On a guide or how-to page, `relatedApiReferences` names API reference page IDs to add cross links in both directions within the same publication. Tags help document collections find the page. Card settings change its preview when another page links to it; they do not change the destination. `subjectLifecycle` displays the status of the documented API or feature; `lifecycle` is available for the document's editorial state. `tocDepth` limits the HTML page table of contents; use 0 to hide it. `layout` picks the HTML page layout: `docs`, `wide`, `landing`, or `splash`. `showNavigationTabs` overrides the navigation tab bar for this page; landing and splash pages hide it by default. `image` replaces the generated link-preview image. `date` and `releaseVersion` can identify a changelog entry under the project's `frontmatter.changelogIdentifier` rule.

| Field                  | Type            | Needed       | What it changes                                                                                                                                                                                                                                                             |
| ---------------------- | --------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product`              | string          | Optional     | Optional product category. Also selects the product reader facet when that facet is configured.                                                                                                                                                                             |
| `area`                 | string or array | On each page | Optional area category. Also selects the area reader facet when that facet is configured.                                                                                                                                                                                   |
| `subarea`              | string or array | On each page | Optional finer category. Also selects the subarea reader facet when that facet is configured.                                                                                                                                                                               |
| `operations`           | array           | Optional     | Stable API operation IDs that connect this page to endpoint references and related documents.                                                                                                                                                                               |
| `relatedApiReferences` | array           | Optional     | API reference page IDs linked automatically from this guide and back from each reference, within the same publication.                                                                                                                                                      |
| `tags`                 | array           | Optional     | Editorial labels used to select pages in document collections.                                                                                                                                                                                                              |
| `date`                 | string          | Optional     | Publication date in YYYY-MM-DD format; optional for release notes and one possible changelog identifier.                                                                                                                                                                    |
| `releaseVersion`       | string          | Optional     | Release label for a note or changelog entry; separate from the documentation publication version.                                                                                                                                                                           |
| `subjectLifecycle`     | string          | Optional     | Displays a content status badge in the page and navigation.                                                                                                                                                                                                                 |
| `subjectDeprecation`   | object          | Optional     | Page-specific subject retirement dates and stable document IDs; requires deprecated subjectLifecycle, including OpenAPI inference. Dates do not change status automatically.                                                                                                |
| `change`               | object          | Optional     | Page-specific authored change meaning on a changelog-entry: kind, affected document IDs, and optional migration guide ID in the same publication. Omission means unclassified, not nonbreaking.                                                                             |
| `lifecycle`            | string          | Optional     | Editorial lifecycle of the document; validated by an opted-in external vocabulary.                                                                                                                                                                                          |
| `card`                 | object          | Optional     | Overrides how this page appears when another page includes a document card; its destination still resolves by page ID.                                                                                                                                                      |
| `card.title`           | string          | Optional     | Card title; defaults to the page title.                                                                                                                                                                                                                                     |
| `card.description`     | string          | Optional     | Card description; defaults to the page summary.                                                                                                                                                                                                                             |
| `card.eyebrow`         | string          | Optional     | Short label above a card title.                                                                                                                                                                                                                                             |
| `card.icon`            | string          | Optional     | Optional Lucide icon name such as book-open. Decorative in HTML; omitted from Markdown.                                                                                                                                                                                     |
| `standaloneSections`   | array           | Optional     | Page-specific standalone approval: a heading title approves contextual discovery with the page introduction; {id, context: section} approves the root level-two section slice for content export. IDs may be derived or explicitly anchored. Omitted means full-page reads. |
| `tocDepth`             | integer         | Optional     | Deepest heading shown in the page table of contents; 0 hides it. Defaults to 3.                                                                                                                                                                                             |
| `layout`               | string          | Optional     | HTML page layout: docs (default), wide (no page outline, full content width), landing (no sidebar or outline; a Hero replaces the page header), or splash (full-bleed marketing page built from Hero and Section blocks).                                                   |
| `showNavigationTabs`   | boolean         | Optional     | Show the HTML navigation section bar when tabs are configured. Defaults to true for docs and wide layouts, false for landing and splash. Does not change agent discovery or section membership.                                                                             |
| `showVerified`         | boolean         | Optional     | Show an authored verified date in the HTML page header. Defaults to true. False hides it only in HTML; Markdown and manifest dates remain unchanged. Does not assign a verification date.                                                                                   |
| `image`                | string          | Optional     | Local .png or .jpg shown in link previews for this page, relative to the page file; replaces the generated share image. Best at 1200×630.                                                                                                                                   |

Projects can opt into built-in category enforcement with `frontmatter.taxonomy`. It declares areas and their allowed subareas, optional required fields, and optional explicit-field requirements for authored pages. Its `multiple` list permits arrays for selected category fields; otherwise each field allows one value. Defaults and enforced values still apply; generated API references use resolved categories. Definitions appear in the document manifest and constrain the generated frontmatter schema. Omit taxonomy or set it to false to preserve optional category behavior.

## Control output details

`seo` changes the browser title or HTML meta description. `displayText` overrides the text chosen for one output surface on this page. `variables` supplies values to registered snippets before they expand into the page body. `markdownMetadata` selects or overrides the YAML preamble of the generated Markdown twin—the machine-readable copy of this page. That generated preamble is separate from the source frontmatter shown above.

| Field              | Type             | Needed   | What it changes                                                                             |
| ------------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------- |
| `seo`              | object           | Optional | Page-level HTML title, description, and indexing settings.                                  |
| `seo.title`        | string           | Optional | Overrides the HTML title; defaults to page title.                                           |
| `seo.description`  | string           | Optional | Overrides the HTML meta description; defaults to page summary.                              |
| `seo.noindex`      | boolean          | Optional | If true, adds a noindex directive and excludes this public page from the XML sitemap.       |
| `displayText`      | object           | Optional | Per-page text overrides for configured presentation surfaces; not exported as metadata.     |
| `variables`        | object           | Optional | Page values supplied to registered snippets; expanded snippet text appears in both outputs. |
| `markdownMetadata` | string or object | Optional | Selects a configured profile or overrides this page’s Markdown YAML preamble.               |

## Project-defined fields

A project can add page fields by declaring them in `frontmatter.fields`. The declaration gives a field path (such as `agent.intent`), a type, and a description. A dotted path means nested YAML on the page. Undeclared fields are still accepted in source pages, but only declared fields appear in this table and receive type checks.

| Field                        | Type   | Required | Agent metadata approved | Description                                                             |
| ---------------------------- | ------ | -------- | ----------------------- | ----------------------------------------------------------------------- |
| `concepts`                   | array  | No       | No                      | Explicit glossary references checked by the project terminology audit.  |
| `agent.intent`               | string | No       | Yes                     | The reader task this page helps an agent complete.                      |
| `editorial.reviewNote`       | string | No       | No                      | Internal note for documentation reviewers.                              |
| `editorial.lastVerified`     | string | No       | No                      | Date the page's technical claims were last checked, in YYYY-MM-DD form. |
| `editorial.verificationNote` | string | No       | No                      | Internal notes about the evidence and scope of the last check.          |

“Required” means the field must exist after defaults and enforced values are applied. “Agent metadata approved” means `public: true` allows that value to be selected for the generated Markdown preamble; it does not publish the field automatically. Select approved fields in `outputs.markdown.metadata.fields`, a `byType` rule, or a page profile. Source page body text is published independently of this selection.

## Global defaults and enforced values

These are project config settings, not keys in a page header. `frontmatter.defaults` supplies values when a page omits them; `frontmatter.enforced` replaces page values. Resolution follows defaults → page → enforced. Objects merge recursively and arrays replace. IDs and slugs remain page-specific. Required fields and declared types are checked after resolution. Use an access default if authors need to keep individual pages as drafts.

## Use the local files while authoring

Every project also gets `.shoalrun/frontmatter-reference.md` and `.shoalrun/frontmatter.schema.json` beside `docs.config.yaml`. They contain that project's inventory for authors, editors, and agents working in its repository. For this site, the paths are `docs/.shoalrun/frontmatter-reference.md` and `docs/.shoalrun/frontmatter.schema.json`. These internal files are not published site routes.

Changing a declaration and rebuilding updates the published table and both local files. Undeclared fields may still appear in source pages, but they have no project type check and do not appear in the field inventory.

## When the files update

The files update whenever `shoalrun build` writes a site, including `npm run docs:build` and `vercel build`. Commands that compile without writing a site, such as `operation inspect`, leave them alone. The files are generated, so add `.shoalrun/` to `.gitignore`; this repository already does.

## Point agents to it

Add a line to the repository's agent instructions, such as `AGENTS.md` or `CLAUDE.md`:

```md title="AGENTS.md"
Before editing page frontmatter, read docs/.shoalrun/frontmatter-reference.md for the fields this project supports. Run the docs build first if it is missing.
```

The reference describes source fields. To choose which of them appear in each page's Markdown twin, see [choose metadata for the published Markdown page](https://www.shoalrun.com/author/markdown-metadata.md).

## HTML, Markdown, and agents

`FrontmatterReference` writes the project's field definitions into both the HTML page and its Markdown twin. An agent can read those tables without running JavaScript or opening the local schema file. The tables describe accepted source fields; they do not expose each page's private metadata values. The separate `.shoalrun` files are local authoring resources, not public routes.

## Related reading

### Related topics

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) — Point agents at the local inventory of page fields this project accepts.

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — The local inventory lists every field this project accepts, including custom ones.
