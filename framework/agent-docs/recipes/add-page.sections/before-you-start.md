---
id: recipe.add-page
title: Add a page to this documentation site
summary: Create a guide, add navigation, build and audit it, then refresh its
  agent documentation.
type: recipe
area: authoring
subarea: authoring-pages
canonical: /recipes/add-page
---

# Add a page to this documentation site

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Add a page to this documentation site

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Before you start

- `DOC_ID`: Set `export DOC_ID=guide.my-new-guide` for the new guide; use the same ID in navigation and every check.
- `repositoryCheckout`: This documentation repository with its pinned package and lockfile.
- Run commands from the documentation repository root.
- Use Node.js 22.12 or newer.
- Use Node.js 22.12 or newer and install site dependencies with `npm ci` if needed.
- Install Vale 3.20 or newer for this repository's configured formatting check.
