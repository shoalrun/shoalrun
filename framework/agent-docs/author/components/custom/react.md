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

## Registration

Add registrations to your project configuration:

```yaml
components:
  - ./components/retry-budget/components.json
```

The manifest declares the build module, browser source, and styles relative to the package. Shoalrun compiles the module graph and includes imported JSON and shared functions in dependency tracking. The build module imports `policy.json`; there is no separate `files` registration.

## Interactive React example

A retry policy is a useful documentation component: readers need to understand the safety rules and calculate how repeated attempts affect total wait time. The packaged `examples/components/retry-budget/` folder contains a working plugin, policy data, React source, shared model module, and stylesheet. Copy the whole folder to `components/retry-budget/`, then install its dependencies from your project directory:

```sh
npm ci --prefix components/retry-budget
```

Use the registration above to enable the component.

The plugin validates the JSON policy and generates a settings table, formulas, a worked schedule, a warning, a code example, and a specification link. React receives that validated policy as instance data and adds controls for exploring other policies. Both representations start from the same configured values.

```mdx
<RetryBudget title="Request retry policy" />
```

**Request retry policy**

> **Before you retry:** Retry only idempotent operations, or requests protected by an idempotency key. Honor a server's Retry-After header; it can require a longer wait than this policy.

Configured policy. Attempts include the first request; only subsequent attempts wait. These are fictional example settings, not a Shoalrun service limit.

| Setting                 | Value              |
| ----------------------- | ------------------ |
| Maximum attempts        | 4                  |
| Base delay (ms)         | 500                |
| Delay cap (ms)          | 30000              |
| Backoff                 | exponential        |
| Jitter                  | none               |
| Retryable HTTP statuses | 429, 502, 503, 504 |

Supported controls: 1–8 attempts, base delay from 1 to 60000 ms, and a delay cap from the base delay to 60000 ms. Backoff is constant or exponential. Jitter is none or full.

For retry number r starting at 1: constant delay = min(cap, base); exponential delay = min(cap, base × 2^(r − 1)). No jitter waits that delay. Full jitter samples uniformly from zero to that delay; its expected wait is half the delay. The calculator shows bounds, not a random prediction.

The configured schedule follows. Cumulative wait excludes request duration and any longer Retry-After wait.

| Attempt | Wait before attempt | Cumulative wait |
| ------- | ------------------- | --------------- |
| 1       | 0 ms                | 0 ms            |
| 2       | 500 ms              | 500 ms          |
| 3       | 1000 ms             | 1500 ms         |
| 4       | 2000 ms             | 3500 ms         |

This JavaScript calculates the delay bounds; your request handler must separately enforce retryable statuses, idempotency, and Retry-After.

```js
function retryDelayBounds(retry, policy) {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs *
    (policy.backoff === 'constant' ? 1 : 2 ** (retry - 1)));
  return policy.jitter === 'full' ? [0, ceiling] : [ceiling, ceiling];
}
```

[Read the Retry-After HTTP specification](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)

`title` is an optional nonempty literal string, defaulting to `Retry budget`. The component accepts no children and imports its local `policy.json` file. The policy fields and control limits appear in the fixture above. The browser controls let readers explore alternatives; they do not change the documented policy or its Markdown.

## Share the model with the browser

The build module imports `policy.json` and `validatePolicy` and `retrySchedule` from `model.js`. Its `content()` function returns documentation built with content helpers and `data: policy`. Shoalrun serializes that validated instance data for the browser.

The browser module receives it directly:

```js
export function enhance({ root, controls, content, data: policy }) {
  // Mount the optional React calculator using policy.
  // Preserve the shared documentation in content.
}
```

The browser imports the same `retrySchedule` function as the build module. It does not parse table rows, depend on English labels, or maintain a separate calculation implementation. Renaming a documented label does not change the calculator's model.

React and React DOM are dependencies of this component package. Shoalrun compiles its JSX and imports when building the site; component consumers do not run a separate bundler. The interface still enhances shared documentation and does not render arbitrary MDX imports.

## HTML, Markdown, and agents

The calculator uses labeled native form controls, keyboard input, and an announced result. Without JavaScript, the configured settings, supported alternatives, formulas, worked schedule, safety warning, code, and specification link remain visible. Markdown contains that same explanation. Changing browser controls does not change the documented policy.

The author and agent must write the shared explanation deliberately. Shoalrun does not infer it from React. Review the essential content in both outputs, including every meaningful choice and warning. The [component-authoring skill](https://www.shoalrun.com/author/components/custom.md) guides that work.

## Related reading

### Read first

- [Custom components](https://www.shoalrun.com/author/components/custom.md) — Start with a small component whose content stays in MDX.
