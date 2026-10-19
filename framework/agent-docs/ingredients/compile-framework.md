---
id: ingredient.compile-framework
title: Install the site dependencies
summary: Install the pinned Shoalrun package and this site’s declared dependencies.
type: ingredient
area: publishing
subarea: publishing-builds
canonical: /ingredients/compile-framework
---

# Install the site dependencies

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Reusable Shoalrun steps > Install the site dependencies

**Updated: 2026-10-19.**

Install the versions pinned by this site’s lockfile:

```sh
npm ci
npx --no-install shoalrun config validate docs/docs.config.yaml
```

This site pins a private registry package in its manifest and lockfile. Your account needs package read access, and the install environment must provide `NODE_AUTH_TOKEN` for the committed `.npmrc`. It needs no framework checkout. Update and validate the dependency and lockfile together when upgrading.
