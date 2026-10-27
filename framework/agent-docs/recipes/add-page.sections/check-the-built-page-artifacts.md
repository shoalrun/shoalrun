---
id: recipe.add-page
title: Add a page to this documentation site
summary: Create a guide, add navigation, build and audit it, then refresh its
  agent documentation.
type: recipe
area: authoring
subarea: authoring-pages
canonical: /recipes/add-page
---

# Add a page to this documentation site

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Add a page to this documentation site

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Check the built page artifacts

- Use `DOC_ID` from **Before you start**: The stable ID of the page being checked.
- Use `builtSite` from **Build the Shoalrun docs site**: The site produced by the successful build.

Choose a document by its stable ID. The default below checks the recipes overview; replace it with the ID of the page you changed.

```sh
export DOC_ID="${DOC_ID:-guide.recipes-overview}"
node --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = 'docs/dist';
const manifest = JSON.parse(await readFile(path.join(root, 'documents.json'), 'utf8'));
const doc = manifest.documents.find(item => item.id === process.env.DOC_ID);
if (!doc) throw new Error(`No published document with ID ${process.env.DOC_ID}`);
for (const route of [`${doc.url.replace(/\/$/, '')}/index.html`, doc.markdownUrl]) {
  const file = path.join(root, route.replace(/^\//, ''));
  if (!(await readFile(file, 'utf8')).trim()) throw new Error(`Empty output: ${file}`);
  console.log(file);
}
JS
```

If the ID is missing, check the page's access policy and publication fields, then rebuild. Inspect the printed Markdown file for the expected instructions. Use a local HTTP preview for the HTML page so its assets and navigation resolve correctly.

Save `checkedArtifacts`: The HTML and Markdown paths reported for the selected document.

**Continue when:** The check prints two nonempty files for the chosen document ID.
