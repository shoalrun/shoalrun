---
id: guide.content-export
title: Export content into your application
summary: Export selected documentation and assets for your application.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/content-export
---

# Export content into your application

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Export content into your application

**Updated: 2026-10-28.**

Parent page: [Full Markdown page](/publish/content-export.md)

Keep application help and your documentation website in one content source. `shoalrun export` produces a directory of resolved Markdown, passive HTML fragments, referenced assets, and a manifest. Your application owns the help drawer, onboarding screen, or other interface that displays the content. It does not need a Shoalrun browser runtime.

## Export selected pages

1. ## Define an export target

   Add a named target to `docs.config.yaml`. These IDs refer to pages in the project's configured content directory:

   ```yaml
   exports:
     app-help:
       formats: [markdown, html]
       documents: [guide.api-keys, guide.billing]
       publicBase: /help/
   ```

   Omit both `documents` and `resources` to export all eligible public pages in one enabled publication. If more than one publication is enabled, select all three coordinates:

   ```yaml
   exports:
     app-help:
       formats: [html]
       documents: [guide.api-keys, guide.billing]
       publication: { channel: production, version: current, language: en }
       publicBase: /help/
   ```

   Optional `contentFilter` uses configured reader facets. Every selected facet must match; choices within a facet are alternatives. Pages missing a selected facet are excluded. An explicitly requested ID that is absent, private, unavailable in the publication, or excluded by the export filter fails with a diagnostic.

   Export selection is independent of the website's `site.contentFilter` and navigation. Changing a website menu does not change the app's help collection. See [separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) for website selection.

2. ## Build the portable bundle

   From the documentation project, run:

   ```sh
   npx --no-install shoalrun export docs.config.yaml --target app-help --out ../app/public/help
   ```

   Replace the output path with the directory your application will distribute. The command prints JSON with its publication, formats, selected document IDs, asset count, digest, API review requirements, and diagnostics. A successful export replaces an earlier export in that directory. A failure preserves it. Source directories, unrelated nonempty directories, and previous website builds cannot be used as the export destination.

   The result has this structure:

   ```text
   help/
     manifest.json
     content/
       ...HTML and Markdown files
     assets/
       ...referenced local files
     NOTICES.txt
   ```

   File names derive from typed resource identity and publication, not titles or source-file names. Read paths from the manifest rather than constructing them in your app.

   For a one-off export without a named target:

   ```sh
   npx --no-install shoalrun export docs.config.yaml --out ../app/public/help \
     --format html --document guide.api-keys --document guide.billing \
     --public-base /help/
   ```

3. ## Mount and load the content in your app

   `/help/` is an example value, not a required path. Choose any root-relative path ending with a slash, such as `/resources/`. Set `publicBase` to that path, serve the generated bundle there, and update the manifest URL in your app's loader to match (for example, `/resources/manifest.json`). The `--out` filesystem directory can have a different name from the URL path.

   The examples below use `/help/`. This base locates content and assets; it does not define your application's routes.

   Your app can find a page by ID and load its HTML fragment:

   ```js
   const manifest = await fetch('/help/manifest.json').then(response => response.json());
   if (manifest.schemaVersion !== 1 || manifest.review?.status !== 'ok' ||
       !Array.isArray(manifest.resources)) {
     throw new Error('Unsupported or unreviewed help export');
   }
   const help = manifest.resources.find(resource =>
     resource.ref.kind === 'page' && resource.ref.documentId === 'guide.api-keys');
   if (!help?.representations.html) throw new Error('API-key HTML is unavailable');
   const html = await fetch(manifest.publicBase + help.representations.html.path)
     .then(response => response.text());
   helpContainer.innerHTML = html;
   ```

   Use this pattern for trusted output from your own documentation build. Handle missing documents and failed requests in your application's loading and error states. The manifest also provides Markdown paths if your app uses its own Markdown renderer.

   Images use the configured mount. This matters when HTML fetched from `/help/content/` is inserted into an app page such as `/settings/account`: relative image URLs would otherwise resolve against the app page.

4. ## Handle document links and check the result

   Links to other exported pages have `data-export-link` markers. Each marker identifies a record in that representation's `links` array. For `kind: resource`, your app can prevent ordinary navigation and retrieve the target using its typed `ref`. A page reference contains `kind: page` and `documentId`; section and snippet references have their own identity fields. `fragment` identifies the original heading or anchor; the HTML representation's `anchors` array maps it to its namespaced `exportedId`.

   A link to an omitted document uses its canonical website URL only when that document is public, enabled, and selected for the website. Without an eligible destination and a configured origin, the export fails. Linked pages are never silently added to the export. Explicit external links retain their destinations.
