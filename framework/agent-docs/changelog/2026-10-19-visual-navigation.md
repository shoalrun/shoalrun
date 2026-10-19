---
id: change.visual-navigation
title: Experimental visual navigation and taxonomy enforcement
summary: Visual navigation and taxonomy validation.
type: changelog-entry
area: discovery
subarea: discovery-search
canonical: /changelog/2026-10-19-visual-navigation
date: 2026-10-19
---

# Experimental visual navigation and taxonomy enforcement

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Changelog](https://www.shoalrun.com/.well-known/shoalrun/navigation/changelog-tab-50f26fe22670.txt) (ID: changelog-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Changelog](https://www.shoalrun.com/changelog.md) > Changelog > Experimental visual navigation and taxonomy enforcement

**Published: 2026-10-19.**

These October 19 changes cover the documentation site's experimental explorer and taxonomy enforcement in CLI `0.1.0-alpha.3`. This entry does not announce a package release or a verified deployment.

## Explore documentation visually

The site's [experimental explorer](https://www.shoalrun.com/explore.md) provides five ways to navigate the same documentation: packed circles, expandable branches, connection arcs, a relationship matrix, and a force layout. Filter by declared area, subarea, page type, relationship, or configured reader facets. Demo pages are excluded from the explorer.

Views support zoom and pan, with native browser fullscreen where supported. Fullscreen keeps layout controls visible and makes filters and the relationship key available in expandable panels. The matrix distinguishes source rows from destination columns and offers readable sizing alongside the full overview.

Relationship arrows show direction. Related topics and comparisons apply in both directions. Line patterns, matrix symbols, labels, and a monochrome option supplement color. The sidebar identifies incoming, outgoing, and two-way relationships, their page endpoints, and why they are connected.

Those explanations come from authored `reason` fields in the relationship configuration. The build publishes them in `documents.json`; the explorer makes no model calls and infers no new connections. [Related reading](https://www.shoalrun.com/author/related-reading.md) documents the authoring and validation rules.

The Markdown twin retains the explorer guide and topic links. Agents can read the full page catalog and declared relationships directly from the document manifest. The visualization remains experimental; further sizing, density, interaction, and accessibility improvements are planned.

## Classify pages explicitly

This site's pages now declare areas and subareas rather than deriving subjects from navigation groups. MCP pages belong to Search & discovery. Breadcrumbs belongs to built-in site navigation, while API example and schema components belong to Content components.

CLI `0.1.0-alpha.3` adds configurable [taxonomy enforcement](https://www.shoalrun.com/author/taxonomy.md) to the build, including allowed definitions, required fields, explicit authored values, and valid area/subarea pairs. Sites can choose whether to allow multiple areas or subareas on a page; the default permits a single value. These built-in options require CLI `0.1.0-alpha.3` or later. This site enables enforcement through `frontmatter.taxonomy`.

## Continue improving the explorer

The [project update](https://www.shoalrun.com/status.md) tracks further work on layout sizing, dense views, filtering, relationship presentation, and accessibility.
