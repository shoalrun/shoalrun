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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/vercel.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Confirm the deployed site returns the right content and headers.

Shoalrun can produce a [Vercel Build Output API](https://vercel.com/docs/build-output-api) directory. It contains the compiled static site and routing rules for each published page. Vercel serves HTML to browsers and the generated Markdown twin when a request includes `Accept: text/markdown`. The route rules also set `Vary: Accept` and an HTTP `Link` header to the `.md` page. Explicit `.md` URLs remain available.

The [content negotiation guide](https://www.shoalrun.com/publish/content-negotiation.md) explains the same HTTP contract for any host. This page shows how to configure Vercel specifically.

## Prepare your project

Start with the [quickstart](https://www.shoalrun.com/start.md). Your documentation repository installs the private package and keeps its own content and configuration. It needs no framework source checkout:

```text
.npmrc
package.json
package-lock.json
docs.config.yaml
content/
vercel.json
```

Set `site.origin` in `docs.config.yaml` to your intended public HTTPS origin before release. This controls canonical and share-image URLs. Generate deployment output locally:

```sh
npx --no-install shoalrun vercel build docs.config.yaml .vercel/output
```

Generating output does not deploy it.
