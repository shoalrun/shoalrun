---
id: ingredient.scaffold-page
title: Scaffold a new guide
summary: Create a draft guide with a stable ID without overwriting an existing file.
type: ingredient
area: authoring
subarea: authoring-pages
canonical: /ingredients/scaffold-page
---

# Scaffold a new guide

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Reusable Shoalrun steps > Scaffold a new guide

**Updated: 2026-10-19.**

Choose a file name, title, and stable document ID for your real topic. The commands use `my-new-guide` as the example; replace those values together.

```sh
npx --no-install shoalrun scaffold how-to -n docs/content/my-new-guide.mdx \
  --config docs/docs.config.yaml --id "$DOC_ID" --title 'My new guide'
```

The command refuses to overwrite an existing file. If this guide already exists, edit it directly instead of scaffolding it again. Keep its access policy set to `draft` while writing.
