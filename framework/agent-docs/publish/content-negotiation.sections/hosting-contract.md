---
id: guide.content-negotiation
title: Content negotiation
summary: Understand content negotiation, why it helps agents, and what a hosting
  provider needs to do.
type: reference
area: discovery
subarea: discovery-agents
canonical: /publish/content-negotiation
---

# Content negotiation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Content negotiation

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/content-negotiation.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) — Generate a Vercel deployment with negotiation already configured.

- [Add Shoalrun to another build or host](https://www.shoalrun.com/publish/host-adapters.md) — Supply the same HTTP rules on another host.

Shoalrun builds two versions of every published page from one authored source. The HTML version is for people using a browser. The generated Markdown version contains shared material in a form agents can read directly. Authors can also add or suppress [format-specific content](https://www.shoalrun.com/author/components/only.md) in either version. The versions share a core but need not contain identical text.

**Content negotiation** lets a visitor ask for a format at the page's usual URL. Some agents send the request header `Accept: text/markdown`. A host that supports negotiation responds with Shoalrun's Markdown version. A browser asking for HTML gets the HTML version. The URL stays the same:

| Request to `/publish/output/`       | Response                                     |
| ----------------------------------- | -------------------------------------------- |
| Browser sends `Accept: text/html`   | HTML page, `Content-Type: text/html`         |
| Agent sends `Accept: text/markdown` | Markdown page, `Content-Type: text/markdown` |

`Accept` says what the visitor can use. `Content-Type` says what the host actually returned. The `.md` URL, such as `/publish/output.md`, also works directly.

## Hosting contract

For each published page, use the two URLs in `documents.json`. Configure the host as follows:

1. At the page URL, return the Markdown twin when `Accept` explicitly requests `text/markdown` with a nonzero quality value. Otherwise return HTML.
2. Keep the URL in the browser unchanged when serving the twin. Use an internal rewrite or server response, not a redirect to `.md`.
3. On the Markdown response, set `Content-Type: text/markdown; charset=utf-8`, `Vary: Accept`, and `Content-Location` to the `.md` URL.
4. On both page responses, set `Link: <PAGE.md>; rel="alternate"; type="text/markdown"`. Keep the HTML document's existing alternate link as well.
5. Serve direct `.md` URLs as `text/markdown`. Apply the content types in [`/resource-headers.json`](https://www.shoalrun.com/resource-headers.json) to discovery files, especially `/.well-known/api-catalog` when it is published.
6. Limit the negotiation rule to published documentation pages. Leave assets, API contracts, and `/llms.txt` alone. Missing routes use the error responses described below.

The Vercel rule matches the Node server except when `text/markdown` and the HTML or wildcard entry it competes with both have fractional weights. The [Vercel guide](https://www.shoalrun.com/publish/vercel.md) gives the details. The Node server compares the requested HTML and Markdown weights. When the weights tie, Markdown wins. A wildcard such as `text/*` or `*/*` alone never selects Markdown; the request must name `text/markdown`.

To try it locally, run `npm run docs:preview` from the repository root, then request a page:

```sh
curl -i -H 'Accept: text/markdown' http://127.0.0.1:8770/publish/agent-friendliness/
```
