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

**Page reading path** — these links apply to the full page.

**Next steps**

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Confirm the deployed site returns the right content and headers.

Shoalrun can produce a [Vercel Build Output API](https://vercel.com/docs/build-output-api) directory. It contains the compiled static site and routing rules for each published page. Vercel serves HTML to browsers and the generated Markdown twin when a request includes `Accept: text/markdown`. The route rules also set `Vary: Accept` and an HTTP `Link` header to the `.md` page. Explicit `.md` URLs remain available.

The [content negotiation guide](https://www.shoalrun.com/publish/content-negotiation.md) explains the same HTTP contract for any host. This page shows how to configure Vercel specifically.

## Check the deployment

After Vercel gives you a deployment URL, run the [provider-neutral deployment checker](https://www.shoalrun.com/publish/deployment-check.md) before release. Shoalrun's docs repository includes it as a site-owned command:

```sh
npm run deploy:check -- https://your-docs.example/
```

It checks every published page, discovery resources, and missing routes. To inspect one page manually, replace `https://your-docs.example` below and compare the responses:

```sh
curl -I -H 'Accept: text/html' https://your-docs.example/install/
curl -I -H 'Accept: text/markdown' https://your-docs.example/install/
curl -I https://your-docs.example/install.md
```

The first request should return `Content-Type: text/html`; the second should return `Content-Type: text/markdown`, `Vary: Accept`, and `Content-Location: /install.md`. Both page responses include an HTTP `Link` to the Markdown twin. The third request tests the explicit `.md` URL. Check `/llms.txt` and, if enabled, `/.well-known/api-catalog` as well.

The Vercel static routing rule selects Markdown when the `Accept` header explicitly includes `text/markdown` with nonzero quality. It keeps HTML when Markdown has a fractional weight and `text/html` has full weight, or when `text/html` is absent and `text/*` or `*/*` has full weight. A header rule can't compare two fractional weights. So `text/html;q=0.9, text/markdown;q=0.8` and `text/markdown;q=0.3, text/*;q=0.5` get Markdown on Vercel and HTML from the Node server.

Run the post-deploy checker after publishing each new revision. The fractional-weight limitation above remains.
