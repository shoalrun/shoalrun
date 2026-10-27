---
id: guide.share-images
title: Share images and favicon
summary: Generated social images, metadata precedence, SVG placeholders, fonts,
  and favicon settings.
type: reference
area: appearance
subarea: appearance-branding
canonical: /styling/share-images
---

# Share images and favicon

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Share images and favicon

**Updated: 2026-10-26.**

When someone pastes a page link into Slack, LinkedIn, or X, the preview shows an image. Shoalrun draws one for every page at build time and adds the tags those apps read. It also generates a favicon. Both follow the site's preset and palette, so they need no setup.

For the author workflow around page titles, summaries, public URLs, and social metadata, start with [SEO and social previews](https://www.shoalrun.com/publish/seo.md).

## What the build writes

- A 1200×630 PNG per page at `/assets/share/<page path>.png`, such as `/assets/share/styling/themes.png`. It shows the page type, title, and summary, the site title, and the page URL.
- `og:title`, `og:description`, and `og:image` tags, plus explicit `twitter:title`, `twitter:description`, `twitter:image`, and `twitter:card` tags. The description uses the same page text as the image.
- `/favicon.svg`, drawn from the preset's brand mark in the accent color, and a 180×180 `/apple-touch-icon.png`.

Set `site.origin` to the public site address so image and page URLs in the tags are absolute and publicly reachable. A browser can load a page even when a link-preview crawler cannot fetch an image hosted at a different or private address. Run the [deployment checker](https://www.shoalrun.com/publish/deployment-check.md) against the public origin to catch a mismatched `og:image` or a missing image.

```yaml title="docs.config.yaml"
site:
  title: Acme API docs
  origin: https://docs.acme.com
```

The preview description comes from the page's `displayText.socialCard`, `seo.description`, configured HTML description, or `summary`, in that order. The same text appears in `og:description` and on the generated image. Long titles wrap to three lines and long summaries to two, ending in an ellipsis.

For a short page title such as **Getting started**, the social title adds the site name when the result fits within 70 characters. The page heading and browser title stay as authored. Set `seo.title` on a page when you want to choose its exact social title instead.

The build caches rendered images in `.shoalrun/cache/share-images/` beside the config file and redraws only pages whose card changed. Add `.shoalrun/` to `.gitignore`.

## Use your own image for a page

Set `image` in frontmatter to a local `.png` or `.jpg`, relative to the page file. It replaces the generated card for that page. 1200×630 works best.

```yaml title="Frontmatter"
image: ./images/launch.png
```

## Replace the design

Point `outputs.html.shareImages.template` at a 1200×630 SVG file. The build fills these placeholders on each page:

| Placeholder                                 | Value                                                       |
| ------------------------------------------- | ----------------------------------------------------------- |
| `{{title}}`, `{{summary}}`                  | The full title and summary.                                 |
| `{{title.1}}`, `{{title.2}}`, `{{title.3}}` | The title split into lines of about 30 characters.          |
| `{{summary.1}}`, `{{summary.2}}`            | The summary split into lines of about 60 characters.        |
| `{{site}}`                                  | `site.title`.                                               |
| `{{type}}`                                  | The page type as words, such as `API reference`.            |
| `{{url}}`                                   | The page URL without `https://`, when `site.origin` is set. |

```yaml title="docs.config.yaml"
outputs:
  html:
    shareImages:
      template: ./share/card.svg
      fonts: [./share/AcmeSans-Bold.ttf]
```

```xml title="share/card.svg"
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0b3d2e"/>
  <text x="80" y="220" font-family="Acme Sans" font-weight="700" font-size="64" fill="#ffffff">{{title.1}}</text>
  <text x="80" y="296" font-family="Acme Sans" font-weight="700" font-size="64" fill="#ffffff">{{title.2}}</text>
  <text x="80" y="560" font-family="Inter" font-size="26" fill="#cfe8dd">{{site}}</text>
</svg>
```

- An unknown placeholder fails the build, so a typo can't publish raw braces.
- The renderer doesn't load system fonts. It can use Inter, Figtree, Source Serif 4, JetBrains Mono, and Jost, plus any `.ttf` or `.otf` files listed in `fonts` or in [`theme.fonts`](https://www.shoalrun.com/styling/themes.md).
- The renderer reads TrueType and OpenType files only. WOFF2 files from `theme.fonts` still work on the site, but not in share images.

To turn generated images off, set `shareImages: false`. Pages with their own `image` keep it.

## Replace the favicon

Set `site.favicon` to a local `.svg` or `.png`. An SVG favicon also becomes the touch icon, placed on the palette's inked surface. A PNG favicon is used as is, with no separate touch icon.

```yaml title="docs.config.yaml"
site:
  favicon: ./brand/mark.svg
```

A missing file or another format fails the build.

## Related reading

### Read first

- [Themes](https://www.shoalrun.com/styling/themes.md) — Set the theme that generated share images and the favicon take their look from.
