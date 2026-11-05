---
id: guide.deployment-profiles
title: Build customer documentation editions
summary: Select purchased and grandfathered features with a deployment-owned
  profile and apply customer branding.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /publish/deployment-profiles
---

# Build customer documentation editions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Customer editions

**Updated: 2026-11-05.**

**Available since: 0.1.0-alpha.15.**

Parent page: [Full Markdown page](/publish/deployment-profiles.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Understand how separate sites share authored content and configuration.

**Next steps**

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Review the selected edition using captured HTML and Markdown. (Status: experimental.)

Build a documentation edition for individual customers from one shared content project. Keep product definitions in the shared repository and supply each customer's purchases, additional features, and branding through that deployment's own profile file. Customer profiles don't need to share a repository with the content.

By default, you don't need to mark every page. Pages without feature requirements are shared across customer editions. For customer deployments that need a deliberate decision on each page, enable explicit classification. In either mode, add requirements to pages or sections that depend on specific features.

## Preview and edit a customer edition

Since 0.1.0-alpha.18

From the configured project directory, start a preview using the deployment's profile:

```sh
npx --no-install shoalrun dev docs.config.yaml dist/customer \
  --profile /run/config/docs-profile.yaml --port 8770
```

The development server compiles the selected edition and watches source files, the chosen profile, SKU manifest, and declared assets. A profile mounted outside the project is watched too. Changing its product releases or feature grants rebuilds the edition through the same selection rules as a static build. Use a separate output directory and port for another customer preview.

The preview banner identifies the selected profile, edition digest, and successful build. An invalid initial profile prevents startup. If an edit fails after startup, the server keeps the last successful output and shows a build-error banner. It doesn't switch to a shared edition. Fix the profile, manifest, or declared asset and save it to trigger recovery. A page removed by a successful edition change returns the browser to a published landing page.

On older releases, build with `--profile` and serve that selected output separately. Reader-view controls aren't a substitute: they change browser visibility, while the profile determines which files and instructions exist in the edition.
