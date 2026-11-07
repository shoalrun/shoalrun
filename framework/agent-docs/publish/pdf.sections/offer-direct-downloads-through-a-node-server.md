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

## Offer direct downloads through a Node server

For generation when a reader clicks, use endpoint mode:

```yaml
outputs:
  html:
    pdf:
      mode: endpoint
      endpoint: /__shoalrun/pdf
      label: Download PDF
```

Build and run the output with `shoalrun serve`. The Node server automatically loads the prepared page inventory. The first request generates its PDF; subsequent requests generate it again. Requests are limited to one active generation and ten generation attempts per minute per server instance. Busy requests receive a retry response. There's no shared PDF cache.

The endpoint accepts only the page's opaque build-selected key. It can't select another profile, accept custom CSS, or print an arbitrary URL. It returns an attachment with `Cache-Control: no-store`. Mount the endpoint behind the same authentication as the site. Build-time audience selection isn't visitor authorization.

Endpoint page downloads use `outputs.pdf` styling and omit the publication cover and contents. Optional `outputs.html.pdf.style` selects a named export target's `pdf` settings, just as it does for browser print views. Only that styling applies; the target's document list, publication, and filter don't change the current page selection.

For a custom Node host, import `loadPdfRuntime` and `createPdfHttpHandler` from `@shoalrun/cli/pdf/server`. Mount the returned Web-standard handler at the runtime's endpoint; use its `authorize` callback or your existing authentication middleware. Keep `pdf-runtime.json` and `__shoalrun/pdf-data` out of public static serving. The built-in Node server protects those paths. Don't upload an endpoint-mode build to a generic static host.
