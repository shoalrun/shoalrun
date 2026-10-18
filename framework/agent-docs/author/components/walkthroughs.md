---
id: guide.component.walkthrough
title: Walkthroughs
summary: Build code tutorials that explain code one step at a time, with a
  scrolling pane in HTML and every step in Markdown.
type: reference
canonical: /author/components/walkthroughs
---

# Walkthroughs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Walkthroughs

**Updated: 2026-10-18.**

Use `<Walkthrough>` to explain code step by step. Each step pairs an explanation with code built up across steps or read from a project file.

When there is room for two columns, explanations scroll on the left and code stays on the right. Scrolling or selecting a step updates the code pane. At either end, scrolling continues through the page. On narrower screens, each step shows its explanation and code in order.

The [spotlight layout](#choose-a-layout) uses step buttons instead of a scroller. Code that stays the same between steps slides to its new position, so readers can follow the changes.

Use a walkthrough when readers build up code or study one file in parts. For steps without code, use an ordinary numbered list.

## Build up code

In the default mode, each `<Step>` has an explanation and can end with one code fence. Give each step the complete code at that point, not only the new lines. `highlight` picks lines in the step's code to emphasize.

### MDX source: build up code

This source defines the interactive example below.

````mdx
<Walkthrough title="Verify a webhook">
<Step title="Read the raw body">

Signatures cover the exact bytes, so read the body as text.

```ts
export async function handler(request: Request) {
  const body = await request.text();
  return new Response('ok');
}
```

</Step>
<Step title="Check the signature" highlight="3-5">

Compare the header with a signature of the body.

```ts
export async function handler(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-signature');
  if (!verify(body, signature)) {
    return new Response('invalid signature', { status: 401 });
  }
  return new Response('ok');
}
```

</Step>
</Walkthrough>
````

**Walkthrough: Verify a webhook**

### Step 1: Read the raw body

Signatures cover the exact bytes, so read the body as text. Parsing JSON first can change spacing and key order.

```ts
export async function handler(request: Request) {
  const body = await request.text();
  return new Response('ok');
}
```

### Step 2: Check the signature

Compare the signature header with a signature of the body. Reject the request before doing any work.

```ts
export async function handler(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-signature');
  if (!verify(body, signature)) {
    return new Response('invalid signature', { status: 401 });
  }
  return new Response('ok');
}
```

### Step 3: Parse the event

Parse the body after the check passes. The event type decides what happens next.

```ts
export async function handler(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-signature');
  if (!verify(body, signature)) {
    return new Response('invalid signature', { status: 401 });
  }
  const event = JSON.parse(body);
  await route(event.type, event.data);
  return new Response('ok');
}
```

### Step 4: Acknowledge quickly

Queue slow work and answer at once. Senders retry requests that time out.

```ts
export async function handler(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-signature');
  if (!verify(body, signature)) {
    return new Response('invalid signature', { status: 401 });
  }
  const event = JSON.parse(body);
  await queue.send({ type: event.type, data: event.data });
  return new Response(null, { status: 202 });
}
```

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

## Take code from a file

Code in a fence can drift from the code your project runs and tests. To show the real file instead, set `file` on a `<Step>` in place of its code fence, or on `<Walkthrough>` in place of its shared fence. The path is relative to the page.

```mdx
<Step title="Check the signature" file="../../examples/webhook.ts" region="verify" highlight="2-4">

Compare the header with a signature of the body.

</Step>
```

| Attribute | Meaning                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file`    | Path to the code file, relative to the page. The pane and code toolbar show the file name.                                                          |
| `region`  | Optional. Takes the lines between a `#region name` comment and its `#endregion` comment, without the markers, and removes their shared indentation. |
| `lines`   | Optional. Takes one range of lines, such as `12-30`. Use `region` or `lines`, not both.                                                             |
| `lang`    | Optional. The code language, when the file extension doesn't name one.                                                                              |

Prefer `region` for files that change. Region comments move with the code, while a `lines` range points at the wrong lines after an edit above it. Line numbers in `highlight` count from the first line shown, not from the top of the file.

Most languages accept region comments, such as `// #region verify` in TypeScript or `# region verify` in Python and YAML. A marker starts its line, after an optional comment opener, so `#region` inside code or a URL doesn't count. The name is the first word, and text after it, such as `// #region verify: check the signature`, is a description. Regions can nest, and an end marker can repeat its name, such as `// #endregion verify`, to show which region it closes. Give each region its own name. Every marker in the file must pair up. A stray or mismatched `#endregion` fails the build with its line number instead of cutting a region short. A file must be inside the Git repository that holds the page, or inside the project directory when there is no repository. The build refuses other paths, so a docs change can't publish files from elsewhere on the build machine. A missing file, region, or range fails the build. Files the walkthrough reads are listed as build dependencies, and `shoalrun dev` rebuilds when one inside the project changes.

## Choose a layout

The default `scroll` layout suits code that grows as readers scroll. Set `layout="spotlight"` for reference material that readers jump around in. Step titles become buttons, and only the chosen step shows its explanation. Up and Down move between the buttons. The walkthrough below reads Shoalrun's [minimal example config](https://www.shoalrun.com/config/examples.md) straight from its file:

```mdx
<Walkthrough title="Read the minimal config" layout="spotlight" file="../examples/minimal-config.yaml">
<Step title="Name the site" highlight="4-5">

...

</Step>
</Walkthrough>
```

**Walkthrough: Read the minimal config**

```yaml filename="minimal-config.yaml"
# The smallest useful site: one publication, two pages, a sidebar.
schemaVersion: 1

site:
  title: Acme handbook

publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }

# Every page gets these values unless it sets its own.
frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }

navigation:
  - id: welcome
    doc: guide.welcome
  - id: setup
    label: Setup
    items:
      - id: install
        doc: guide.install
```

### Step 1: Name the site

`site.title` appears in the header and in every page title. It is the only required site setting.

Lines 4–5:

```yaml
site:
  title: Acme handbook
```

### Step 2: Publish one edition

One channel and one version, both without a path prefix, publish every page at its own slug. Add channels or versions later to publish sandbox docs or older releases beside it.

Lines 7–14:

```yaml
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
```

### Step 3: Set page defaults

Values under `frontmatter.defaults` apply to every page that doesn't set its own, so pages can leave out the type, publication, and access.

Lines 16–22:

```yaml
# Every page gets these values unless it sets its own.
frontmatter:
  defaults:
    type: guide
    channel: production
    version: current
    access: { policy: public }
```

### Step 4: Build the sidebar

Navigation lists pages by stable ID, not by file name. `items` makes a group with a label.

Lines 24–31:

```yaml
navigation:
  - id: welcome
    doc: guide.welcome
  - id: setup
    label: Setup
    items:
      - id: install
        doc: guide.install
```

## Attributes

These attributes configure the walkthrough layout and the content shown for each step.

| Element       | Attribute                         | Meaning                                                                                      |
| ------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `Walkthrough` | `title`                           | Required literal name, shown above the steps and used as the accessible name.                |
| `Walkthrough` | `layout`                          | Optional. `scroll`, the default, or `spotlight`.                                             |
| `Walkthrough` | `file`, `region`, `lines`, `lang` | Optional. [Shared code from a file](#take-code-from-a-file), in place of a code fence.       |
| `Step`        | `title`                           | Required literal step heading.                                                               |
| `Step`        | `highlight`                       | Optional lines to emphasize, such as `3-5` or `2,7-9`. Line 1 is the first line of the code. |
| `Step`        | `file`, `region`, `lines`, `lang` | Optional. [The step's code from a file](#take-code-from-a-file), in place of a code fence.   |

A walkthrough needs at least two steps. Each step needs an explanation. In the default mode, a step's code fence must come last in the step. A step without code keeps the code pane on the step before it. When the walkthrough has shared code, steps can't add code. A `highlight` range past the end of the code fails the build.

## HTML, Markdown, and agents

Before scripts run, the HTML shows every step in order with its code. On screens too narrow for two columns, it stays that way. Readers who prefer reduced motion get the same pane without the movement.

In the side-by-side layout, each step's own code stays in the page but out of sight. Screen readers still hear code beside its explanation. The steps scroll with a mouse wheel or trackpad while the pointer is over the walkthrough. The pane's code is a labeled region that keyboard users can focus and scroll. Its **Copy** button copies the code on show and announces the result. Dimmed lines keep at least 4.5:1 contrast in every built-in palette. To change how far other lines fade, set `--walkthrough-dim` in [project CSS](https://www.shoalrun.com/author/css.md).

The Markdown twin replaces the pane with sections. The title becomes a bold line, and each step becomes a level-three heading such as `### Step 2: Check the signature`, followed by its explanation and its complete code. For a walkthrough with shared code, the code appears once before the steps. Each step then repeats the lines it explains, so an agent can quote a step without the rest of the file.

## Related reading

### Related topics

- [Code blocks](https://www.shoalrun.com/author/components/code-blocks.md) — Walkthroughs build on code blocks to explain an example one step at a time.
