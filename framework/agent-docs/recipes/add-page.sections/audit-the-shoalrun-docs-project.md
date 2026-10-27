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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Audit the Shoalrun docs project

- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.

Run Shoalrun's configured checks. This repository's formatting check requires [Vale](https://vale.sh/) 3.20 or newer:

```sh
npx --no-install shoalrun audit docs/docs.config.yaml
```

The audit checks configured project commands, API representations, and focused contracts. Read any reported finding and fix its source before continuing. This command does not run the complete framework test suite or replace a browser review. Framework source changes and tests belong in the framework repository.

Save `auditPassed`: A successful audit report with no failed configured checks.

**Continue when:** The audit exits successfully and reports status: ok with no failed checks.
