---
id: change.mcp-hosting
title: MCP hosting, analytics, and component improvements
summary: Serve documentation tools, measure MCP calls, and build custom
  components with shared HTML and Markdown content.
type: changelog-entry
area: discovery
subarea: discovery-mcp
canonical: /changelog/2026-10-17-mcp-hosting
date: 2026-10-17
---

# MCP hosting, analytics, and component improvements

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Changelog](https://www.shoalrun.com/.well-known/shoalrun/navigation/changelog-tab-50f26fe22670.txt) (ID: changelog-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Changelog](https://www.shoalrun.com/changelog.md) > Changelog > MCP hosting, analytics, and component improvements

**Published: 2026-10-17.**

This entry groups the October 17 changes to Shoalrun’s private prototype. It does not announce a package release.

## Serve documentation tools over HTTP

Projects can enable an MCP endpoint for one explicitly public publication. It exposes the existing read-only search, page, outline, and section tools through the Node server. The Vercel build can package an independent function without Ask, embeddings, or a model key. Read-only SDK calls have also been verified on this site’s production Vercel endpoint.

The endpoint uses a scoped, byte-verified copy of published Markdown and indexes. Search works independently of browser search settings. Host and origin checks, request limits, deadlines, and publication checks apply before serving documentation. Stdio remains available.

See [connect an MCP client](https://www.shoalrun.com/publish/mcp.md) for configuration, limits, and when MCP helps alongside public Markdown.

## Measure MCP tool calls

An optional `mcp.analytics.module` server adapter receives tool outcomes, duration, build/publication identity, and published page or section IDs. Analytics is off by default. The adapter is separate from browser analytics and runs on the serving host.

The PostHog example emits native MCP events and flushes before the HTTP response completes. Separate opt-ins add supported client/model labels, agent intent, and conversation grouping. Labels are unverified. Intent is limited to fixed categories; free text is replaced before delivery. Unknown model labels are omitted. The example excludes raw queries, complete arguments, results, headers, and exception bodies from outbound events. GeoIP enrichment and person profiles are disabled; session grouping remains pseudonymous.

See [measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) for the adapter contract, privacy limits, and setup steps. Other services can use the same server adapter interface.

## Render Mermaid syntax with Pele

[Pele](https://pele.run/) replaces Mermaid CLI for Mermaid-syntax diagrams. Diagram builds no longer launch Chrome, and production package installs no longer include Puppeteer. Browser development tests still use it.

Inline diagrams follow the site’s palette and color mode, support per-diagram width caps, and retain source and summaries in Markdown. Use native Pele CSS variables to override the default theme mapping. The [Pele gallery](https://www.shoalrun.com/author/components/diagrams/pele-gallery.md) shows the built-in families and 48 flowchart shapes. The [D2 gallery](https://www.shoalrun.com/author/components/diagrams/d2-gallery.md) adds 17 examples covering shapes, containers, sequence diagrams, tables, classes, and layout engines. Both galleries include source examples you can copy.

## More interactive documentation components

[File trees](https://www.shoalrun.com/author/components/file-tree.md) now have expandable folders, keyboard navigation, and optional expand-all controls. [Collapsible groups](https://www.shoalrun.com/author/components/collapsible.md) keep related disclosures in one compact stack while allowing multiple items to stay open.

[Tabs](https://www.shoalrun.com/author/components/tabs.md) can synchronize matching choices across related examples on a page. [Images](https://www.shoalrun.com/author/components/images.md) support captions and an optional expanded viewer; width is optional. The viewer supports keyboard dismissal and returns focus to the image link.

Markdown retains all tree nodes, disclosure bodies, tab alternatives, image descriptions, and captions. Native disclosures and original-image links remain useful without JavaScript.

## Build custom components

Projects can register [trusted custom components](https://www.shoalrun.com/author/components/custom.md) from local files or installed packages through one component manifest. Each component implements a required `content()` function using shared content helpers. Shoalrun renders that content as HTML and Markdown, including links, search content, and section resources. Attribute and child validation report authoring errors during the build.

Optional browser modules add interactive controls, including React, with explicit data from the same content function. Shoalrun bundles imports and JSX, publishes browser assets, and tracks dependencies for rebuilds and isolated authoring validation. Shared documentation remains readable without JavaScript. Configured component code is trusted; arbitrary MDX imports and React page rendering remain outside this API.

The bundled `shoalrun-component-author` skill guides agents through the component contract, implementation, and focused validation.
