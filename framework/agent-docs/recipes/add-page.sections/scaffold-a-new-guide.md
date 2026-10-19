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

## Scaffold a new guide

- Use `DOC_ID` from **Before you start**: The stable document ID chosen for the new guide.
- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.

Choose a file name, title, and stable document ID for your real topic. The commands use `my-new-guide` as the example; replace those values together.

```sh
npx --no-install shoalrun scaffold how-to -n docs/content/my-new-guide.mdx \
  --config docs/docs.config.yaml --id "$DOC_ID" --title 'My new guide'
```

The command refuses to overwrite an existing file. If this guide already exists, edit it directly instead of scaffolding it again. Keep its access policy set to `draft` while writing.

Save `draftPage`: The new draft at docs/content/my-new-guide.mdx with ID guide.my-new-guide.

**Continue when:** The CLI creates the requested file with draft access and the intended document ID.
