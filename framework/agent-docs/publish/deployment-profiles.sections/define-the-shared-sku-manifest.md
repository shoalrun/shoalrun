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

**Updated: 2026-11-03.**

Parent page: [Full Markdown page](/publish/deployment-profiles.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Understand how separate sites share authored content and configuration.

**Next steps**

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Review the selected edition using captured HTML and Markdown. (Status: experimental.)

Build a documentation edition for each customer from one shared content project. Keep product definitions in the shared repository and supply each customer's purchases, additional features, and branding through that deployment's own profile file. Customer profiles do not need to share a repository.

By default, you do not need to mark every page. Pages without feature requirements are shared across customer editions. For customer deployments that need a deliberate decision on each page, enable explicit classification. In either mode, add requirements to pages or sections that depend on specific features.

Available since `0.1.0-alpha.15`.

## Define the shared SKU manifest

Create `sku-manifest.yaml` beside `docs.config.yaml`:

```yaml title="sku-manifest.yaml"
schemaVersion: 1
features:
  analytics: { description: Analytics reports }
  connectors: { description: External data connectors }
  reports.classic: { lifecycle: deprecated }
skus:
  professional:
    revisions:
      "2025-04":
        features: [analytics, reports.classic]
      "2026-10":
        features: [analytics, connectors]
```

Retain historical revisions unchanged when packaging changes. An existing customer can continue using the original revision, or receive an explicit feature grant. Marking a feature `deprecated` or `retired` does not remove its documentation grant.

Enable profile selection in the shared configuration:

```yaml title="docs.config.yaml (fragment)"
profiles:
  manifest: ./sku-manifest.yaml
  required: true
  pruneNavigation: true
```

`required` defaults to `true`. A missing profile fails the build. `pruneNavigation` defaults to `false`; enabling it removes known excluded destinations and empty groups. Misspelled navigation targets remain errors.
