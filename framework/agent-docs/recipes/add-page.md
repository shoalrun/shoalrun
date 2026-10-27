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

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Before you start

- `DOC_ID`: Set `export DOC_ID=guide.my-new-guide` for the new guide; use the same ID in navigation and every check.
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

The manifest and lockfile pin the CLI version and registry artifact. Public npm releases need no package token or framework checkout. If your checkout still pins an older GitHub Packages release, follow [Getting started](https://www.shoalrun.com/start.md) to migrate registries. That older dependency still needs its original registry access until upgraded. Update and validate the dependency and lockfile together.

Save `frameworkCli`: The installed shoalrun executable in node_modules/.bin.

**Continue when:** The dependency installation succeeds and the installed CLI validates the site configuration.

## Scaffold a new guide

- Use `DOC_ID` from **Before you start**: The stable document ID chosen for the new guide.
- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.

Choose a file name, title, and stable document ID for your real topic. The commands use `my-new-guide` as the example; replace those values together.

```sh
npx --no-install shoalrun scaffold how-to -n docs/content/my-new-guide.mdx \
  --config docs/docs.config.yaml --id "$DOC_ID" --title 'My new guide'
```

The command refuses to overwrite an existing file. If this guide already exists, edit it directly instead of scaffolding it again. Keep its access policy set to `draft` while writing.

Save `draftPage`: The new draft at docs/content/my-new-guide.mdx with ID guide.my-new-guide.

**Continue when:** The CLI creates the requested file with draft access and the intended document ID.

## Complete the guide and add navigation

- Use `draftPage` from **Scaffold a new guide**: The draft file and stable ID returned by the scaffold step.

Open the scaffolded file and write the actual task, prerequisites, steps, and an observable success check. Set `updated` to today's date, replace the draft summary, and resolve every generated TODO prompt. Check every technical claim against the implementation or a tested workflow.

Set a suitable `card.icon`, such as `file-text`, to meet this site's page-card audit. Once the content is ready for review in the built site, change `access.policy` to `public` and add the stable document ID under the appropriate group in `docs/config/nav.yaml`:

```yaml
- { id: my-new-guide, doc: guide.my-new-guide }
```

For useful next steps, add edges to `docs/config/relationships.yaml` and put `<RelatedReading />` at the end of the page. Preserve the page ID if you later change its title or slug. Setting public access includes the page in the local build; it does not deploy the site.

Save `authoredPage`: The completed public page and its navigation entry, ready for a local build.

**Continue when:** The summary and scaffold prompts are replaced, the guide has a card icon, and navigation references its stable ID.

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

## Regenerate the agent documentation bundle

- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.

Export the already built site for the framework’s next documentation snapshot:

```sh
npm run agent-docs:build
```

Build the site first. The export copies that output without rebuilding and records the site build identity and pinned package integrity in `agent-docs/provenance.json`. It does not modify the installed package.

Review and transfer the export as a versioned artifact to the framework repository. Framework releases consume an explicitly selected snapshot; they must not fetch the latest site during a package build.

Save `agentBundle`: The exported Markdown, manifest, search index, and provenance under agent-docs.

**Continue when:** The command reports matching counts of bundled Markdown pages and search records.

## Check agent search and page lookup

- Use `DOC_ID` from **Before you start**: The stable ID of the page being checked.
- Use `agentBundle` from **Regenerate the agent documentation bundle**: The refreshed offline documentation bundle.

Search and read the exported site snapshot explicitly:

```sh
npx --no-install shoalrun docs search "recipes and cookbooks" --site agent-docs
npx --no-install shoalrun docs read "$DOC_ID" --site agent-docs
```

Confirm the returned Markdown includes your change and links. Review `agent-docs/provenance.json` and the export inventory before handing the artifact to the framework release process. Plain `shoalrun docs read` uses the installed package’s snapshot, which is independent of this working tree.

Save `agentLookupConfirmed`: Search results and page Markdown from the refreshed bundle, plus a reviewed generated diff.

**Continue when:** Search includes the intended topic, docs read shows the current instructions, and generated changes are understood.

## Check the outcome

The new page appears in the local site and navigation. Its HTML and Markdown files exist, audits pass, and docs read returns the refreshed bundle entry. Use the new guide ID for the artifact and agent checks. Preview the rendered page before committing or publishing.

## Related reading

### Related topics

- [Authoring workflows](https://www.shoalrun.com/cookbooks/authoring.md) — Choose a related Shoalrun workflow.
