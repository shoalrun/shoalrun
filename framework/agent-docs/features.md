---
id: guide.features
title: Shoalrun features
summary: A concise overview of Shoalrun's capabilities and operating limits.
type: overview
area: project
subarea: project-overview
canonical: /features
---

# Shoalrun features

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Shoalrun features

**Updated: 2026-11-06.**

Shoalrun compiles product and API documentation into a website and agent-readable content from the same source. You own the source files, build output, and deployment. The normal compiler build makes no model calls or network requests.

## What you can build

Follow a topic link for configuration, examples, and limits.

| Capability                                                                             | What you can do                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [One source, multiple outputs](https://www.shoalrun.com/publish/agent-friendliness.md) | Write Markdown and supported MDX; publish HTML, Markdown copies, discovery indexes, manifests, and readable sections.                                                                                                         |
| [Structured authoring](https://www.shoalrun.com/author/content.md)                     | Give documents stable IDs; reuse templates, snippets, variables, metadata, and configuration. Connect navigation and related reading by ID.                                                                                   |
| [Documentation components](https://www.shoalrun.com/author/components.md)              | Use tabs, callouts, tables, steps, walkthroughs, diagrams, and trusted custom components with defined Markdown representations.                                                                                               |
| [Code highlighting](https://www.shoalrun.com/author/components/code-blocks.md)         | Highlight built-in languages or register a custom language with a local TextMate JSON grammar and aliases. Preserve the original code in Markdown.                                                                            |
| [OpenAPI documentation](https://www.shoalrun.com/publish/api-references.md)            | Generate reference pages, embed API examples and schemas, show request samples, and publish focused operation contracts. Review source changes before publishing.                                                             |
| [Customer editions](https://www.shoalrun.com/publish/deployment-profiles.md)           | Select exact product releases, SKU revisions, and feature grants. Remove excluded pages and sections during compilation.                                                                                                      |
| [Independent products and versions](https://www.shoalrun.com/publish/publications.md)  | Give each product its own documentation versions and defaults, with explicit languages and routes.                                                                                                                            |
| [Search and agent tools](https://www.shoalrun.com/search-and-chat.md)                  | Search the selected publication by keyword or optional semantic retrieval. Read-only Model Context Protocol (MCP) tools discover publications and read pages within token budgets. Optional cited answers use your providers. |
| [Content delivery](https://www.shoalrun.com/content-delivery.md)                       | Export selected pages, approved sections, and snippets for an application. Clients and REST retain exact product scope; productless version 1 contracts remain supported.                                                     |
| [Printing and styled PDFs](https://www.shoalrun.com/publish/pdf.md)                    | Offer branded Print PDF buttons, export styled pages or full manuals with the CLI, and serve optional page PDF downloads through a Node host.                                                                                 |
| [Workflows and validation](https://www.shoalrun.com/author/agent-overview.md)          | Use your coding agent with project discovery, isolated validation, and matching previews. Watch a customer edition with `dev --profile`. Compose recipes and cookbooks.                                                       |
| [Agent skills](https://www.shoalrun.com/reference/agent-skills.md)                     | Use packaged workflows for setup, authoring, components, recipes, walkthroughs, branding, and PDF design with `shoalrun-pdf`.                                                                                                 |
| [Presentation and navigation](https://www.shoalrun.com/styling/themes.md)              | Configure themes, layouts, branding, and navigation. Switch publications through a grouped dropdown, with language labels hidden automatically for single-language editions.                                                  |
| [Publishing and measurement](https://www.shoalrun.com/publish.md)                      | Publish static output or use Node and Vercel serving options. Add analytics through optional adapters.                                                                                                                        |

## Before you choose Shoalrun

Configuration and output contracts can change as Shoalrun develops. OpenAPI and JSON Schema support is partial. Arbitrary executable MDX and a live API request explorer aren't supported.

You supply hosting, reader authentication, authored translations, and any optional model or analytics services. Reader views change browsing convenience; they don't restrict access to published files. The hosted public MCP endpoint serves one configured publication, and profiled Vercel chat builds aren't supported.

## HTML, Markdown, and agents

This overview keeps the same feature descriptions and topic links in HTML and Markdown. Topic links lead to the detailed instructions. Agents can read the overview without browser scripts, then discover and retain the exact publication when searching or requesting a page. Interactive components have their own output and keyboard behavior documented in their references.
