---
id: guide.vercel
title: Publish on Vercel
summary: Build a Vercel deployment with Markdown negotiation and correct
  discovery headers.
type: how-to
area: publishing
subarea: publishing-hosting
canonical: /publish/vercel
---

# Publish on Vercel

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Publish on Vercel

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/publish/vercel.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Confirm the deployed site returns the right content and headers.

Shoalrun can produce a [Vercel Build Output API](https://vercel.com/docs/build-output-api) directory. It contains the compiled static site and routing rules for each published page. Vercel serves HTML to browsers and the generated Markdown twin when a request includes `Accept: text/markdown`. The route rules also set `Vary: Accept` and an HTTP `Link` header to the `.md` page. Explicit `.md` URLs remain available.

The [content negotiation guide](https://www.shoalrun.com/publish/content-negotiation.md) explains the same HTTP contract for any host. This page shows how to configure Vercel specifically.

## Include an MCP endpoint

Enable `mcp` in your project config before running `shoalrun vercel build`. The output includes a separate Node function for the selected public publication, without requiring Ask or embeddings. See [connect an MCP client](https://www.shoalrun.com/publish/mcp.md) for configuration, host trust, limits, and the current verification status.

MCP analytics remains off unless you also configure its [server adapter](https://www.shoalrun.com/publish/mcp-analytics.md). If enabled, set its credentials on the function’s runtime environment. Browser analytics settings do not collect MCP traffic.
