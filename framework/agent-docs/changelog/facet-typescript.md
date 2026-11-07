---
id: change.facet-typescript
title: Build selection and TypeScript references
summary: Select additional sections for each build, generate TypeScript SDK
  references, and improve search queries written as questions.
type: changelog-entry
area:
  - publishing
  - api
  - discovery
  - project
subarea:
  - publishing-builds
  - api-generation
  - discovery-search
  - project-releases
canonical: /changelog/facet-typescript
date: 2026-11-07
releaseVersion: 1.1.0
---

# Build selection and TypeScript references

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Project](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project](https://www.shoalrun.com/status.md) > Changelog > 1.1: Build selection and TypeScript

**Published: 2026-11-07.**

**Version: 1.1.0.**

Upgrade to CLI `1.1.0` and rebuild your site and application exports.

## [Choose sections for each build](https://www.shoalrun.com/author/components/for-facet.md)

Choose which sections each build includes using any configured facet and its choices. `ForFacet` uses your existing `contentFilter` to omit unmatched sections from Markdown, search, and expanded resources. A shared customer page with additional internal notes is one example. It needs no customer profile. The authoring skill covers facet selection and checks for content crossing builds.

## [Generate TypeScript SDK references](https://www.shoalrun.com/api-docs/typescript-references.md)

Extract a public TypeScript entry point and JSDoc into native reference pages with overloads, linked types, optional methods, and readonly properties. Install `typescript@5.9.3` explicitly for extraction; normal site builds use the saved JSON. The authoring skill covers this workflow, and Shoalrun's [content client reference](https://www.shoalrun.com/content-delivery/sdk/all.md) provides a real example.

## [Find docs with questions](https://www.shoalrun.com/author/search.md)

Browser and CLI keyword search give content terms priority over filler words, so a focused page can match a question without repeating every word. Shoalrun's docs also recognize more common search vocabulary through configured synonyms.

## [Check intentional format differences](https://www.shoalrun.com/author/components/only.md)

HTML-only `Only` blocks carry `data-markdown-ignore` for compatible parity checks. Tooltip and info-hint content remains covered by the HTML/Markdown comparison.

## [Load the right agent skill](https://www.shoalrun.com/contribute/agent-skills.md)

Connect complete skill folders to your agent's discovery directory, use explicit loading instructions in the project, and follow a short checklist at the start of each bundled skill. CLI skill listing remains separate from native agent discovery.
