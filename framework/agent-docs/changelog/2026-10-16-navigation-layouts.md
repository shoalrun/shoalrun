---
id: change.navigation-layouts
title: Navigation, page layouts, and browser analytics
summary: Navigation sections, reader controls, layouts, and browser analytics.
type: changelog-entry
area: appearance
subarea: appearance-layouts
canonical: /changelog/2026-10-16-navigation-layouts
date: 2026-10-16
---

# Navigation, page layouts, and browser analytics

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > Navigation, page layouts, and browser analytics

**Published: 2026-10-16.**

This entry groups the October 16 changes to Shoalrun's private prototype and documentation. It does not announce a package release or a verified deployment.

## Navigate between sections

Top-level navigation groups can now become tabs, each with its own landing page and sidebar. This site uses **Docs**, **Project updates**, and **Changelog**. API documentation and recipes remain in Docs.

Tabs use ordinary page links. Direct links select the correct section without a saved browser choice, and navigation works without JavaScript. On smaller screens, a Sections disclosure holds the links. Existing navigation lists continue to work without tabs.

Agents receive the same structure through explicit section membership in Markdown, the document manifest, and both search indexes. Each tab has a scoped text index that links to its member pages and back to the global index. The global indexes still list every published page, including shared pages and pages omitted from navigation. The offline agent documentation bundle includes the scoped indexes.

See [navigation configuration](https://www.shoalrun.com/author/navigation.md) and the [published-output contract](https://www.shoalrun.com/publish/output.md).

## Give readers more room

Documentation pages keep their table of contents visible at laptop widths. Readers can hide it to widen the article, including paragraphs and code examples, without moving the article's left edge. Restoring the contents restores the original width, and the browser remembers the choice across pages.

The navigation uses aligned chevrons, lighter group headings, quieter selection styling, and consistent spacing. Projects can omit group page counts with `outputs.html.navigation.showCounts: false`; counts remain visible by default, and filtering works with either setting.

Header spacing and title sizing are tighter. The Reef theme keeps equal padding around text and examples, and its Contents control follows the panel's inset. Wide pages retain their wider content area. The reading and navigation changes work across all four themes.

## Keep entry pages focused

Navigation tabs show by default on `docs` and `wide` pages and stay hidden on `landing` and `splash` pages. Page frontmatter can override that choice with `showNavigationTabs: true` or `false`. This site's splash homepage hides the tab bar.

Pages led by a Hero omit the page-level Markdown action row. Markdown twins and discovery links remain available. Hiding the tab bar changes only its HTML presentation; section membership and agent indexes remain intact. See [page layouts](https://www.shoalrun.com/styling/layouts.md).

## Measure browser interactions

Projects can now connect browser analytics through the top-level `analytics.module` setting. Shoalrun supplies versioned events for navigation, content tabs, disclosures, clipboard successes, search outcomes, and reader selections. Events include stable page IDs and publication context. Site scripts can emit additional events through the same hook.

The browser adapter owns service initialization, consent, and delivery. Analytics is off by default, and disabled builds omit its runtime and adapter. SDK failures do not interrupt the site. Browser instrumentation leaves Markdown and agent discovery unchanged; agent request measurements belong at the host or server. See [bring your own analytics](https://www.shoalrun.com/author/analytics.md).

## Add contributor documentation

Repository contributors now have a separate maintainer guide covering architecture, development, validation, hosting, and release work. It is separate from the public documentation and packaged agent bundle.

## Related reading

### Reference while working

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Configure navigation tabs, landing pages, and optional group counts.

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Inspect section membership and scoped text indexes for agents.

- [Page layouts, landing pages, and splash pages](https://www.shoalrun.com/styling/layouts.md) — Choose a page layout and control whether its tab bar appears.

- [Bring your own analytics](https://www.shoalrun.com/author/analytics.md) — Connect your analytics service to documented browser interaction events.

### Related topics

- [Project status](https://www.shoalrun.com/status.md) — Check the alpha's capabilities and current limits.
