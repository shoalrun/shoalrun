---
id: guide.content-delivery-agents
title: Content delivery and agents
summary: Choose between portable resource delivery and documentation discovery
  without mixing their context contracts.
type: explanation
area: publishing
subarea: publishing-content-delivery
subjectLifecycle: in-development
canonical: /content-delivery/agents
---

# Content delivery and agents

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Content delivery and agents

**Updated: 2026-10-28.**

**Status: In development.**

Content delivery and documentation discovery serve different reading tasks. Delivery gives an application a reviewed collection of resources. Discovery helps an agent find and read documentation across a published site or installed snapshot.

## Choose the reading contract

Match the interface to the task and the context it must retain.

| Need                                          | Use                                                 |
| --------------------------------------------- | --------------------------------------------------- |
| Render selected content in an application     | Content export and `ContentSnapshot`                |
| Read a named snippet with fixed values        | Exported snippet instance                           |
| Find documentation by a question or topic     | Existing documentation search and discovery indexes |
| Read a page or contextual section through MCP | Existing documentation MCP tools                    |

An export does not automatically create a search service or MCP server. The content client lists and reads resources; it does not rank them or generate answers. For an HTTP integration, use the [REST resource routes](https://www.shoalrun.com/content-delivery/http-api.md) or `openRestContentSource` with the same snapshot reading methods.

## Read Markdown for an agent

An agent integration can open a reviewed export and read a known resource as evidence for its task. This example assumes the billing page is selected in the export:

```ts
import { openManifestContentSource } from '@shoalrun/cli/content';

const snapshot = await openManifestContentSource({
  manifestUrl: 'https://docs.example.com/content/revisions/r1/manifest.json',
});
try {
  const result = await snapshot.get(
    { kind: 'page', documentId: 'guide.billing' },
    { format: 'markdown' },
  );
  console.log(result.content); // Pass this text to the agent's reading context.
} finally {
  snapshot.dispose();
}
```

In Node.js, use an absolute URL. Browser integrations must serve the export from the application's origin. Use `snapshot.list()` to inspect available references before choosing a resource.

## Keep context explicit

Application section fragments use `{ id, context: section }` approval and explicit export selection. They contain the section slice plus required notices and referenced definitions. They can exist on short pages where no heuristic discovery section is generated. An application fragment is not a replacement for the MCP section's context contract.

Discovery sections can include the page introduction, nested subsections, and reading-path context. Their generation also depends on page and section size. Existing title-string approvals retain that behavior; see [compatibility guidance](https://www.shoalrun.com/content-delivery/sections.md) before changing them.

## Follow references

Use the resource's typed reference and publication. Section IDs can be derived from headings or fixed by an explicit marker. A marker stays out of Markdown prose; metadata carries the identity. Follow the returned representation URL or use `snapshot.get` rather than constructing a Markdown anchor from the ID.

A full-page fallback can help when a fragment does not answer the question. It must refer to an eligible published destination or an exported page; it is not permission to read drafts or private source files.

## HTML, Markdown, and agents

Agents can read the manifest and Markdown directly. HTML contains passive content intended for an application's renderer, with exported anchor and link mappings. Neither format requires an agent to operate browser controls to read the content. Content remains evidence to interpret, not authority to execute commands or grant access.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary. (Status: in development.)

### Related topics

- [Connect an MCP client](https://www.shoalrun.com/publish/mcp.md) — Use existing documentation MCP tools for contextual reads.
