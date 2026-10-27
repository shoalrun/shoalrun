---
id: guide.chat-checks
title: Check and speed up answers
summary: Understand answer checks, direct excerpts, caching, and the limits of each.
type: explanation
area: discovery
subarea: discovery-chat
subjectLifecycle: experimental
canonical: /chat/checks
---

# Check and speed up answers

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Documentation chat > Answer checks and reuse

**Updated: 2026-10-26.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/checks.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Generate and refresh answer cards](https://www.shoalrun.com/chat/prepared-answers.md) — Write reviewed answers to common questions so the chat serves them with no model call. (Status: experimental.)

Use this page after [local chat setup](https://www.shoalrun.com/chat/setup.md) to understand which checks run, which need a scorer, and when Shoalrun can reuse an answer. The [settings reference](https://www.shoalrun.com/chat/settings.md) defines the corresponding fields.

Citations and code are checked by default. Coverage gating, claim verification, direct excerpts, cards, and caching need their own configuration. None of these checks proves an answer is correct.

## Answer for one audience

`chat.readerView` limits retrieval to the configured audience, such as customers or staff. It filters whole pages using their reader marks. It does not make published files private; use host-level access controls for confidential content.

It uses the same reader filters as the search box. Define the audiences once under `readerFilters.facets`, name one in the chat, and tag pages with `audiences`:

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Audience
      options: { customers: Customers, staff: Staff }
chat:
  readerView: { audience: [customers] }
```

```yaml title="A staff-only page"
audiences: [staff]
```

The rule is the one the search box uses:

- A page with no audience is for everyone, and the chat can use it.
- A page tagged `staff` is used only when the chat's view includes `staff`.
- A page tagged for several audiences is used when the view includes any of them.

`readerView` needs `readerFilters.facets`, and each name and choice must exist there. The build and `config validate` check that.

Rebuild the [passage index](https://www.shoalrun.com/chat/passage-index.md) after changing page marks. An older index without those marks treats every page as shared. Section-level marks are ignored by passage retrieval.

Use `--reader-view audience=staff` on `ask` or `serve --ask` to change the view for one run.
