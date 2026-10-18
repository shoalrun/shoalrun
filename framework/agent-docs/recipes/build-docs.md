---
id: recipe.build-docs
title: Build this documentation site
summary: Use the pinned Shoalrun package and confirm a chosen page has HTML and
  Markdown output.
type: recipe
canonical: /recipes/build-docs
---

# Build this documentation site

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Build this documentation site

**Updated: 2026-10-18.**

Use the pinned Shoalrun package and confirm a chosen page has HTML and Markdown output.

## Before you start

- `DOC_ID`: Set `export DOC_ID=guide.recipes-overview`, or use the stable ID of the page you changed.
- `repositoryCheckout`: This documentation repository with its pinned package and lockfile.
- Run commands from the documentation repository root.
- Use Node.js 22.12 or newer.
- Use Node.js 22.12 or newer and install site dependencies with `npm ci` if needed.

## Install the site dependencies

- Use `repositoryCheckout` from **Before you start**: This documentation repository and its package lockfile.

Install the versions pinned by this site’s lockfile:

```sh
npm ci
npx --no-install shoalrun config validate docs/docs.config.yaml
```

This site pins a private registry package in its manifest and lockfile. Your account needs package read access, and the install environment must provide `NODE_AUTH_TOKEN` for the committed `.npmrc`. It needs no framework checkout. Update and validate the dependency and lockfile together when upgrading.

Save `frameworkCli`: The installed shoalrun executable in node_modules/.bin.

**Continue when:** The dependency installation succeeds and the installed CLI validates the site configuration.

## Build the Shoalrun docs site

- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.

Use the installed CLI to build Shoalrun's documentation:

```sh
npx --no-install shoalrun build docs/docs.config.yaml docs/dist
```

The source configuration is `docs/docs.config.yaml`; output goes to `docs/dist`. The root shortcut is `npm run docs:build`; it uses the installed package.

If the build fails, fix the named source or configuration issue and rerun it. A previous successful output can remain on disk after a failure, so file existence alone is not evidence of a successful new build.

Save `builtSite`: The successful site build at docs/dist, including documents.json and each published page.

**Continue when:** The build reports status: ok and the expected number of documents.

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

## Check the outcome

The build succeeded and the selected document has nonempty HTML and Markdown files. Use the preview recipe to inspect the rendered experience.

## Related reading

### Related topics

- [Site workflows](https://www.shoalrun.com/cookbooks/site-workflows.md) — Choose a related Shoalrun workflow.
