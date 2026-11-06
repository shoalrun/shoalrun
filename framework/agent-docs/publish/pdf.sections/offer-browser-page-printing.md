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

**Updated: 2026-11-06.**

**Available since: 0.1.0-beta.1.**

Parent page: [Full Markdown page](/publish/pdf.md)

Offer **Print PDF** on a static site using the visitor's browser. Site builds generate no page PDFs or extra print documents. When you want a downloadable full manual, export it explicitly through the CLI with your own fonts, colors, paper size, and print layout. A Node host can also offer direct page PDF downloads on request.

## Offer browser page printing

The action is off by default. For a static host, enable browser printing:

```yaml
outputs:
  html:
    pdf:
      mode: print
      label: Print PDF
      placement: after
      include: [guide.start, guide.configure]
```

An enabled mapping defaults to `mode: print`. Omit `include` to enable the action on all eligible pages, or set `exclude` to a list of document IDs. `placement` is `before` or `after` the existing Markdown actions. Set `pdf: false` in a page's frontmatter to suppress the control. Set `outputs.html.pdf: false` to disable it for the site.

This adds shared print scripts, a theme stylesheet, a small settings file, and any configured local fonts or logo. The same assets serve every page. It doesn't generate PDFs or additional print documents for individual pages, and the build doesn't need Chromium. The browser copies the current article into a separate branded print view and opens the print dialog. Readers choose Save as PDF. Allow that view to open if the browser blocks it as a pop-up.

The print view uses `outputs.pdf` styling, including its local stylesheet, fonts, paper settings, and optional cover. Set `outputs.html.pdf.style` to a named export target to reuse only that target's PDF styling. Its document list, publication, and content filter don't change the current page selection. For example, a `page-print` target can set `cover: false` while the manual uses a cover. Browser print views default to no cover or contents unless configured.

Website navigation, controls, and executable content aren't copied into the print view. The original page stays unchanged. The view waits for its fonts and images before opening the dialog, and retains **Print PDF** and **Close** controls afterward. Browser settings can affect backgrounds, pagination, and page furniture. Configured header/footer placeholders use browser CSS page-margin support, which varies by browser.

The browser's own Print command remains available without JavaScript and uses the ordinary site's print CSS. That fallback can be customized with `site.customCss` and `@media print`; it doesn't open the branded view.
