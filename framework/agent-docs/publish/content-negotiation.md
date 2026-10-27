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

Shoalrun builds two versions of every published page from one authored source. The HTML version is for people using a browser. The generated Markdown version contains shared material in a form agents can read directly. Authors can also add or suppress [format-specific content](https://www.shoalrun.com/author/components/only.md) in either version. The versions share a core but need not contain identical text.

**Content negotiation** lets a visitor ask for a format at the page's usual URL. Some agents send the request header `Accept: text/markdown`. A host that supports negotiation responds with Shoalrun's Markdown version. A browser asking for HTML gets the HTML version. The URL stays the same:

| Request to `/publish/output/`       | Response                                     |
| ----------------------------------- | -------------------------------------------- |
| Browser sends `Accept: text/html`   | HTML page, `Content-Type: text/html`         |
| Agent sends `Accept: text/markdown` | Markdown page, `Content-Type: text/markdown` |

`Accept` says what the visitor can use. `Content-Type` says what the host actually returned. The `.md` URL, such as `/publish/output.md`, also works directly.

## Why this matters

An agent reading HTML may receive navigation, styles, scripts, and interactive controls along with the article. It may then have to extract the useful content or convert the HTML to Markdown. Shoalrun's generated Markdown gives it the article directly, including material inside tabs and collapsibles and resolved OpenAPI examples. This can make the page easier to retrieve and less likely to lose content during conversion. [AFDocs checks](https://afdocs.dev/checks/markdown-availability) both `.md` URLs and content negotiation for this reason.

The direct `.md` links in each HTML page and [`/llms.txt`](https://www.shoalrun.com/llms.txt) help agents that know to follow them. Negotiation helps an agent that arrives at the ordinary page URL and requests Markdown without first discovering a second URL. It does not require writers to maintain a separate article.

## What Shoalrun builds and what the host does

Shoalrun creates the HTML page, its `.md` twin, and a [`/documents.json`](https://www.shoalrun.com/documents.json) manifest listing both URLs. It also writes [`/resource-headers.json`](https://www.shoalrun.com/resource-headers.json) with content types for Markdown and discovery files.

The host receives each HTTP request. It must read `Accept` and select the right built file. Providers use different names for this step: a server handler, a routing rule, or an edge function. The HTTP behavior is the same. A static file alone cannot read a request header.

Shoalrun's Node server handles this. The standalone [Vercel build](https://www.shoalrun.com/publish/vercel.md) generates Vercel rules. On another host, use the contract below to configure its routing feature. The [host adapter guide](https://www.shoalrun.com/publish/host-adapters.md) covers adding Shoalrun's files to another build.

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

## Validators and manifest links

A Markdown response includes its canonical HTML link and a `rel="describedby"` link to its current manifest record. The latter uses a JSON Pointer fragment, such as `/documents.json#/documents/3`. Fetch the manifest and select that array entry to read the page's ID, publication variant, and digests. The index can move between builds; use the response's current link and verify the Markdown digest.

Generated hosting metadata specifies a strong `ETag` equal to the quoted SHA-256 Markdown digest and `Cache-Control: public, max-age=0, must-revalidate`. The Node server handles matching `If-None-Match` requests with `304` and no body, including Markdown negotiated at an HTML URL. Negotiated responses retain `Vary: Accept`. Vercel receives the generated headers but can replace the ETag with its own validator, including a weak validator for compressed responses. Send the ETag returned by the host in `If-None-Match`; treat its value as opaque. To verify downloaded Markdown bytes, compare their SHA-256 with `digest` in the document manifest, independently of the HTTP validator.

Focused contracts have content-addressed URLs and a one-year immutable cache policy. Mutable JSON manifests and indexes require revalidation. See [focused contracts](https://www.shoalrun.com/api-docs/focused-contracts.md) for URL identity and retention limits. `resource-headers.json` describes selected hosting headers, including Markdown, JSON metadata, and contracts; it is not an exhaustive inventory of every static asset.

## Missing pages

A missing page returns HTTP `404`, with links to the documentation index, the search index when published, and the homepage. The response stays a `404` even though it provides recovery links. It does not redirect to the homepage or return an unrelated article with status `200`.

Shoalrun's Node server returns Markdown for a missing `.md` URL or a request that prefers `Accept: text/markdown`; other requests receive HTML. Both responses carry `X-Robots-Tag: noindex`. If a known Markdown twin is missing while its HTML page exists, the response links to that HTML page in its body and `Link` header. Unexpected server errors return `500`.

The build generates `404.html` and `404.md` under `site.basePath`. The Vercel adapter applies error routes after checking for existing files and preserves HTTP `404`. A missing known Markdown route includes an HTML alternate in its `Link` header. Its generic error body provides the discovery links.

On another static host, configure missing routes to serve these error files with HTTP `404`. Merely uploading them does not configure the host's error status or content negotiation. Serve `404.md` as `text/markdown; charset=utf-8`, and keep error responses out of search indexes with `X-Robots-Tag: noindex`.

## What if the host cannot negotiate?

GitHub Pages can publish Shoalrun's HTML, `.md` files, and `/llms.txt`. It serves static files and has no request handler for choosing a file from `Accept` or setting the page response headers described above. Agents can still read the `.md` URLs, but a request to the HTML URL cannot negotiate there. A programmable proxy or CDN can add that behavior. You can also publish the same built files on a host with request rules. Bare GitHub Pages cannot pass AFDocs' content-negotiation check.

`site.basePath` also prefixes assets, API contracts, `/llms.txt`, and discovery files. For a GitHub Pages project site at `/<repository>/`, set `site.basePath: /<repository>` and publish the matching subtree from the build output as the project site's root. GitHub Pages still cannot provide Markdown content negotiation at an HTML URL.

## Verify the deployed URL

Run the [post-deploy checker](https://www.shoalrun.com/publish/deployment-check.md) against the real site origin from `framework/`. It tests every page in the deployed manifest, direct `.md` URLs, required headers, discovery resources, and 404 behavior:

```sh
npm run deploy:check -- https://your-docs.example/
```

For a manual check of one page, replace the domain and page path below with one from your site:

```sh
curl -i -H 'Accept: text/html' https://your-docs.example/publish/output/
curl -i -H 'Accept: text/markdown' https://your-docs.example/publish/output/
curl -i https://your-docs.example/publish/output.md
curl -i -H 'Accept: text/markdown;q=0' https://your-docs.example/publish/output/
```

Check the status, headers, and body. The first and fourth requests should return HTML. The second and third should return readable Markdown that gives its reader what they need for the intended task. Shared facts and API constraints should stay consistent, while human- and agent-oriented content may differ; see [Shoalrun's authoring position](https://www.shoalrun.com/publish/agent-friendliness.md). The first two responses should include `Vary: Accept` so caches keep the formats separate, and a Markdown `Link` so clients can find the twin. The negotiated Markdown response should include `Content-Location` with its `.md` URL. Also check that a missing page returns 404 and the published discovery files have the types declared in `resource-headers.json`.

Run these checks against the production domain after deployment. Local preview results establish what Shoalrun's Node server does; they do not prove that a CDN applies the same rules. For a whole-site audit, run the [AFDocs scorecard](https://afdocs.dev/) against the deployed site and review its findings against the site's content requirements.

## Related reading

### Next steps

- [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) — Generate a Vercel deployment with negotiation already configured.

- [Add Shoalrun to another build or host](https://www.shoalrun.com/publish/host-adapters.md) — Supply the same HTTP rules on another host.

### Related topics

- [Content for one format](https://www.shoalrun.com/author/components/only.md) — Write instructions that apply to only the HTML page or only the Markdown twin.
