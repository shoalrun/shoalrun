---
id: guide.deployment-check
title: Check a deployed site
summary: Run the provider-neutral HTTP checker after publishing and before release.
type: how-to
area: quality
subarea: quality-audits
canonical: /publish/deployment-check
---

# Check a deployed site

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Check a deployed site

**Updated: 2026-10-26.**

A local build verifies the generated files. After deployment, check what the host actually serves. This guide uses `scripts/check-deployment.mjs` from Shoalrun's docs repository; the script is not included in the `@shoalrun/cli` package. From the docs repository root, pass the deployed **site origin** to the checker:

```sh
npm run deploy:check -- https://docs.example.com/
```

Use the real HTTPS site URL and a trailing slash, including a configured base path such as `https://docs.example.com/docs/`. The command does not change the deployed site.

For a branch deployment, pass the full hash that the deployment job checked out. The checker reads `/build-info.json` and fails if that domain serves a different revision:

```sh
npm run deploy:check -- https://docs.example.com/ --source-commit "$SOURCE_COMMIT"
```

`SOURCE_COMMIT` must be a 40- or 64-character Git commit hash. Supply it from the job that deploys this origin, for example `git rev-parse HEAD` after checkout. A missing or mismatched record is a failure.

For a site with hosted chat and search, add `--chat`. It checks the public chat settings and both endpoints: GET returns 405, a foreign origin returns 403, and an invalid same-origin request returns 400. Invalid requests stop before model or embedding calls. If chat is already paused, use `--chat --chat-paused` instead; the checker expects its 503 paused response. It does not change the pause flag.

```sh
npm run deploy:check -- https://docs.example.com/ --chat
```

## What it checks

The checker reads the deployed `/documents.json` and tests every listed page:

- HTML at the page URL with `Accept: text/html`, including its content type, `Vary: Accept`, and alternate Markdown `Link` header.
- Markdown at the same URL with `Accept: text/markdown`, including its content type, `Vary`, `Content-Location`, and alternate link.
- The direct `.md` URL and exact text equality between its body and the negotiated Markdown body.
- Each page's `og:url` and `og:image` point to the checked public origin. When pages have share images, it fetches one image and checks that the host serves it as an image.
- Canonical links point to the page being checked, and noindex matches the manifest's indexing choice.
- `/robots.txt` advertises the sitemap when one exists. Every sitemap URL matches an indexable manifest page, every indexable page is listed once, and `lastmod` matches its metadata. The checker fetches child sitemaps and catches redirects and HTTP errors.

It also checks `/llms.txt`, `/resource-headers.json`, and the API catalog when the resource headers declare one. It verifies discovery content types and that a random missing route returns 404 for both HTML and Markdown requests. This establishes the host's response behavior; it does not judge whether the authored HTML and Markdown prose mean the same thing.

## Read the result

The command prints a `PASS` or `FAIL` summary with request, document, and failure counts. On failure, each `FAIL` line names the route and the missing or incorrect response. For example, a Markdown response served as HTML is reported as a `Content-Type` failure. Fix the host route or headers, deploy again, and rerun the checker before release.

Exit status `0` means every check passed, `1` means the deployed site failed one or more checks, and `2` means the command input is invalid. A passing result does not replace manual review, accessibility checks, or an external scorecard.

The [content negotiation guide](https://www.shoalrun.com/publish/content-negotiation.md) defines the host-independent HTTP contract. The [Vercel guide](https://www.shoalrun.com/publish/vercel.md) shows one hosting recipe. The checker works against any provider that serves the same contract.

## Related reading

### Related topics

- [Host and limit documentation chat](https://www.shoalrun.com/chat/host.md) — Check a deployed site's headers, redirects, and Markdown negotiation. (Status: experimental.)

### Often confused with

- [Audit a docs project](https://www.shoalrun.com/publish/audit.md) — The audit checks project sources in CI; the deployment check tests the published site over HTTP.
