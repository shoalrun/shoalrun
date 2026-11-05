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

**Updated: 2026-11-05.**

Parent page: [Full Markdown page](/author/writing-style.md)

This page is an example of a project writing guide. The rules below are the house style for Shoalrun's own documentation site, and authors and agents use them through project instructions. Shoalrun doesn't automatically apply these rules to other projects.

## Feature availability

Use page frontmatter `availability` for a feature's overall version support. HTML uses the same quiet text style as changelog release versions, beside the page dates. Markdown keeps readable availability labels, and `documents.json` retains the authored metadata.

```yaml title="Page frontmatter"
availability:
  since: 0.1.0-alpha.18
```

Use `through` for the last supported version, or combine `since` and `through` for a range. Both boundaries are inclusive. These are authored version labels: they don't hide a page, select a publication, or compare versions automatically. Omit a boundary when it's unknown.

If only an option or behavior is newer, put a badge beside that option or behavior:

```mdx
<Badge variant="neutral">Since 0.1.0-alpha.18</Badge>
```

Keep the availability of the whole feature separate from newer additions. Don't assign the newest option's version to an older guide. Add a prerequisite to a how-to when readers need that version to complete the task.

Use the release record or approved release plan as evidence. Never infer the next release number, use `latest`, or publish a placeholder. For coordinated package and documentation releases, add the assigned version before publication. Leave it out while the release number is undecided; track that work in release preparation.

Keep the original availability version when editing the page. Don't change it to the current release. Link to release notes when readers need migration details, and name the package if the page covers more than one product.

Frontmatter `availability` describes feature support. The `version` field selects a documentation edition, `releaseVersion` identifies a changelog release, and `subjectLifecycle` describes feature status.
