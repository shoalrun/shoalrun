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

## Supply the profile from the deployment

Mount or generate the customer profile outside the shared docs repository. For example, a deployment could provide `/run/config/docs-profile.yaml` and a `brand` directory beside it:

```yaml title="Deployment-owned docs-profile.yaml"
schemaVersion: 1
skus:
  - { id: professional, revision: "2026-10" }
features:
  - reports.classic
site:
  title: Example Partner documentation
  origin: https://docs.partner.example
  logo: ./brand/logo.svg
  favicon: ./brand/icon.png
theme:
  palette: kelp
publications:
  enabled:
    - { channel: production, version: current, language: en }
```

This profile grants Analytics and Connectors through the SKU, plus Classic Reports through a direct grant. A customer with only grandfathered functionality can omit `skus` and declare `features: [reports.classic]`. No synthetic SKU is needed.

SKU and direct grants combine into a set. Unknown IDs and revisions fail validation. Declare `features: []` with no SKU grants for a shared-content-only edition; `null` is invalid. That edition still includes eligible shared pages and text outside feature blocks, while pages and blocks requiring a feature are omitted. A missing required profile fails the build rather than selecting this shared-only behavior.

Profile logo and favicon paths resolve from the profile directory and must stay inside it. Shared configuration paths retain their own origins. Shoalrun reads the chosen profile and declared assets without discovering other customers' files in that deployment directory.

Profiles accept selected `site`, `theme`, and existing snippet `variables` settings. They can narrow `publications.enabled` to combinations already enabled by the shared project. They cannot replace content sources, register plugins, change access policy, or override navigation. Profile CSS, custom fonts, and file-backed palettes are not supported.
