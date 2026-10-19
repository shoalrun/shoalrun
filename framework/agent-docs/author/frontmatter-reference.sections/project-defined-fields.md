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

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Generated frontmatter reference

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/frontmatter-reference.md)

This is the field inventory for this documentation site. The tables below are built from Shoalrun's native field definitions and this site's `frontmatter.fields` declarations on each build. They describe source page headers, not the shorter YAML header selected for a published Markdown page.

`agent.intent` in the project-defined table is an optional string. This site's authors use it to describe the task a page helps an agent complete. It is **not** a required Shoalrun field or an instruction to an agent. `editorial.reviewNote` is another site-specific field for internal review notes. A different project can declare different fields.

To publish an equivalent inventory on your site, place `<FrontmatterReference />` on a page. It takes no attributes or child content and renders the current project's native and declared fields in HTML and Markdown.

## Project-defined fields

A project can add page fields by declaring them in `frontmatter.fields`. The declaration gives a field path (such as `agent.intent`), a type, and a description. A dotted path means nested YAML on the page. Undeclared fields are still accepted in source pages, but only declared fields appear in this table and receive type checks.

| Field                        | Type   | Required | Agent metadata approved | Description                                                             |
| ---------------------------- | ------ | -------- | ----------------------- | ----------------------------------------------------------------------- |
| `agent.intent`               | string | No       | Yes                     | The reader task this page helps an agent complete.                      |
| `editorial.reviewNote`       | string | No       | No                      | Internal note for documentation reviewers.                              |
| `editorial.lastVerified`     | string | No       | No                      | Date the page's technical claims were last checked, in YYYY-MM-DD form. |
| `editorial.verificationNote` | string | No       | No                      | Internal notes about the evidence and scope of the last check.          |

“Required” means the field must exist after defaults and enforced values are applied. “Agent metadata approved” means `public: true` allows that value to be selected for the generated Markdown preamble; it does not publish the field automatically. Select approved fields in `outputs.markdown.metadata.fields`, a `byType` rule, or a page profile. Source page body text is published independently of this selection.
