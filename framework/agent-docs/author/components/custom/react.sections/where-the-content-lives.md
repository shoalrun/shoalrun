---
id: guide.custom-components.react
title: Data-driven React components
summary: Follow local data through a component plugin, shared documentation, and
  a React calculator.
type: explanation
area: components
subarea: components-custom
canonical: /author/components/custom/react
---

# Data-driven React components

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Custom components > Data-driven React components

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/components/custom/react.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Custom components](https://www.shoalrun.com/author/components/custom.md) — Start with a small component whose content stays in MDX.

Use a declared data file when a component needs to generate tables, calculations, or other structured documentation. This advanced example adds data and generated explanations to the [small CopyText example](https://www.shoalrun.com/author/components/custom.md). A data file is optional; ordinary component text can stay in MDX.

## Where the content lives

A custom component is a small program that writes part of a documentation page. Its build function produces shared content, which Shoalrun renders as HTML and Markdown. An optional React interface adds browser controls afterward. Shoalrun does not convert React into Markdown.

The retry example splits its work across these files:

| File                   | What you write there                                                        | What readers get                                    |
| ---------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| The page's `.mdx` file | Task-specific explanations and the `<RetryBudget />` invocation.            | The surrounding documentation in HTML and Markdown. |
| `policy.json`          | Retry counts, delays, supported status codes, and the safety warning.       | The configured values and warning in both formats.  |
| `plugin.mjs`           | Validation, reusable explanatory text, formulas, tables, and code examples. | The component's shared HTML and Markdown content.   |
| `browser.jsx`          | React controls, state, input validation, and the interactive timeline.      | A browser interface for trying alternative values.  |
| `style.css`            | Optional styles for the browser interface.                                  | The files the HTML page loads for that interface.   |

`policy.json` is this example's data format, not a Shoalrun requirement. A simpler component can use only MDX attributes and child content. Keep page-specific prose in the page; put recurring explanations and generated content in the plugin.

### Start with data

For example, `policy.json` contains a complete configured policy:

```json
{
  "attempts": 4,
  "baseDelayMs": 500,
  "maxDelayMs": 30000,
  "backoff": "exponential",
  "jitter": "none",
  "retryableStatuses": [429, 502, 503, 504],
  "warning": "Retry only idempotent operations, or requests protected by an idempotency key. Honor a server's Retry-After header; it can require a longer wait than this policy."
}
```

The plugin's `content()` function imports that data, validates it, and returns shared content nodes. This shortened excerpt shows how a value becomes a paragraph; the complete plugin also generates the tables, warning, formula, schedule, code, and link:

```js
const policy = validatePolicy(importedPolicy);
return {
  content: c.paragraph(`Allow at most ${policy.attempts} attempts, including the first request.`),
  data: policy
};
```

That paragraph becomes `<p>Allow at most 4 attempts, including the first request.</p>` in HTML and the same sentence in Markdown. There is no separate Markdown renderer to write for these shared nodes.

### Use the component in a page

The page author supplies the surrounding context and invokes the registered component:

```mdx
## Retrying a request

Check whether the operation is safe to repeat before enabling retries.
The policy below shows the configured wait budget.

<RetryBudget title="Request retry policy" />
```

With the example policy, the generated Markdown includes this worked schedule:

```md
| Attempt | Wait before attempt | Cumulative wait |
| --- | --- | --- |
| 1 | 0 ms | 0 ms |
| 2 | 500 ms | 500 ms |
| 3 | 1000 ms | 1500 ms |
| 4 | 2000 ms | 3500 ms |
```

HTML displays the same documented schedule. React receives the same validated policy directly and adds the calculator shown below. Changing a browser control changes that reader's calculation; it does not edit `policy.json`, the documented schedule, or Markdown. To change the documented policy, edit the data file and rebuild.
