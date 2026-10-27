---
id: guide.component.table
title: Tables
summary: Add optional filtering and sticky headings to long HTML tables while
  preserving every row in Markdown.
type: reference
area: components
subarea: components-visuals
canonical: /author/components/tables
---

# Tables

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Tables

**Updated: 2026-10-27.**

Ordinary Markdown tables work without a component. For a long table, wrap one table in `<Table>` to add a filter box, sticky column headings, or both in HTML:

## Syntax

```mdx
<Table filter sticky>

| Name | Environment | Status |
| --- | --- | --- |
| Accounts | Production | Enabled |
| Invoices | Sandbox | Disabled |

</Table>
```

## Attributes

`filter` and `sticky` are bare boolean attributes. Use either one alone or both. `<Table>` takes exactly one Markdown table and no other content. Its complete table, without controls, appears in the [Markdown twin](https://www.shoalrun.com/author/components/tables.md).

## Try the controls

Filter this table by a name, environment, or status. Several words must all occur in a row; matching ignores case. Press Escape in the filter box to clear it. Scroll inside the table to keep the headings visible.

| Name     | Environment | Status   |
| -------- | ----------- | -------- |
| Accounts | Production  | Enabled  |
| Billing  | Sandbox     | Enabled  |
| Catalog  | Production  | Disabled |
| Delivery | Sandbox     | Disabled |
| Events   | Production  | Enabled  |
| Files    | Sandbox     | Enabled  |
| Groups   | Production  | Disabled |
| History  | Sandbox     | Enabled  |
| Invoices | Production  | Enabled  |
| Jobs     | Sandbox     | Disabled |
| Keys     | Production  | Enabled  |
| Limits   | Sandbox     | Enabled  |
| Metrics  | Production  | Disabled |
| Notes    | Sandbox     | Enabled  |
| Orders   | Production  | Enabled  |
| Profiles | Sandbox     | Disabled |

## HTML, Markdown, and agents

The filter needs JavaScript. Without it, the filter field stays hidden and all rows remain visible. Sticky headings use CSS and still work without JavaScript. On narrow screens the table scrolls horizontally. Keyboard users can focus the scrollable table region.

The Markdown twin contains all 16 rows as a regular table. Agents and text-only readers do not need the filter to find a row. Use an ordinary Markdown table when these HTML controls are unnecessary.
