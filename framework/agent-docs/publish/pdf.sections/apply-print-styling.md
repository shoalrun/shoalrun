---
id: guide.pdf-export
title: Export styled PDFs
summary: Export a page or publication as a PDF and offer an optional page download.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/pdf
---

# Export styled PDFs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Export styled PDFs

**Updated: 2026-11-07.**

**Available since: 0.1.0-beta.1.**

Parent page: [Full Markdown page](/publish/pdf.md)

Offer **Print PDF** on a static site using the visitor's browser. Site builds generate no page PDFs or extra print documents. When you want a downloadable full manual, export it explicitly through the CLI with your own fonts, colors, paper size, and print layout. A Node host can also offer direct page PDF downloads on request.

## Apply print styling

Set defaults under `outputs.pdf`; a target's `pdf` settings override them. Paths resolve from the configuration file that declares them.

```yaml
outputs:
  pdf:
    stylesheet: ./styles/print.css
    size: Letter
    margins: { top: 20mm, right: 18mm, bottom: 20mm, left: 18mm }
    footer: "{title} | {page} / {pages}"
    logo: ./assets/logo.svg
    subtitle: Operations manual
    fonts:
      - family: Documentation
        source: ./assets/documentation.woff2
        weight: "400"
```

Use a local font that you're allowed to embed. Reference the registered family in your stylesheet:

```css title="styles/print.css"
:root {
  --pdf-accent: #245849;
  --pdf-text: #172722;
  --pdf-muted: #53665e;
  --pdf-font: Documentation, Arial, sans-serif;
  --pdf-code-font: monospace;
}

h2 { break-after: avoid; }
.pdf-chapter + .pdf-chapter { break-before: page; }
```

The stylesheet can customize the cover, contents, chapters, tables, code, and page breaks. It can't load URLs or import other stylesheets; register fonts explicitly. CLI exports require staged local images; remote images fail instead of being fetched. Browser print views load the images referenced by the current page.

Paper sizes are `A4`, `Letter`, `Legal`, `A3`, and `A5`. Margins accept `mm`, `cm`, `in`, or `px`. Header and footer fields accept escaped text with `{title}`, `{page}`, and `{pages}` placeholders; they use a separate small-text layout and don't inherit body CSS. `timeout` bounds rendering to 1,000–120,000 milliseconds; its default is 30,000.

Publication exports enable the cover and linked table of contents by default; a single explicitly requested page omits them. Override `cover` and `toc` when needed. The contents links don't show printed page numbers. `bookmarks` defaults to true, using Chromium's experimental PDF outline support. Verify bookmarks in your browser's output; tagging doesn't establish PDF/UA compliance.
