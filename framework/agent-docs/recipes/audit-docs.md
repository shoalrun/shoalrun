---
id: recipe.audit-docs
title: Build and audit this documentation site
summary: Build current documentation, check its artifacts, and run the
  configured audits.
type: recipe
area: quality
subarea: quality-audits
canonical: /recipes/audit-docs
---

# Build and audit this documentation site

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Build and audit this documentation site

**Updated: 2026-10-26.**

Build current documentation, check its artifacts, and run the configured audits.

## Before you start

- `DOC_ID`: Set `export DOC_ID=guide.recipes-overview`, or use the stable ID of the page you changed.
- `repositoryCheckout`: This documentation repository with its pinned package and lockfile.
- Run commands from the documentation repository root.
- Use Node.js 22.12 or newer.
- Use Node.js 22.12 or newer and install site dependencies with `npm ci` if needed.
- Install Vale 3.20 or newer for this repository's configured formatting check.

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

## Audit the Shoalrun docs project

- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.

Run Shoalrun's configured checks. This repository's formatting check requires [Vale](https://vale.sh/) 3.20 or newer:

```sh
npx --no-install shoalrun audit docs/docs.config.yaml
```

The audit checks configured project commands, API representations, and focused contracts. Read any reported finding and fix its source before continuing. This command does not run the complete framework test suite or replace a browser review. Framework source changes and tests belong in the framework repository.

Save `auditPassed`: A successful audit report with no failed configured checks.

**Continue when:** The audit exits successfully and reports status: ok with no failed checks.

## Check the outcome

The current source builds, the selected page has both output formats, and all configured audits pass. Review the rendered change before publishing; this recipe does not deploy or run the full framework test suite.

## Related reading

### Related topics

- [Site workflows](https://www.shoalrun.com/cookbooks/site-workflows.md) — Choose a related Shoalrun workflow.
