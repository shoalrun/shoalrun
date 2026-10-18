---
id: guide.analytics
title: Bring your own analytics
summary: Send documentation interaction events to your analytics service through
  an optional browser adapter.
type: reference
canonical: /author/analytics
---

# Bring your own analytics

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Analytics

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/analytics.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Measure documentation tool calls separately from browser interactions.

Shoalrun sends documentation interactions to an analytics service through an **adapter**: a browser module you supply to initialize the service and deliver events. Analytics is off by default. Shoalrun includes no service SDK, storage, visitor identity, or delivery queue.

## Built-in events

Use these events to measure browser interactions. Each includes the page properties above.

| Event                     | Additional properties                         | Trigger                                                                                                                                                                          |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_view`               | None                                          | Once after adapter initialization, when delivery is enabled.                                                                                                                     |
| `navigation_click`        | `region`, `targetPath`, `external`            | A section, sidebar, outline, breadcrumb, related-reading, card, hero, footer, header, article, or Markdown-action link is activated.                                             |
| `content_tab_change`      | `tabIndex`, `tabId`                           | A different content tab is selected by click or keyboard. Initial selection and hash reveals are excluded.                                                                       |
| `disclosure_toggle`       | `open`                                        | A reader opens or closes a Collapsible or article InfoHint through its summary. Programmatic initialization is excluded.                                                         |
| `walkthrough_step_change` | `stepIndex`, `stepCount`, `layout`, `trigger` | A different walkthrough step becomes active through click, keyboard, or step scrolling. Initial selection and layout changes are excluded.                                       |
| `code_copy`               | `language`, optional `stepIndex`              | A code example or walkthrough pane is successfully written to the clipboard.                                                                                                     |
| `markdown_copy`           | None                                          | The full Markdown twin is successfully written to the clipboard.                                                                                                                 |
| `section_link_copy`       | `targetHeadingId`                             | A heading's link is successfully written to the clipboard.                                                                                                                       |
| `search_results`          | `queryLength`, `resultCount`, `status`        | A completed search settles for 300 ms. Status is `results`, `empty`, or `error`; the count is the displayed result count.                                                        |
| `search_result_click`     | `queryLength`, `resultIndex`, `targetPath`    | A search result is activated, including through the keyboard.                                                                                                                    |
| `reader_filter_change`    | `scope`, `filter_<facet>`, optional `inherit` | A site or page reader selection changes through the controls or reader-view API. Initialization does not emit it. Facet hyphens become underscores; values are choice-ID arrays. |

Indexes start at zero. Navigation regions are `sections`, `sidebar`, `toc`, `breadcrumbs`, `related`, `card`, `hero`, `footer`, `header`, `content`, and `formats`; only HTTP(S) links qualify. Target paths omit queries and fragments. Built-in payloads exclude raw search queries, copied text, article text, reader identifiers, and referrers. A service SDK may add its own properties.

Changing component attributes from a script does not necessarily emit an event. Browser page loads emit page views; back-forward cache restoration has no separate built-in event.
