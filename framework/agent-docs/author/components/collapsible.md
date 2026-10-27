---
id: guide.component.collapsible
title: Collapsibles
summary: Show optional detail in individual disclosures or compact groups, with
  full Markdown output.
type: reference
area: components
subarea: components-procedures
canonical: /author/components/collapsible
---

# Collapsibles

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Collapsibles

**Updated: 2026-10-27.**

`<Collapsible>` keeps supporting detail near the main instructions. Use it for material readers may need, but do not need to see before taking the next step. Its body is present in the initial HTML even when closed, and fully expanded in the Markdown twin.

## Syntax

```mdx
<Collapsible title="Why is this page a draft?">
Pages with draft access stay out of the public build.
</Collapsible>
```

### Why is this page a draft?

Pages with draft access stay out of the public build.

## Attributes

Use these attributes to configure the component.

| Attribute | Required | Meaning                                                     |
| --------- | -------- | ----------------------------------------------------------- |
| `title`   | Yes      | Nonempty literal text for the disclosure summary.           |
| `open`    | No       | Bare boolean attribute that starts the disclosure expanded. |

The body must contain block content. Dynamic MDX expressions and unknown components fail the build.

## Include Markdown and MDX

The body accepts paragraphs, lists, links, fenced code, and supported MDX components such as `Callout` and `DocLink`. These render inside the disclosure in HTML and in reading order in Markdown.

```mdx
<Collapsible title="Check the result" open>

- Confirm the response status.
- Compare the returned ID.

<Callout type="tip">Keep the response for troubleshooting.</Callout>

</Collapsible>
```

Use a normal section heading when readers should see the content as part of the main path. See the [component index](https://www.shoalrun.com/author/components.md) for other supported elements.

## Group related items

Wrap related disclosures in `<CollapsibleGroup>` to join their borders and remove the gaps between them. Each item opens independently, so readers can compare more than one answer.

The wrapper accepts one or more direct `Collapsible` children and has no attributes. Use each child's `title` and optional `open` attribute as usual.

```mdx
<CollapsibleGroup>
<Collapsible title="What gets published?">
The build includes public pages in the selected publication.
</Collapsible>
<Collapsible title="Can I preview first?">
Yes. Build locally and review the HTML and Markdown before deployment.
</Collapsible>
</CollapsibleGroup>
```

### What gets published?

The build includes public pages in the selected publication.

### Can I preview first?

Yes. Build locally and review the HTML and Markdown before deployment.

Put rich content inside each child. Other direct children fail the build. Groups do not enforce a single open item.

## HTML, Markdown, and agents

Individual disclosures and grouped items use native `details` and `summary`, so they work without JavaScript. Every body is present in the initial HTML even when closed.

Markdown writes every title as a heading followed by its full body in source order. The group wrapper adds no extra heading or repeated text. An agent can read all details without opening a control.

## Related reading

### Often confused with

- [Tabs](https://www.shoalrun.com/author/components/tabs.md) — A collapsible hides optional detail behind one summary; tabs switch between alternate views of the same content.

- [Short definitions](https://www.shoalrun.com/author/components/info-hint.md) — A short definition contains plain text; a collapsible holds longer rich content.
