---
id: guide.frontmatter-reference
title: Frontmatter field reference
summary: Browse the built-in and project-defined page fields this site supports.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/frontmatter-reference
---

# Frontmatter field reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Page metadata > Generated frontmatter reference

**Updated: 2026-11-05.**

Parent page: [Full Markdown page](/author/frontmatter-reference.md)

This is the field inventory for this documentation site. The tables below are built from Shoalrun's native field definitions and this site's `frontmatter.fields` declarations on each build. They describe source page headers, not the shorter YAML header selected for a published Markdown page.

`agent.intent` in the project-defined table is an optional string. This site's authors use it to describe the task a page helps an agent complete. It **isn't** a required Shoalrun field or an instruction to an agent. `editorial.reviewNote` is another site-specific field for internal review notes. A different project can declare different fields.

To publish an equivalent inventory on your site, place `<FrontmatterReference />` on a page. It takes no attributes or child content and renders the current project's native and declared fields in HTML and Markdown.

For section exports, declare `standaloneSections` with `{ id, context: section }` objects after reviewing each section without its page introduction. Older heading-title strings remain supported for contextual discovery. See [section identity and compatibility](https://www.shoalrun.com/content-delivery/sections.md) before changing an existing declaration.

## Feature availability

Since 0.1.0-alpha.18

Set `availability` on a page to show version support beside its dates. This example uses fictional release labels; replace them with your feature's actual supported versions:

```yaml title="Page frontmatter"
availability:
  since: v1
  through: v2
```

Use either boundary alone or both together. `since` is the first supported version, and `through` is the last supported version; both are inclusive. Omit an unknown boundary. The values are labels and aren't compared automatically. This metadata doesn't select a publication, hide content, or mark a feature as deprecated.

HTML displays “Since v1” and “Through v2” in the same text style as changelog release versions, beside “Updated” when that date is present. Markdown includes readable availability labels even when its configured metadata projection omits the field. The document manifest retains the `availability` object. There is no JavaScript interaction. For a newer option within an older guide, use a [Badge](https://www.shoalrun.com/author/components/badge.md) beside the option instead of changing the page's availability.

### Mark a newer section

Keep the page's original availability when only one section covers a newer capability. Put its label directly below the section heading:

```mdx
## Product publications

<Badge variant="neutral">Since 0.1.0-alpha.18</Badge>

Give each product its own versions and default release.
```

This renders the section label as Since 0.1.0-alpha.18. The [publications guide](https://www.shoalrun.com/publish/publications.md) uses this pattern for independent product versions. Markdown retains the label as readable text beside that section's content.
