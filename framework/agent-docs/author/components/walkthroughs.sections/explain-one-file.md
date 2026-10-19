---
id: guide.component.walkthrough
title: Walkthroughs
summary: Build code tutorials that explain code one step at a time, with a
  scrolling pane in HTML and every step in Markdown.
type: reference
area: components
subarea: components-code
canonical: /author/components/walkthroughs
---

# Walkthroughs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Walkthroughs

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/components/walkthroughs.md)

Use `<Walkthrough>` to explain code step by step. Each step pairs an explanation with code built up across steps or read from a project file.

When there is room for two columns, explanations scroll on the left and code stays on the right. Scrolling or selecting a step updates the code pane. At either end, scrolling continues through the page. On narrower screens, each step shows its explanation and code in order.

The [spotlight layout](https://www.shoalrun.com/author/components/walkthroughs.md#choose-a-layout) uses step buttons instead of a scroller. Code that stays the same between steps slides to its new position, so readers can follow the changes.

Use a walkthrough when readers build up code or study one file in parts. For steps without code, use an ordinary numbered list.

## Explain one file

Put one code fence directly inside `<Walkthrough>`, before the steps, to explain a single file. Steps then have no code of their own. Each step's `highlight` picks the lines it explains.

### MDX source: explain one file

This source defines the interactive example below.

````mdx
<Walkthrough title="Read a retry policy">

```yaml title="retry.yaml"
retry:
  attempts: 5
  backoff: exponential
  initialDelay: 2s
  maxDelay: 5m
```

<Step title="Set the number of attempts" highlight="2">

Five attempts cover most short outages.

</Step>
<Step title="Choose the delay" highlight="3-5">

Each retry waits twice as long, from two seconds up to five minutes.

</Step>
</Walkthrough>
````

**Walkthrough: Read a retry policy**

```yaml title="retry.yaml"
retry:
  attempts: 5
  backoff: exponential
  initialDelay: 2s
  maxDelay: 5m
  retryOn:
    - 429
    - 503
    - timeout
deadLetter:
  queue: webhooks-failed
  keep: 14d
```

### Step 1: Set the number of attempts

Five attempts cover most short outages without hiding a real failure.

Line 2:

```yaml
  attempts: 5
```

### Step 2: Choose the delay

Each retry waits twice as long as the one before, from two seconds up to five minutes.

Lines 3–5:

```yaml
  backoff: exponential
  initialDelay: 2s
  maxDelay: 5m
```

### Step 3: Pick what to retry

Retry rate limits, unavailable services, and timeouts. Other errors fail at once, because retrying won't fix them.

Lines 6–9:

```yaml
  retryOn:
    - 429
    - 503
    - timeout
```

### Step 4: Keep failures

Requests that use every attempt go to a separate queue for 14 days, so you can replay them.

Lines 10–12:

```yaml
deadLetter:
  queue: webhooks-failed
  keep: 14d
```
