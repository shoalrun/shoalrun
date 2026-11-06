# Styled PDF export

This project demonstrates browser page printing and optional CLI PDF exports. All configuration values and thresholds are examples.

Build and preview the static site without a browser dependency:

```sh
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist --port 8892
```

Open `/start` and choose **Print / Save as PDF**. The browser fills a separate print view using the shared PDF theme and opens its print dialog. Site builds add shared scripts, styling, settings, and configured print assets; they generate no page PDFs or extra print documents. This works on static hosting, including Vercel. Allow the print view to open if the browser blocks it. Without JavaScript, use the browser's own Print command.

For a downloadable full manual, explicitly run the CLI export with an installed browser:

```sh
export SHOALRUN_PDF_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shoalrun export docs.config.yaml --format pdf --out pdf/manual
```

Use the correct Chrome/Chromium executable path for your operating system. No browser is downloaded automatically. The command writes `pdf/manual/publication.pdf`. Publish that file and a deliberate download link only when wanted; it isn't added to the site automatically. Copy it into the static deployment after the site build, which replaces its output directory. Add `--document guide.start` to generate a single-page PDF explicitly.

Change `print.css` for manual and browser print-view colors, typography, and page breaks. Set `outputs.pdf.fonts` to local licensed font files and reference their registered families in CSS. Use `outputs.pdf.logo` for a local cover image. Print CSS can't import files or load URLs; fonts and logo are registered explicitly. Optional `outputs.html.pdf.style` selects a named export target's PDF styling without changing page selection. Headers and footers accept `{title}`, `{page}`, and `{pages}`; browser views use CSS page-margin support. Use `site.customCss` with `@media print` for the ordinary browser Print fallback, which doesn't open a branded view.

Inspect the actual PDF for spacing, math, long content, links, and bookmarks. The manual's table of contents is linked without printed page numbers. Chromium bookmark/tagging support is experimental; the output isn't certified PDF/UA. The `pdf` export manifest is separate from content REST representations.

Explicit `outputs.html.pdf.mode: endpoint` supports direct page PDF downloads through a Node host with Chromium. It isn't for static hosting. Keep `pdf-runtime.json` and `__shoalrun/pdf-data` behind that server; don't expose them through a generic static host.
