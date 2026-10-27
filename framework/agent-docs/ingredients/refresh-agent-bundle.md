---
id: ingredient.refresh-agent-bundle
title: Regenerate the agent documentation bundle
summary: Build the offline Markdown and search index used by the CLI.
type: ingredient
area: discovery
subarea: discovery-agents
canonical: /ingredients/refresh-agent-bundle
---

# Regenerate the agent documentation bundle

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Reusable Shoalrun steps > Regenerate the agent documentation bundle

**Updated: 2026-10-19.**

Export the already built site for the framework’s next documentation snapshot:

```sh
npm run agent-docs:build
```

Build the site first. The export copies that output without rebuilding and records the site build identity and pinned package integrity in `agent-docs/provenance.json`. It does not modify the installed package.

Review and transfer the export as a versioned artifact to the framework repository. Framework releases consume an explicitly selected snapshot; they must not fetch the latest site during a package build.
