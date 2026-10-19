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
