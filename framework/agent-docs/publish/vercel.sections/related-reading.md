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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Publish on Vercel

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/publish/vercel.md)

Shoalrun can produce a [Vercel Build Output API](https://vercel.com/docs/build-output-api) directory. It contains the compiled static site and routing rules for each published page. Vercel serves HTML to browsers and the generated Markdown twin when a request includes `Accept: text/markdown`. The route rules also set `Vary: Accept` and an HTTP `Link` header to the `.md` page. Explicit `.md` URLs remain available.

The [content negotiation guide](https://www.shoalrun.com/publish/content-negotiation.md) explains the same HTTP contract for any host. This page shows how to configure Vercel specifically.

## Related reading

### Next steps

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Confirm the deployed site returns the right content and headers.

### Related topics

- [Host and limit documentation chat](https://www.shoalrun.com/chat/host.md) — Deploy the site itself to Vercel before you add the chat function. (Status: experimental.)

- [Add Shoalrun to another build or host](https://www.shoalrun.com/publish/host-adapters.md) — The Vercel build generates its own HTTP rules; other hosts need them supplied.
