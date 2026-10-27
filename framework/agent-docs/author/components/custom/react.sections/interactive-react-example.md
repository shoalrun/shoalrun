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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/components/custom/react.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Custom components](https://www.shoalrun.com/author/components/custom.md) — Start with a small component whose content stays in MDX.

Use a declared data file when a component needs to generate tables, calculations, or other structured documentation. This advanced example adds data and generated explanations to the [small CopyText example](https://www.shoalrun.com/author/components/custom.md). A data file is optional; ordinary component text can stay in MDX.

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
