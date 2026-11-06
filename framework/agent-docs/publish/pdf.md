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

Offer **Print PDF** on a static site using the visitor's browser. Site builds generate no page PDFs or extra print documents. When you want a downloadable full manual, export it explicitly through the CLI with your own fonts, colors, paper size, and print layout. A Node host can also offer direct page PDF downloads on request.

## Prerequisites

Start with a Shoalrun project and an enabled publication. Browser page printing needs no build-time browser or PDF service. For CLI PDF export, install Chrome or Chromium on the machine that generates the file. Shoalrun doesn't download a browser during installation. Set `SHOALRUN_PDF_BROWSER` to the browser executable, or configure `outputs.pdf.executablePath`.

For example, on macOS with Chrome installed in Applications:

```sh
export SHOALRUN_PDF_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

CLI exports need the configured browser. Endpoint generation needs it on the Node server. The Vercel build adapter supports browser page printing and rejects endpoint mode before building.

## Export a page or publication

Run the page command with the page's stable document ID:

```sh
npx --no-install shoalrun export docs.config.yaml --format pdf --document guide.start --out pdf/page
```

Omit `--document` to export a complete publication:

```sh
npx --no-install shoalrun export docs.config.yaml --format pdf --out pdf/manual
```

If several publications are enabled, select one explicitly. These product and version values are examples:

```sh
npx --no-install shoalrun export docs.config.yaml --format pdf --product core --channel production --version v2 --language en --out pdf/core-v2
```

Pass `--profile customer.yaml` when exporting a [customer edition](https://www.shoalrun.com/publish/deployment-profiles.md). PDF selection uses the target's `contentFilter`, or the site's `site.contentFilter` when the target doesn't specify one. Product, version, language, page access policy, and feature requirements apply before rendering. A missing or excluded explicitly requested page fails.

Publication chapters follow navigation order. Eligible pages outside navigation are appended in stable document-ID order and reported in diagnostics. A named export target can supply an explicit document order:

```yaml
exports:
  manual:
    formats: [pdf]
    documents: [guide.start, guide.configure]
    pdf:
      cover: true
      toc: true
```

Run that target with `--target manual`. PDF targets contain whole pages and use a separate PDF manifest. Export HTML and Markdown in another invocation when your application needs those representations too.

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

## Publish an optional manual download

Generate a complete selected publication with the CLI only when you want a downloadable manual. Keep its export directory outside the site build destination. After generating `pdf/manual/publication.pdf`, build the site and copy the PDF into the deployment output:

```sh
npx --no-install shoalrun build docs.config.yaml site-dist
mkdir -p site-dist/downloads
cp pdf/manual/publication.pdf site-dist/downloads/manual.pdf
```

Add an ordinary content, header, or footer link to `/downloads/manual.pdf`, and run your site's link checks after copying. This example assumes root hosting; place the file and link under the configured base path when using one. Deploy it with the site. A later site build replaces its output, so repeat the explicit copy as part of your deployment workflow.

Shoalrun doesn't automatically publish CLI export directories or create a full-manual download button. One optional manual file can serve the publication without prebuilding a PDF for every page. Use the same publication and customer profile for the site and manual.

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

## Check the result

Open `page.pdf` or `publication.pdf` in the export directory. Check the cover, fonts, long tables and code, page breaks, internal links, and bookmarks. Confirm that excluded edition content is absent. The adjacent manifest records publication identity, page order, input digests, and renderer details; it isn't a Content REST representation manifest. A failed export preserves an earlier PDF export directory.

For browser printing, open a page, activate **Print PDF**, and inspect the branded view and native print preview. Confirm that the selected page and release appear and that no page PDFs were generated in the site build. Check that the original page's tabs, details, and reader view remain unchanged.

For an endpoint action, follow **Download PDF** and confirm the selected page downloads. An endpoint link makes a normal same-origin navigation and download request; the server returns a readable error if generation fails.

## HTML, Markdown, and agents

HTML offers the optional browser print button or endpoint download link. Markdown retains the page's documentation and these instructions, without an interactive print control. The browser copies semantic article content into its print view. It shows tab panels and reader sections with their context and expands details without changing the source page. Browser-only controls and active elements aren't copied. CLI and endpoint PDF rendering expand those components into labeled static content. Reader views don't exclude their sections; use build filters and feature requirements for exclusion. Math retains its rendered expression, and code retains its text.

Agents can run the same export command with explicit publication coordinates and profile, then read the PDF artifact manifest to identify the selection. PDFs are separate delivery artifacts: enabling them doesn't add a new Content REST representation or a public link to every publication export.
