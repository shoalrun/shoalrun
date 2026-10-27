---
id: recipe.refresh-agent-docs
title: Refresh Shoalrun's bundled agent docs
summary: Regenerate offline docs, verify CLI search and read, and run project audits.
type: recipe
area: discovery
subarea: discovery-agents
canonical: /recipes/refresh-agent-docs
---

# Refresh Shoalrun's bundled agent docs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Refresh Shoalrun's bundled agent docs

**Updated: 2026-10-27.**

Regenerate offline docs, verify CLI search and read, and run project audits.

## Before you start

- `DOC_ID`: Set `export DOC_ID=guide.recipes-overview`, or use the stable ID of the page you changed.
- `repositoryCheckout`: This documentation repository with its pinned package and lockfile.
- Run commands from the documentation repository root.
- Use Node.js 22.12 or newer.
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

## Regenerate the agent documentation bundle

- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.
- Use `builtSite` from **Build the Shoalrun docs site**: The successful current site build at docs/dist.

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

The bundle contains the current authored instructions, search and read find the intended page, and configured audits pass. Hand off the reviewed snapshot as a versioned artifact.

## Related reading

### Related topics

- [Authoring workflows](https://www.shoalrun.com/cookbooks/authoring.md) — Choose a related Shoalrun workflow.
