---
id: guide.content-section-identity
title: Section identity and compatibility
summary: Understand when a section can be exported on its own, declare it, and
  keep its reference stable.
type: reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sections
---

# Section identity and compatibility

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Section identity and compatibility

**Updated: 2026-10-29.**

A section is a heading and the content beneath it. For content delivery, Shoalrun selects sections beginning at a top-level `##` heading, including nested subsections, and ending before the next `##` or `#` heading. Exporting a section extracts that part of the page so an application can use it separately.

Available since `0.1.0-alpha.13`.

## Why a section needs a declaration

A section can lose essential information when separated from its page. For example:

```md
Before resetting your database, back it up. Resetting deletes all records.

## Reset the database

Run the reset command from Settings.
```

Exporting only “Reset the database” would leave out the backup instruction and deletion warning. Before exporting this section, move those details into the section or export the whole page instead.

A **standalone section** is one the author has reviewed and declared understandable without the rest of the page. Record that judgment in the page's `standaloneSections` frontmatter. This is what “approval” means here: a declaration in a source file, not a separate reviewer, permission request, or approval service. Shoalrun checks that the declaration exists and identifies a section; it cannot prove the content is complete.

You need this declaration when exporting an individual section. You do not need it to write a page, link to a heading, or export a whole page. Declaring a section does not export it: the export target separately chooses which declared sections to include.

## Identify the section

A section reference contains a document ID and a section ID. Ordinary top-level `##` headings receive derived IDs. Use an explicit marker when an application must retain the same reference after a heading changes.

## Derive an ID

```md
## Request a refund
```

This heading derives `request-a-refund`. Derivation normalizes the heading text, uses lowercase letters, numbers, and dashes, and adds a suffix for repeated headings. Changing a heading or reordering repeated headings can change a derived ID. Compare exports before publishing such edits.

## Preserve an explicit ID

```mdx
## Request a refund <Anchor id="refunds" />
```

The ID remains `refunds` if the title changes. The marker must be the single trailing element of a root H2, with one literal `id` and no children. IDs use 1–512 lowercase letters, numbers, or dashes, beginning with a letter or number. Duplicate IDs and collisions with another anchor fail. `Anchor` is a reserved built-in name.

The marker cannot be placed inside emphasis, a link, a tab, a reader section, or a snippet. Code examples containing marker syntax remain ordinary code. Both `##` headings and Setext H2 headings are supported.

## Declare a section ready for separate use

Read the section without the rest of the page. Check that it includes the prerequisites, definitions, warnings, and steps needed for its stated purpose. Then add its ID to the page's frontmatter:

```yaml
standaloneSections:
  - { id: refunds, context: section }
```

`context: section` records that your review covered the section on its own, without the page introduction. A derived ID can be declared too; an explicit `<Anchor>` is optional. Next, [select the section in an export target](https://www.shoalrun.com/content-delivery/select.md) using `resources`. If the declaration is missing, section export fails.

Recheck the declaration when the section or its prerequisites change. If the content needs the rest of the page to make sense, export the whole page instead.

## Compatibility with heading-title declarations

Existing projects may use the older title-string form:

```yaml
standaloneSections:
  - Request a refund
```

This form remains supported. It matches the exact heading text and approves a discovery read that includes page introduction and reading-path context. It does not approve a section-only export. Keep it when the section relies on that surrounding context.

Do not mechanically replace a title string with `{ id, context: section }`. First review the section without the page introduction and include any missing prerequisites, definitions, or warnings. Then replace the title string with the ID-based object and select the section in the export target. A heading cannot be declared in both forms.

The object form also marks the section as approved for contextual discovery when it meets discovery size requirements. Switching to the object does not remove context from existing discovery responses; it additionally approves the section-only export. See [section discovery](https://www.shoalrun.com/author/markdown-metadata.md) for those response rules.

## Maintain references

Renaming an explicit ID or removing an exported section removes a public content reference. Use `--previous-manifest` and `--fail-on-removed` when publishing an established collection. An unchanged ID with edited content receives a new digest; identity does not mean immutable wording.

## HTML, Markdown, and agents

HTML preserves the existing heading-derived anchor and adds an explicit ID as an alias when it is distinct and available. Markdown keeps the clean heading text. Agents receive IDs through outlines or export metadata; they should follow the returned resource URL rather than invent a Markdown fragment URL. Existing contextual MCP section reads retain their page context and size heuristics; application fragments are a separate output.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary.

### Related topics

- [Select content resources](https://www.shoalrun.com/content-delivery/select.md) — Approve section slices and preserve their references.
