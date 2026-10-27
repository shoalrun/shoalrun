---
id: change.evaluation-builds
title: Agent reading and evaluation
summary: Smaller reads, lifecycle guidance, and reproducible evaluations.
type: changelog-entry
area: quality
subarea: quality-evaluations
canonical: /changelog/2026-10-15-evaluation-builds
date: 2026-10-15
---

# Agent reading and evaluation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > Agent reading and evaluation

**Published: 2026-10-15.**

This entry combines the October 15 changes to the private prototype. It does not announce a package release or a verified deployment.

## Compare evaluation builds

Evaluation reports can now identify which published files changed. New report templates include a file inventory; `eval check` lists additions, edits, and removals when the evaluated build differs from the current output.

Use `shoalrun eval snapshot` to save an inventory and `shoalrun eval compare` to compare builds. The check still requires the exact evaluated output. Copying a build to another machine preserves its identity; rebuilding it may produce different bytes.

The repository can also capture hosted builds with their tasks and an ungraded report template for later review. Capturing a build does not run the tasks or award a passing grade.

The packaged Markdown bundle also stops carrying a whole-site build ID for assets it does not include. Its page digests and metadata remain intact.

[Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) explains the workflow and its limits.

## Find and read Markdown

The manifest and compact search index now expose exact published Markdown byte counts and `cl100k_base` token counts. **Copy as Markdown** copies the full published twin, with an accessible status and a plain link fallback. See [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) and [agent discovery](https://www.shoalrun.com/publish/agent-discovery.md).

Pages now publish complete Markdown resources for top-level sections, with outlines, exact sizes, and parent/section digests. Use `docs outline` and `docs section`, or MCP `get_outline` and `get_section`, to retrieve them. Nested reader content stays together. Generated section IDs can change when headings change; see [section identity and citations](https://www.shoalrun.com/author/markdown-metadata.md).

Search now returns the exact next read call and a direct Markdown URL, with a full-page fallback. Section files are limited to longer pages and must halve both bytes and tokens; short pages no longer produce redundant section files. Compact search records expose eligible section URLs without requiring the full manifest. Search now recommends a smaller section only when the author explicitly lists its heading in `standaloneSections`; otherwise the next read fetches the full page. This addresses an observed case where a matching section omitted prerequisite configuration. Declarations are author judgments, not compiler verification of completeness.

CLI/MCP search now allows a stronger match missing one meaningful query term to outrank complete matches found only in body text. Complete matches with relevant titles, summaries, or headings keep their preference. Page-title matching also accepts simple final-`s` query plurals against singular titles. These changes fix an observed discovery miss without project-specific synonyms; browser search is unchanged. See [search ranking](https://www.shoalrun.com/author/search.md).

For partial CLI/MCP matches, a focused subject match can now outrank a result with one extra incidental term. Only candidates within one meaningful term of the best coverage and at least two matched terms receive this ordering. Sparse matches stay below that group. This corrects an observed MCP client setup query while preserving full-page reads for setup and budget instructions.

Fetch-only agents can now reach approved section resources from the small text index. The HTML discovery block opens `/llms.min.txt`, which lists full pages and author-declared standalone sections with exact sizes and explicit full-page fallbacks. Publication labels distinguish editions. No JSON parsing, CLI or MCP is needed for that reading path; the detailed index remains available.

HTML metadata and Markdown page backlinks now point to the same compact index as the visible agent guidance. The full index remains available from that list. The [diagram reference](https://www.shoalrun.com/author/components/diagrams.md) also includes complete D2 and Mermaid authoring examples with intact nested code fences. These small private-prototype changes address discovery detours and missing copyable syntax observed during fetch-only evaluations.

## Follow deprecation and migration guidance

This private prototype update adds `subjectDeprecation` to page metadata. Authors can supply deprecation and sunset dates, a replacement document ID, and a migration guide ID for a deprecated API or feature.

Readers see the same guidance in HTML, full-page Markdown, and published section resources. Fetch-only agents can follow the Markdown links directly. The document manifest also exposes the dates and resolved targets. Builds reject invalid dates and references outside the current publication.

The guidance describes the documented subject. It does not remove the documentation page or emit HTTP retirement headers. Dates are author declarations, not evidence that a service has retired.

See [page metadata](https://www.shoalrun.com/author/frontmatter.md) for syntax and validation rules.

## Keep reading paths in section Markdown

This private prototype update preserves reading guidance when an agent fetches one section of a longer page. Prerequisites and next steps from top-level, current-page `RelatedReading` views now travel with the section, including the reason to follow each link and the target's status.

The added block says that the links apply to the full page. Links already in the section or its introduction are not repeated. Conditional and nested reading views stay with their original content. HTML and full-page Markdown keep their authored placement.

The extra guidance counts toward exact section sizes and can make a section too large to publish separately. It does not establish that a section is self-contained or that the reader has completed its prerequisites. See [related reading](https://www.shoalrun.com/author/related-reading.md) for the rules.

## Understand authored change meaning

This private prototype update adds optional `change` metadata to changelog entries. Authors can distinguish editorial corrections, procedure changes, behavior changes, and breaking changes, then name the affected pages and a migration guide when available.

The declaration appears in HTML, full-page Markdown, section Markdown, and the document manifest. Fetch-only agents can read it and follow the links without a tool integration.

The build validates the fields and resolves public targets within the entry's publication. It does not verify the author's classification. Older entries remain visible without metadata and are unclassified. No separate change feed or deployment claim is added.

See [write release notes and changelog entries](https://www.shoalrun.com/author/release-notes.md) for syntax and limits.

## Check the published-output contract

The [output reference](https://www.shoalrun.com/publish/output.md) now defines the existing manifest and sync contract, including optional capabilities, section identity, field meanings, and the limits of byte verification. Two repository JSON Schemas and a local check validate existing build output without rebuilding or making network requests. The check covers field shapes, document identities, manifest/sync agreement, and referenced Markdown sizes and digests. This documentation and validation update does not change the published format or enable hosted checks.

The site's five-question agent self-assessment is now retained as historical example evidence instead of a routine audit requirement. Local build, link, schema, output-consistency, behavior, and browser checks remain available. New agent evaluations should address a concrete product question.
