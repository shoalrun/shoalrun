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

**Updated: 2026-10-29.**

Parent page: [Full Markdown page](/publish/seo.md)

When someone shares a docs link, Slack and other services fetch the page's HTML and look for a title, description, and image. Shoalrun writes these tags at build time from page metadata and can generate a share image for every page. Start with a clear page `title` and a one-sentence `summary`; you do not need to hand-write Open Graph or Twitter tags.

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
