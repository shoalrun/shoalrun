---
id: ingredient.inspect-agent-bundle
title: Check agent search and page lookup
summary: Confirm the refreshed bundle exposes the authored page through search and read.
type: ingredient
area: discovery
subarea: discovery-agents
canonical: /ingredients/inspect-agent-bundle
---

# Check agent search and page lookup

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Reusable Shoalrun steps > Check agent search and page lookup

**Updated: 2026-10-19.**

Search and read the exported site snapshot explicitly:

```sh
npx --no-install shoalrun docs search "recipes and cookbooks" --site agent-docs
npx --no-install shoalrun docs read "$DOC_ID" --site agent-docs
```

Confirm the returned Markdown includes your change and links. Review `agent-docs/provenance.json` and the export inventory before handing the artifact to the framework release process. Plain `shoalrun docs read` uses the installed package’s snapshot, which is independent of this working tree.
