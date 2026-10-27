---
id: guide.components
title: Component reference
summary: Find a dedicated guide for every supported MDX component and code block.
type: reference
area: components
subarea: components-overview
canonical: /author/components
---

# Component reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Overview

**Updated: 2026-10-26.**

Shoalrun accepts GitHub Flavored Markdown (tables, task lists, strikethrough, footnotes, and autolinks) and the MDX components below. Each component family has a page with syntax, attributes, HTML and Markdown behavior, and limits. Component names and attributes are case-sensitive. Unknown components, dynamic MDX expressions, and exports fail the build because they have no shared HTML and Markdown representation. The build drops `import` lines, so imported components are not available.

[Custom components](https://www.shoalrun.com/author/components/custom.md) let trusted project plugins lower into the shared content pipeline.

[Navigation and breadcrumbs](https://www.shoalrun.com/author/navigation.md) are configured site features. Their guides live under Customize.

## Reading and layout

- [Callouts](https://www.shoalrun.com/author/components/callout.md) — notes, tips, important messages, warnings, and cautions.
- [Badges](https://www.shoalrun.com/author/components/badge.md) — short inline labels for statuses, platforms, and versions.
- [Keyboard shortcuts](https://www.shoalrun.com/author/components/kbd.md) — key names inside instructions.
- [Short definitions](https://www.shoalrun.com/author/components/info-hint.md) — brief definitions that readers expand with a click, tap, or keyboard.
- [Tooltips](https://www.shoalrun.com/author/components/tooltips.md) — supporting text shown on hover or keyboard focus.
- [Progress](https://www.shoalrun.com/author/components/progress.md) — a bounded count with visible text and a bar.
- [Definition lists](https://www.shoalrun.com/author/components/definition-list.md) — terms and rich explanations in semantic HTML.
- [Action links](https://www.shoalrun.com/author/components/action-link.md) — prominent next-step and download links.
- [Math](https://www.shoalrun.com/author/components/math.md) — inline and display LaTeX expressions rendered to MathML.
- [File trees](https://www.shoalrun.com/author/components/file-tree.md) — nested files, folders, icons, and links.
- [Steps](https://www.shoalrun.com/author/components/steps.md) — numbered procedures with titles and full instructions.
- [Timelines](https://www.shoalrun.com/author/components/timeline.md) — milestone progress with a current stage and completion bar.
- [Collapsibles](https://www.shoalrun.com/author/components/collapsible.md) — individual disclosures and compact groups for optional detail.
- [Tabs](https://www.shoalrun.com/author/components/tabs.md) — alternate views and their child panels.
- [Code blocks](https://www.shoalrun.com/author/components/code-blocks.md) — fenced examples, filenames, and copy behavior.
- [Images](https://www.shoalrun.com/author/components/images.md) — responsive images, captions, width limits, and expanded viewing.
- [Diagrams](https://www.shoalrun.com/author/components/diagrams.md) — D2 and Mermaid source rendered to SVG with Markdown source preserved.
- [Only](https://www.shoalrun.com/author/components/only.md) — a short block for HTML or Markdown alone.
- [Tables](https://www.shoalrun.com/author/components/tables.md) — optional row filtering and sticky headings for long tables.
- [Walkthroughs](https://www.shoalrun.com/author/components/walkthroughs.md) — code explained step by step beside a scrolling code pane.
- [Hero](https://www.shoalrun.com/styling/layouts.md) — a landing page opener with a title, tagline, and action buttons.
- [Section](https://www.shoalrun.com/styling/layouts.md) — a full-width band on a splash page.
- [ThemePreview](https://www.shoalrun.com/styling/try.md) — a live switcher for trying presets, palettes, and color modes.
- [ReaderSection, ReaderChoice, and ReaderFilter](https://www.shoalrun.com/author/reader-views.md) — marked sections, choice buttons, and in-page filter controls.
- [FrontmatterReference](https://www.shoalrun.com/author/frontmatter-reference.md) — publish this project's built-in and declared page fields as a live reference.

## Links and reading paths

- [DocLink](https://www.shoalrun.com/author/components/doc-link.md) — a link by stable document ID.
- [DocCard, DocCards, and DocCollection](https://www.shoalrun.com/author/components/cards.md) — document previews, curated lists, and filtered collections.
- [CookbookChooser](https://www.shoalrun.com/author/components/cookbook-chooser.md) — choose among custodian-approved sets of prebuilt recipes.
- [RelatedReading](https://www.shoalrun.com/author/components/related-reading.md) — authored relationships as links or cards.

## Reuse and API content

- [Snippet and Var](https://www.shoalrun.com/author/snippets.md) — shared content and typed values.
- [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md) — named OpenAPI samples and schemas.
- [Fields](https://www.shoalrun.com/author/components/fields.md) — authored field lists that match schema formatting.

[Code highlighting](https://www.shoalrun.com/author/components/code-blocks.md) explains Shiki, theme selection, plain output, and custom adapters. Tabs and collapsibles accept ordinary Markdown and supported MDX components in their bodies; their subpages explain the exact nesting rules.

## Related reading

### Read first

- [Content and stable IDs](https://www.shoalrun.com/author/content.md) — Write a page with a stable ID before adding components to it.

### Next steps

- [Custom components](https://www.shoalrun.com/author/components/custom.md) — Register trusted components that preserve shared content.
