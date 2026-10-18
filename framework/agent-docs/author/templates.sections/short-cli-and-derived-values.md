---
id: guide.templates
title: Templates
summary: Create and edit page starting points, then scaffold drafts from them.
type: reference
audiences:
  - authors
canonical: /author/templates
---

# Templates

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Templates

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/templates.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Know which fields a new page needs before you pre-fill them.

A template supplies the starting page for a new one: commented frontmatter and a body of prompts. It tells authors and agents what to write, in what order, and what to delete. `scaffold` copies the template once and fills in the draft fields. The result is an ordinary page that authors can change. Editing a template later affects future drafts, not pages already scaffolded.

Use a [snippet](https://www.shoalrun.com/author/snippets.md) when the same prose must stay shared across several pages. Templates guide the initial draft; they do not enforce a permanent page structure.

## Short CLI and derived values

From a project directory, use the package's `shoalrun` command after installing it locally:

```sh
shoalrun scaffold how-to -n /path/to/project/content/track-parcel.mdx
```

The CLI discovers `docs.config.yaml` in the current directory or a parent. It derives draft values from the target path relative to the content directory. For `content/guides/retry-payments.mdx` with `guide`:

| Field     | Derived value                                                              |
| --------- | -------------------------------------------------------------------------- |
| `id`      | `guide.guides.retry-payments`                                              |
| `title`   | `Retry Payments`                                                           |
| `summary` | `Draft guide for retry payments. Replace this summary before publication.` |
| `slug`    | `/guides/retry-payments`                                                   |

The derived summary counts as a placeholder, so the page cannot be published until you replace it. Override any value with `--id`, `--title`, `--summary`, or `--slug`. Other options are `--config FILE`, `--channel`, `--version`, and `--language` (defaults come from `publications.defaults`), and `--operation ID`, which can repeat. `--new` is the long form of `-n`. The [CLI reference](https://www.shoalrun.com/cli.md) lists every rule.

If the target path begins with the selected publication's route prefix, the short form omits that prefix from the derived slug. For example, with version `v2` configured at `/v2`, `content/v2/check-payment.mdx` gets slug `/check-payment` and route `/v2/check-payment`. The stable ID still derives from the complete content path; use `--id` if several versions represent the same document.

Every new page is a draft. Its detailed placeholders remain visible for author and AI edits, and an unresolved placeholder fails the public build. This guard catches unfinished sections; a human still needs to check technical claims and example behavior before publication.
