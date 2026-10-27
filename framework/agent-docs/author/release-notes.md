---
id: guide.release-notes
title: Write release notes and changelog entries
summary: Write flexible release summaries and changelog entries identified by
  date or version.
type: how-to
area: project
subarea: project-releases
canonical: /author/release-notes
---

# Write release notes and changelog entries

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write release notes

**Updated: 2026-10-26.**

Release notes and changelog entries serve different reading needs. A **release note** summarizes a named release, quarter, or other period. A **changelog entry** records a change identified by date, release version, or both. Both are ordinary Markdown or MDX pages with HTML and Markdown outputs and stable IDs.

## Write a release note

Use `type: release-note`. Its title and content define the scope; neither a date nor a release version is required. This example covers a quarter without claiming one publication day:

```yaml title="content/releases/q3-summary.mdx"
---
id: release.q3-summary
title: Q3 2026 summary
summary: Changes grouped for the quarter.
type: release-note
slug: /releases/q3-summary
channel: production
version: current
access: { policy: public }
---
```

`channel` and `version` must name an enabled publication, or come from [global frontmatter](https://www.shoalrun.com/author/frontmatter.md). A note for one release can instead use `releaseVersion: "2.4"` and a version in its title. `releaseVersion` identifies the product release; the ordinary `version` field selects a documentation publication. The two fields are independent. Add `date` only when the note has a meaningful publication date.

## Write a changelog entry

Use `type: changelog-entry` and identify the change with `date`, `releaseVersion`, or both. The project sets which field is required. The default accepts either. A date must be a real `YYYY-MM-DD` calendar date; a release version must be nonempty text.

```yaml title="content/changelog/example.mdx"
---
id: change.example
title: Example change
summary: A short description of the change.
type: changelog-entry
date: 2026-09-24
slug: /changelog/example
channel: production
version: current
access: { policy: public }
tags: [api-reference]
---
```

The build shows supplied dates and release versions on pages and cards, and includes them in Markdown twins. Dated changelog entries show their publication date without a separate Updated label in the page header or Markdown body. Revision dates remain in the document manifest and configured Markdown metadata. This site's Markdown metadata also projects the date and release version when present.

### Set the identifier rule

Configure `frontmatter.changelogIdentifier` in project config:

```yaml title="docs.config.yaml"
frontmatter:
  changelogIdentifier: either
```

| Value     | Required on each changelog entry             |
| --------- | -------------------------------------------- |
| `either`  | A date, a release version, or both. Default. |
| `date`    | A date. A release version is optional.       |
| `version` | A release version. A date is optional.       |

This rule does not apply to release notes. It also does not change the documentation publication's `version` axis.

## Describe what changed

On a `changelog-entry`, add an optional `change` block to distinguish an editorial correction from a changed procedure or behavior. This fictional example describes a breaking API change:

```yaml
change:
  kind: breaking
  affects: [reference.create-payment, guide.create-payment]
  migration: guide.migrate-payments
```

Replace these IDs with public pages in the entry's channel, version, and language. Use stable IDs without the `doc:` prefix. Targets resolve to their current titles and URLs. Missing, draft, self, and other-publication targets fail the build; external URLs and references to removed pages are not supported in this increment.

| Field       | Required | Meaning                                                                                                       |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `kind`      | Yes      | One author-declared classification from the table below.                                                      |
| `affects`   | Yes      | Nonempty list of unique document IDs that describe the affected subjects or instructions. Order is preserved. |
| `migration` | No       | Document ID of the guide explaining how to adapt.                                                             |

| Kind        | Use when                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------- |
| `editorial` | Correcting wording or presentation without changing the documented instructions or behavior. |
| `procedure` | Changing instructions, setup steps, or a recommended workflow.                               |
| `behavior`  | Describing a feature or behavior change that the author has not classified as breaking.      |
| `breaking`  | Existing clients or workflows need adaptation because of the change.                         |

Choose the kind deliberately and explain scope and limitations in the entry body. `behavior` is not a compiler guarantee of compatibility. A missing migration link does not mean migration is unnecessary. When one release contains several distinct changes, agree on the grouping before drafting: one combined entry with clearly scoped sections, or separate entries collected in a release note. Use one `change` classification only when it accurately describes the combined entry; otherwise leave the entry unclassified and explain each change in its body.

`change` is page-specific: global defaults and enforced metadata cannot set it. It is accepted only on `changelog-entry` pages, not release summaries or ordinary guides. Unknown keys fail. Use the entry's existing `date` and `releaseVersion` fields for its date and release label; this block does not add an effective-date schedule or prove deployment.

HTML, full Markdown, and every published section of the entry show an **Authored change** notice with the kind, affected pages, and migration link when supplied. HTML links open pages; Markdown links open their twins. The corresponding `documents.json` record includes `change.kind`, resolved `change.affects` targets, and optional `change.migration`. Each target has `id`, `title`, `url`, and `markdownUrl`; URLs include the publication and base path. The entry's manifest variant supplies its publication scope.

Entries without `change` remain published and discoverable. Treat them as unclassified, not nonbreaking. The build checks metadata and references; it does not verify the classification or infer a breaking change from a changed digest. There is no separate semantic feed or automatic annotation of affected pages in this increment. Fetch an entry's Markdown to read its explanation.

## Collect updates

For a chronological changelog, put this on an authored page:

```mdx
<DocCollection type="changelog-entry" orderBy="date" />
```

For a version-led changelog, use `orderBy="releaseVersion"`. Version ordering compares labels with numeric parts, so keep one consistent version scheme. Either ordered collection fails if a matching entry lacks its sort field. When entries mix dates and versions, curate the sequence with `<DocCards docs={["change.one", "change.two"]} />`.

Collections use the page's channel, documentation version, and language. Draft entries stay out of public builds. Stable IDs break ties. `limit`, `exclude`, and `pin` provide editorial control.

To roll changes into a release note, add a shared tag to entries and filter by it:

```mdx
<DocCollection type="changelog-entry" tag="api-reference" orderBy="date" />
```

Release notes can link to entries, include a filtered collection, or stand alone. RSS feeds and blog archives remain future work.

## Check the published entries

Build the site and open the note or changelog page in HTML and Markdown. Confirm its release scope, date or version, and collection links match the change you are documenting. If the page is missing, check its public access and enabled publication. Keep existing IDs and routes when revising an entry, and set `updated` to the edit date.

## Related reading

### Reference while working

- [Cards and collections](https://www.shoalrun.com/author/components/cards.md) — Filter and order a collection of changelog entries.

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Look up the date and releaseVersion fields that order entries.

### Related topics

- [Changelog](https://www.shoalrun.com/changelog.md) — Write dated entries and collect them with the built-in components.

### Often confused with

- [Use Git branches for separate docs sites](https://www.shoalrun.com/publish/revisions.md) — Release notes tell readers what changed; release revisions choose which Git revision of the docs to build and deploy.
