---
id: guide.status
title: Project status
summary: What Shoalrun can do today, what I want to add next, and where its limits are.
type: reference
canonical: /status
---

# Project status

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project updates](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project updates](https://www.shoalrun.com/status.md) > Project > Project status

**Updated: 2026-10-18.**

Shoalrun is a private prototype for publishing documentation for people and agents from the same source. This public site is built with it. The compiler and CLI are available as an invite-only alpha package; there is no public package release.

## What works today

- **One source, two reading formats.** Markdown and supported MDX components produce a browser site and a [Markdown copy of every page](https://www.shoalrun.com/publish/agent-friendliness.md). Generated indexes, manifests, and section resources help agents discover and read the content without running the site’s JavaScript.
- **Structured authoring.** Templates, reusable snippets, custom metadata, and composable configuration support guides and reference pages. Stable page IDs connect links, cards, navigation, and related reading. [Recipes and cookbooks](https://www.shoalrun.com/author/recipes.md) combine reusable instructions into complete workflows. [Agent authoring tools](https://www.shoalrun.com/author/agents.md) provide project discovery, source context, draft previews, and local validation for your existing coding agent.
- **Rich documentation pages.** Built-in [components](https://www.shoalrun.com/author/components.md) include tabs, callouts, tables, code walkthroughs, steps, timelines, and API embeds, with defined Markdown output. [Diagrams](https://www.shoalrun.com/author/components/diagrams.md) render D2 and Mermaid syntax as SVG during the build; Pele renders the Mermaid diagrams. Markdown retains the diagram source and explanation.
- **Reader controls.** [File trees](https://www.shoalrun.com/author/components/file-tree.md) have expandable folders and keyboard navigation. [Collapsible groups](https://www.shoalrun.com/author/components/collapsible.md) join related disclosures without gaps. Authors can synchronize related [tabs](https://www.shoalrun.com/author/components/tabs.md) and add captions or expanded viewing to [images](https://www.shoalrun.com/author/components/images.md).
- **Configurable sites.** Themes, palettes, layouts, headers, and footers shape the presentation. [Navigation tabs](https://www.shoalrun.com/author/navigation.md) organize larger sites into sections. Explicit [versions and languages](https://www.shoalrun.com/publish/publications.md) publish separate page variants, while reader views tailor navigation and marked content to different audiences.
- **API documentation.** [OpenAPI sources](https://www.shoalrun.com/publish/api-references.md) supply reference pages, named examples, request samples, and contracts for individual operations. Authors can combine generated references with guides and review imported API content before publishing it.
- **Search and documentation tools.** Built-in search works in the browser without a model key. Optional [semantic search and cited answers](https://www.shoalrun.com/search-and-chat.md) use your configured providers. Read-only [Model Context Protocol (MCP) tools](https://www.shoalrun.com/publish/mcp.md) let agents search and read pages or sections. They run through a local stdio process or a public HTTP endpoint on Node or Vercel.
- **Publishing and measurement.** Local previews and checks support static publishing, with Node and Vercel serving options. Optional [browser analytics](https://www.shoalrun.com/author/analytics.md) and [HTTP MCP analytics](https://www.shoalrun.com/publish/mcp-analytics.md) send events through adapters to your chosen service. Both are off by default; their guides describe the event fields, filtering, and configuration.

## What I want to add next

- **Custom access control.** Add connectors for customers’ own role-based access control (RBAC) systems, with consistent access decisions across HTML, Markdown, search, downloads, and MCP.

These are intended additions, without a promised release date or a commitment to public package or source distribution.

## Current limits

- **Prototype stability.** Configuration, extension points, and output formats can still change. There is no stable release or compatibility promise yet.
- **Component extensibility.** [Trusted custom components](https://www.shoalrun.com/author/components/custom.md) lower into shared content, with a portable authoring skill. Arbitrary executable MDX remains unsupported. Project CSS, browser modules, and configured build extensions are trusted project code.
- **API coverage.** OpenAPI and JSON Schema support is partial; check the [support reference](https://www.shoalrun.com/api-docs/support.md) against your source. Request examples are copyable, but Shoalrun does not provide a live API explorer that sends requests.
- **Private content.** Reader views do not restrict access to published files. Shoalrun has no built-in reader authentication, and its HTTP MCP endpoint currently serves one selected public publication. Host-level authorization is a separate responsibility.
- **Managed services.** Shoalrun does not provide managed hosting, translation, or chat. Versions and translations need explicit authored variants. Optional model and analytics services need your own configuration and accounts.

Automatic skill generation and general agent orchestration are [deliberate non-goals](https://www.shoalrun.com/non-goals.md). Authors remain responsible for the accuracy and usefulness of their documentation.

## Related reading

### Reference while working

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) — Evaluate realistic tasks against the built documentation.

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Configure and test the implemented stdio documentation tools.

### Related topics

- [Non-goals](https://www.shoalrun.com/non-goals.md) — Distinguish deliberate scope limits from deferred features.

- [Changelog](https://www.shoalrun.com/changelog.md) — Check implemented capabilities and the remaining release work.

- [Navigation, page layouts, and browser analytics](https://www.shoalrun.com/changelog/2026-10-16-navigation-layouts.md) — Check the private prototype's capabilities and remaining release limits.
