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

## Build and inspect the edition

From the shared documentation project directory, build into a deployment-specific output:

```sh
npx --no-install shoalrun build docs.config.yaml dist/customer \
  --profile /run/config/docs-profile.yaml
```

To export application content, pass the same profile to `shoalrun export`:

```sh
npx --no-install shoalrun export docs.config.yaml --out dist/customer-content \
  --profile /run/config/docs-profile.yaml
```

If several publications are enabled, an export still needs its normal explicit publication selection. Grandfathered features and older instructions are independent: the feature grant selects functionality, while the [publication version](https://www.shoalrun.com/publish/publications.md) selects the release's instructions.

Use the profile when [validating documentation edits](https://www.shoalrun.com/author/workspace.md):

```sh
npx --no-install shoalrun docs baseline --config docs.config.yaml \
  --out .shoalrun/baseline.json --profile /run/config/docs-profile.yaml

# Edit your documentation, then validate the same edition.
npx --no-install shoalrun docs validate --config docs.config.yaml \
  --baseline .shoalrun/baseline.json --profile /run/config/docs-profile.yaml
```

Review and preview use the returned report. The snapshot captures the external profile and declared assets; later changes make the report stale. Treat reports and captured project directories as private build artifacts.
