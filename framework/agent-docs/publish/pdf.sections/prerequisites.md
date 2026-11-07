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

## Prerequisites

Start with a Shoalrun project and an enabled publication. Browser page printing needs no build-time browser or PDF service. For CLI PDF export, install Chrome or Chromium on the machine that generates the file. Shoalrun doesn't download a browser during installation. Set `SHOALRUN_PDF_BROWSER` to the browser executable, or configure `outputs.pdf.executablePath`.

For example, on macOS with Chrome installed in Applications:

```sh
export SHOALRUN_PDF_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

CLI exports need the configured browser. Endpoint generation needs it on the Node server. The Vercel build adapter supports browser page printing and rejects endpoint mode before building.
