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

**Updated: 2026-10-19.**

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

## Validators and manifest links

A Markdown response includes its canonical HTML link and a `rel="describedby"` link to its current manifest record. The latter uses a JSON Pointer fragment, such as `/documents.json#/documents/3`. Fetch the manifest and select that array entry to read the page's ID, publication variant, and digests. The index can move between builds; use the response's current link and verify the Markdown digest.

Generated hosting metadata specifies a strong `ETag` equal to the quoted SHA-256 Markdown digest and `Cache-Control: public, max-age=0, must-revalidate`. The Node server handles matching `If-None-Match` requests with `304` and no body, including Markdown negotiated at an HTML URL. Negotiated responses retain `Vary: Accept`. Vercel receives the generated headers but can replace the ETag with its own validator, including a weak validator for compressed responses. Send the ETag returned by the host in `If-None-Match`; treat its value as opaque. To verify downloaded Markdown bytes, compare their SHA-256 with `digest` in the document manifest, independently of the HTTP validator.

Focused contracts have content-addressed URLs and a one-year immutable cache policy. Mutable JSON manifests and indexes require revalidation. See [focused contracts](https://www.shoalrun.com/api-docs/focused-contracts.md) for URL identity and retention limits. `resource-headers.json` describes selected hosting headers, including Markdown, JSON metadata, and contracts; it is not an exhaustive inventory of every static asset.
