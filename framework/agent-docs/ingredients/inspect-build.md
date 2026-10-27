---
id: ingredient.inspect-build
title: Check the built page artifacts
summary: Resolve a document ID through the manifest and check its HTML and
  Markdown files.
type: ingredient
area: quality
subarea: quality-audits
canonical: /ingredients/inspect-build
---

# Check the built page artifacts

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Reusable Shoalrun steps > Check the built page artifacts

**Updated: 2026-10-19.**

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
