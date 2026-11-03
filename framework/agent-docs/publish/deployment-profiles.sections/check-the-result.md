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

## Check the result

Inspect the edition's sidebar, selected pages, and shared sections. Then inspect its Markdown, search indexes, `documents.json`, and exports for the same selections. An excluded feature's content should be absent from the output files, rather than hidden by browser controls.

A normal site build writes a private selection report at `.shoalrun/profile-selection.json`. It lists resolved features, grant sources, and inclusion decisions. Match its `buildId` to the output before treating it as a receipt for that output. The profile itself, its source filenames, and the report are not served as public metadata.

Affected pages excluded from the selected profile remain listed in validation coverage with a warning that their rendered content was not checked. Validate another profile that includes those pages before accepting their content changes.
