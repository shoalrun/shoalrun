---
id: guide.host-chat
title: Host and limit documentation chat
summary: Deploy chat on Vercel with shared usage limits, a visitor challenge,
  optional logs, and an off switch.
type: how-to
area: discovery
subarea: discovery-chat
subjectLifecycle: experimental
canonical: /chat/host
---

# Host and limit documentation chat

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Documentation chat > Host on Vercel

**Updated: 2026-10-19.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/host.md)

Host chat after [testing it locally](https://www.shoalrun.com/chat/setup.md). The Vercel function runs beside the documentation site and needs shared usage limits. You can also add a visitor challenge, question logging, and an immediate pause switch.

Before building the hosted function, have these ready:

- Chat and embedding configuration, with the provider keys available in the required environments.
- A shared store that speaks the Upstash REST API.
- A Vercel project and the public address in `site.origin`.

The normal site build does not add this function. Hosted provider requests can incur costs.

## Related reading

### Related topics

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Check a deployed site's headers, redirects, and Markdown negotiation.

- [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) — Deploy the site itself to Vercel before you add the chat function.
