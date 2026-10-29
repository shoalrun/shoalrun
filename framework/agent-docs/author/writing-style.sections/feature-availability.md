---
id: reference.writing-style
title: Example writing guide
summary: Adapt this site's writing guide for your own documentation and agent
  instructions.
type: reference
area: authoring
subarea: authoring-writing
canonical: /author/writing-style
---

# Example writing guide

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Authoring reference > Example writing guide

**Updated: 2026-10-28.**

Parent page: [Full Markdown page](/author/writing-style.md)

This page is an example of a project writing guide. The rules below are the house style for Shoalrun's own documentation site, and authors and agents use them through project instructions. Shoalrun does not automatically apply these rules to other projects.

## Feature availability

Use the sentence “Available since `VERSION`.” to record the first package release that supports a feature. Replace `VERSION` with the exact assigned release number, including any prerelease suffix. This is ordinary prose, preserved in HTML and Markdown.

Put the note immediately after the introduction on the feature's main guide and reference page. If only an option or behavior is newer, put its note beside that option or behavior. Add a prerequisite to a how-to only when readers need that version to complete the task.

Use the release record or approved release plan as evidence. Never infer the next release number, use `latest`, or publish a placeholder. For coordinated package and documentation releases, add the assigned version before publication. Leave the note out while the release number is undecided; track that work in release preparation.

Keep the original availability version when editing the page. Do not change it to the current release. Link to release notes when readers need migration details, and name the package if the page covers more than one product.

This note describes feature availability. Frontmatter `version` selects a documentation edition, `releaseVersion` identifies a changelog release, and `subjectLifecycle` describes feature status. Do not repurpose those fields or add a badge solely for availability.
