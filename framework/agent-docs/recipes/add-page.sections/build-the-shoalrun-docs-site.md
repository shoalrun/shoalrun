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

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Add a page to this documentation site

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Build the Shoalrun docs site

- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.

Use the installed CLI to build Shoalrun's documentation:

```sh
npx --no-install shoalrun build docs/docs.config.yaml docs/dist
```

The source configuration is `docs/docs.config.yaml`; output goes to `docs/dist`. The root shortcut is `npm run docs:build`; it uses the installed package.

If the build fails, fix the named source or configuration issue and rerun it. A previous successful output can remain on disk after a failure, so file existence alone is not evidence of a successful new build.

Save `builtSite`: The successful site build at docs/dist, including documents.json and each published page.

**Continue when:** The build reports status: ok and the expected number of documents.
