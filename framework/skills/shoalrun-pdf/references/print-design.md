# Print design and configuration

Use the installed configuration reference as the contract. These examples show PDF settings; retain the rest of the project's configuration.

## Shared settings and target overrides

```yaml
outputs:
  pdf:
    stylesheet: ./styles/print.css
    size: A4
    margins: { top: 18mm, right: 18mm, bottom: 20mm, left: 18mm }
    footer: "{title} | {page} / {pages}"
    cover: true
    toc: true
    bookmarks: true
exports:
  manual:
    formats: [pdf]
    pdf:
      subtitle: Configuration and operations
      size: Letter
```

Export the target with `shoalrun export docs.config.yaml --target manual --out pdf/manual`. Use explicit product/channel/version/language coordinates or a target publication when multiple publications are enabled. Add `--profile FILE` for the intended customer edition. Keep internal/customer exports out of public output unless that delivery is intended and authorized.

Paper sizes are A4, Letter, Legal, A3, and A5. Margins accept nonnegative mm, cm, in, or px dimensions. `timeout` accepts 1,000–120,000 milliseconds. Browser selection uses `SHOALRUN_PDF_BROWSER`, `PUPPETEER_EXECUTABLE_PATH`, or `executablePath`; configured paths take precedence. Normal installation doesn't download a browser.

## Typography and assets

Register existing local licensed font files under `outputs.pdf.fonts` with `family`, `source`, and optional `weight`/`style`. Sources support woff, woff2, ttf, and otf. Declare static weights as strings such as `"400"` and `"700"`; don't pretend a regular face is bold. Add `logo` for a local cover image and `subtitle` for cover text.

Set the stylesheet's `--pdf-font` and `--pdf-code-font` to the registered families and keep fallbacks. Headings can use a separate registered family. Test missing glyphs, mathematical symbols, and emphasis as well as ordinary prose. Local paths resolve from the declaring configuration, including included files and target overrides.

CSS imports, CSS URLs, and remote images aren't fetched by the renderer. Add fonts through their explicit settings and content images through staged assets. Don't copy reference-site scripts, remote font loaders, or analytics into a print theme.

## Layout surfaces

The print assembly exposes `.pdf-cover`, `.pdf-logo`, `.pdf-subtitle`, `.pdf-publication`, `.pdf-toc`, and `.pdf-chapter`. Headings, paragraphs, tables, blockquotes, and pre/code use ordinary HTML elements. Body colors and typography use `--pdf-accent`, `--pdf-text`, `--pdf-muted`, `--pdf-font`, and `--pdf-code-font`.

Keep covers within the printable height after margins; don't assume a browser viewport matches the physical page. Plan enough room for title wrapping, subtitle, logo, and publication identity. Contents links don't have automatically printed page numbers. Default chapter boundaries start new pages; component interactions become labeled static content.

The separate `header` and `footer` fields accept escaped text with `{title}`, `{page}`, and `{pages}`. They have fixed small-text typography and don't inherit body CSS. For more elaborate page furniture, use supported print CSS and verify it with the selected browser. Avoid duplicate numbering when combining CSS page-margin content and template footers.

Chromium supports CSS margin boxes with page counters; see the [official print-margin reference](https://developer.chrome.com/blog/print-margins). Check the selected browser's support before relying on them. If CSS owns paper dimensions or margins, keep its `@page` settings consistent with the configured PDF geometry.

## Optional single-page action

```yaml
outputs:
  html:
    pdf:
      mode: print
      label: Print / Save as PDF
      placement: after
      include: [guide.start, guide.configure]
```

The action is off by default. An enabled mapping defaults to `mode: print`. Omit `include` for all eligible pages; `exclude` removes listed document IDs. `pdf: false` in page frontmatter suppresses the control. The browser action opens a native print dialog; readers can choose Save as PDF. It needs JavaScript for the button, while the browser's own Print command remains available without JavaScript.

Browser printing copies semantic content from the current article into a separate passive print view. It uses `outputs.pdf` settings and the same `.pdf-cover`/`.pdf-chapter` theme surfaces as the manual. Optional `outputs.html.pdf.style` supplies a named target's PDF settings without changing page selection. The original page remains unchanged. Reader sections and tab panels remain printable, details become complete static sections, and active elements/controls aren't copied. Browser settings can affect pagination, backgrounds, headers, and footers.

For a static site, enable `mode: print` and run the ordinary site build with the intended profile. This adds shared print scripts, theme CSS, settings, and configured fonts/logo, not a PDF or print document for every page. The build doesn't need Chromium for this action. Deploy the normal HTML/assets; the visitor's browser prepares the print view, waits for fonts/images, and opens the native dialog. Allow that view to open if pop-up blocking prevents it. Don't create per-page PDF caches for static hosting. The ordinary browser Print command remains a fallback, using website print CSS.

A whole-publication CLI export is a separate artifact. If the user wants it on a static site, add its PDF to the deployment output after the site build and supply a deliberate download link at the correct base path. The compiler doesn't automatically create a whole-manual button or publish CLI export directories. Keep the export outside the site build destination until copying, because a site build replaces its output. Preserve the exact selected publication/profile in that deployment step.

Endpoint mode prepares private page inputs and generates a direct PDF download on request through a Node host with Chromium. Configure its same-origin `endpoint` path as needed. Optional `style` names an existing export target's `pdf` mapping without applying that target's documents, publication, or filter. The Vercel adapter supports browser printing and rejects endpoint mode.

Keep `pdf-runtime.json` and `__shoalrun/pdf-data` out of public static serving. Use the built-in Node server or a correctly mounted `@shoalrun/cli/pdf/server` handler behind the site's authentication boundary. Don't accept visitor-provided URLs, profiles, or CSS. Build-time audience selection isn't reader authentication. Endpoint downloads use no-store responses and per-instance work limits; they aren't a shared PDF cache.

## Verification evidence

Record the exact selection, source/style inputs, output file, and browser/renderer. Check the PDF manifest for identity and order. Confirm contents and cross-page links resolve within the PDF when their targets are included. Check font embedding and requested outline destinations with a PDF inspection tool rather than matching visible text alone.

Render every page for a small publication. For a large manual, inspect a contact sheet of all pages and full-size views of the cover, chapter boundaries, dense layouts, and any suspected defects. Text extraction can identify omissions, but it can't verify clipping, contrast, or page geometry. Keep native-print demonstrations distinct from automated export verification.
