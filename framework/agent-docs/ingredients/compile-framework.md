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

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Reusable Shoalrun steps > Install the site dependencies

**Updated: 2026-10-27.**

Install the versions pinned by this site’s lockfile:

```sh
npm ci
npx --no-install shoalrun config validate docs/docs.config.yaml
```

The manifest and lockfile pin the CLI version and registry artifact. Public npm releases need no package token or framework checkout. If your checkout still pins an older GitHub Packages release, follow [Getting started](https://www.shoalrun.com/start.md) to migrate registries. That older dependency still needs its original registry access until upgraded. Update and validate the dependency and lockfile together.
