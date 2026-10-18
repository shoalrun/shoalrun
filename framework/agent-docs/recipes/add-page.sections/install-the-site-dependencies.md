---
id: recipe.add-page
title: Add a page to this documentation site
summary: Create a guide, add navigation, build and audit it, then refresh its
  agent documentation.
type: recipe
canonical: /recipes/add-page
---

# Add a page to this documentation site

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Add a page to this documentation site

**Updated: 2026-10-18.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Install the site dependencies

- Use `repositoryCheckout` from **Before you start**: This documentation repository and its package lockfile.

Install the versions pinned by this site’s lockfile:

```sh
npm ci
npx --no-install shoalrun config validate docs/docs.config.yaml
```

This site pins a private registry package in its manifest and lockfile. Your account needs package read access, and the install environment must provide `NODE_AUTH_TOKEN` for the committed `.npmrc`. It needs no framework checkout. Update and validate the dependency and lockfile together when upgrading.

Save `frameworkCli`: The installed shoalrun executable in node_modules/.bin.

**Continue when:** The dependency installation succeeds and the installed CLI validates the site configuration.
