---
id: guide.seo
title: SEO and social previews
summary: Give each page a useful title and summary, generate share cards, and
  verify public preview URLs.
type: how-to
area: appearance
subarea: appearance-branding
canonical: /publish/seo
---

# SEO and social previews

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > SEO and social previews

**Updated: 2026-10-25.**

When someone shares a docs link, Slack and other services fetch the page's HTML and look for a title, description, and image. Shoalrun writes these tags at build time from page metadata and can generate a share image for every page. Start with a clear page `title` and a one-sentence `summary`; you do not need to hand-write Open Graph or Twitter tags.

## Set the public address

Put the address readers actually use in `site.origin`. This is where crawlers will fetch the page and its image:

```yaml title="docs.config.yaml"
site:
  title: Acme API docs
  origin: https://docs.acme.com
```

Check the domain in the built `og:image` URL. A page may display in a browser while its social preview cannot load an image from that domain. Preview deployments behind sign-in cannot be unfurled by a public crawler. [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) explains the production and preview origins for this site's build.

## Write the page title and summary

```yaml title="content/start.mdx (frontmatter)"
title: Getting started
summary: Create your first project and make a request.
```

The title becomes the page heading and browser title. The summary is the default preview description and appears on the generated share image. For short titles, Shoalrun adds `site.title` to the Open Graph and Twitter titles when the result fits within 70 characters. The browser title and page heading remain unchanged.

If a page needs a different browser and social title, or a different description, use `seo.title` and `seo.description` in its [frontmatter](https://www.shoalrun.com/author/frontmatter.md):

```yaml
seo:
  title: Getting started with Acme API
  description: Create a project, choose a credential, and make your first request.
```

`seo.title` sets the exact browser and social title; it skips the automatic site-name suffix. `seo.description` sets the browser and social description unless the page selects a separate `displayText.socialCard`. The generated image uses the same selected description, so its copy agrees with the tags. You can configure the text choices site-wide under `outputs.text`; see [text surfaces](https://www.shoalrun.com/author/custom-metadata.md) for precedence.

## What the build adds

The build derives these metadata and discovery outputs from your site and page settings.

| Output                                     | Default source                                                       |
| ------------------------------------------ | -------------------------------------------------------------------- |
| HTML `<title>`                             | `seo.title`, then page `title`                                       |
| HTML `name="description"`                  | `seo.description`, then configured HTML description                  |
| `og:title` and `twitter:title`             | Browser title, with `site.title` added for short titles when it fits |
| `og:description` and `twitter:description` | Selected social description, falling back to the page `summary`      |
| `og:url`                                   | `site.origin` plus the published page route                          |
| Canonical URL                              | `site.origin` plus the published page route                          |
| XML sitemap `lastmod`                      | Page `updated`, then optional `site.updated`                         |
| `og:image` and `twitter:image`             | Absolute URL of that page's share image                              |
| `twitter:card`                             | `summary_large_image` when a share image exists                      |

The default image is a 1200×630 PNG with the page type, title, summary, site name, and URL. [Share images and favicon](https://www.shoalrun.com/styling/share-images.md) shows how to replace a page image or the site-wide design. Turning off share images removes image tags on pages without their own image.

## Check the deployed page

Build and deploy, then run the [deployment checker](https://www.shoalrun.com/publish/deployment-check.md) with the public origin:

```sh
npm --prefix framework run deploy:check -- https://docs.acme.com/
```

It checks page responses, compares `og:url` and `og:image` with that origin, and fetches a share image. To inspect one page directly, view its HTML source and open the absolute `og:image` URL in a private browser window. On Vercel, the deployment's [Open Graph tab](https://vercel.com/docs/deployments/og-preview) can show a preview for Slack and other services.

When `site.origin` is set, the build writes `/sitemap.xml` from public, indexable page routes and advertises it in `/robots.txt`. Every page gets a self-referencing canonical URL. A page with `seo.noindex: true` stays public, gets a noindex tag, and is omitted from the sitemap. Set `site.indexing: false` for a preview: every page gets noindex and the build omits the sitemap. Crawlers can still reach those pages to read noindex.

Set `updated` in a page's frontmatter to the date of a meaningful content update, such as `2026-09-27`. A timezone-qualified ISO timestamp is also accepted. Shoalrun copies it to sitemap `lastmod`; it never substitutes build time. `site.updated` is an optional date fallback for generated pages and other pages without `updated`. Change it only when the material it covers changes. Dates may repeat across pages when they really changed together. Without `site.freshness`, the build uses declared dates. It never reads file modification times to determine content updates.

### Derive revision dates from content changes

Opt into a content-digest history:

```yaml title="docs.config.yaml"
site:
  freshness:
    history: ./config/content-updates.json
```

The history file must be inside the project and its parent directory must already exist. The first successful build seeds each page with its declared `updated`, then `site.updated`, then today's UTC date. Later builds compare the resolved HTML and Markdown content plus displayed page metadata. Unchanged content keeps its recorded Updated date; changed content receives today's UTC date. File touches, AST source positions, and changes to verification dates do not change the content digest. The history is written after a successful build. Commit it with the source so clean CI builds use the same history. Without that file, the next build seeds a new history from declared dates.

The manifest records `contentDigest` for this comparison and `digest` for the complete generated Markdown. A Markdown date or metadata edit changes the latter; it does not necessarily change the technical content fingerprint.

### Record verification separately

Set native frontmatter `verified` only when someone checks the page's technical claims:

```yaml title="Page frontmatter"
verified: 2026-10-01
```

The HTML page, Markdown twin, and manifest expose this date independently of Updated. A build never assigns it. This project also declares private `editorial.lastVerified` and `editorial.verificationNote` fields for internal review notes; use native `verified` when the date should be public. A rebuild or unchanged-content file touch establishes neither a content change nor verification.

Search indexing still depends on the public host and crawler access; metadata alone does not guarantee it. If Slack does not unfurl after a corrected deployment, confirm the page and image are public, then try sharing the link in a new conversation. [Slack may omit a preview](https://slack.com/help/articles/204399343-Share-links-and-set-preview-preferences) when the same link was recently posted in that conversation.

## What agents receive

The social tags are in HTML, and each generated share card is a public PNG. Agents reading Markdown get the authored title, body, and fields published by your [Markdown metadata settings](https://www.shoalrun.com/author/markdown-metadata.md). The Markdown body does not contain HTML meta tags. `documents.json` and `search-index.json` list the published page and its routes. Changing `seo.title` or the share image does not replace a clear page title or summary for agents that use the Markdown and search index. The [agent-friendly documentation guide](https://www.shoalrun.com/publish/agent-friendliness.md) explains how these public files differ from the documentation bundle shipped inside Shoalrun's CLI.

## Related reading

No matching documents.
