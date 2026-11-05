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

## Select each product release

Since 0.1.0-alpha.18

First declare the [independent product catalogs](https://www.shoalrun.com/publish/publications.md) and enabled product publications in the shared configuration. Then select the customer's exact combination in the profile:

```yaml title="Customer publication selection (profile fragment)"
publications:
  enabled:
    - { product: payments, channel: production, version: v3, language: en }
    - { product: reporting, channel: production, version: v1, language: en }
```

Another profile can select Payments v2 with Reporting v1. Selection must remain a nonempty subset of the shared project's enabled coordinates; it can't add an undeclared product or release. Product and version are part of publication identity, so `v1` in one product doesn't select another product's v1.

Feature grants and product releases answer different questions. Publication selection chooses which release's instructions to publish. SKU revisions and direct feature grants choose the functionality those instructions may describe. Selecting Payments v3 doesn't grant a feature, and granting a feature doesn't enable a Payments release. Shared pages need explicit publication memberships; `shared: true` doesn't copy them into every product.
