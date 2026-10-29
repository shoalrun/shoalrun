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

## Set the public address

Put the address readers actually use in `site.origin`. This is where crawlers will fetch the page and its image:

```yaml title="docs.config.yaml"
site:
  title: Acme API docs
  origin: https://docs.acme.com
```

Check the domain in the built `og:image` URL. A page may display in a browser while its social preview cannot load an image from that domain. Preview deployments behind sign-in cannot be unfurled by a public crawler. [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) explains the production and preview origins for this site's build.
