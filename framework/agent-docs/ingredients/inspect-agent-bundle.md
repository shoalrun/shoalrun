---
id: ingredient.inspect-agent-bundle
title: Check agent search and page lookup
summary: Confirm the refreshed bundle exposes the authored page through search and read.
type: ingredient
canonical: /ingredients/inspect-agent-bundle
---

# Check agent search and page lookup

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Reusable Shoalrun steps > Check agent search and page lookup

**Updated: 2026-10-18.**

Search and read the exported site snapshot explicitly:

```sh
npx --no-install shoalrun docs search "recipes and cookbooks" --site agent-docs
npx --no-install shoalrun docs read "$DOC_ID" --site agent-docs
```

Confirm the returned Markdown includes your change and links. Review `agent-docs/provenance.json` and the export inventory before handing the artifact to the framework release process. Plain `shoalrun docs read` uses the installed package’s snapshot, which is independent of this working tree.
