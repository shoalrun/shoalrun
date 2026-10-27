---
id: change.search-and-tooltips
title: Search results and tooltips
summary: Indexed search and hover and focus tooltips.
type: changelog-entry
area: discovery
subarea: discovery-search
canonical: /changelog/2026-10-18-search-and-tooltips
date: 2026-10-18
---

# Search results and tooltips

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > Search results and tooltips

**Published: 2026-10-18.**

These October 18 changes improve search and supporting explanations in Shoalrun’s private prototype. This entry does not announce a package release.

## Find useful search results

Search results now select substantive passages instead of generated related-reading lists or source-only fragments. An exact page-title query opens that page’s introduction. Large galleries no longer crowd other pages out of the search candidates.

Explicit identifiers and commands remain searchable in code and tables. Matching pages keep their retrieved order. They open the passage containing the exact match, and the result description shows its code line or table row.

The [passage index](https://www.shoalrun.com/chat/passage-index.md) prepares result paragraphs, code lines, and table rows during indexing. Search requests no longer parse the Markdown passages to prepare these results.

Preparing this data does not change the embedding input, so unchanged passages reuse their existing vectors.

Queries such as “charts” and “graphs” lead to chart and diagram examples with readable descriptions. Searching “diagrams” opens the [Diagrams guide](https://www.shoalrun.com/author/components/diagrams.md). Semantic search retains its keyword fallback when embeddings are unavailable; Ask passage retrieval is unchanged.

## Distinguish short definitions from tooltips

The former Tooltips reference is now [Short definitions](https://www.shoalrun.com/author/components/info-hint.md). `<InfoHint>` keeps its native click-to-expand disclosure, including keyboard and touch support without JavaScript.

`<Tooltip>` previously named the same disclosure. If you used it for click-to-expand definitions, replace it with `<InfoHint>` to retain that behavior.

## Show supporting text on hover or focus

The separate [Tooltip component](https://www.shoalrun.com/author/components/tooltips.md) now shows brief supporting text when readers hover over or focus its label. It works inline or as a standalone block. Readers can move the pointer onto the popup, dismiss it with Escape, or tap the label to open and close it on touch screens.

Without JavaScript, the label and explanation remain visible together. Markdown includes the full label and explanation, so agents can read both without interaction. Keep essential warnings and instructions in visible page content.
