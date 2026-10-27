---
id: guide.component.only
title: Content for one format
summary: Use Only to add content to the HTML page or its Markdown twin alone.
type: reference
area: components
subarea: components-procedures
canonical: /author/components/only
---

# Content for one format

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Content for one format

**Updated: 2026-10-26.**

Use `<Only>` to author content for one output format. Shared material stays outside the blocks; a block can contain an instruction, explanation, example, or link that serves only one version:

```mdx
Shared setup steps appear in both formats.

<Only format="html">

Choose a tab below to inspect a response.

</Only>

<Only format="markdown">

The response examples follow as labeled sections.

</Only>
```

The example below is live. This HTML page shows the first sentence; [its Markdown twin](https://www.shoalrun.com/author/components/only.md) shows the second.

The same mechanism can hold a larger section. An HTML section might teach through a visual walkthrough. Its Markdown counterpart can provide file paths and a command sequence for an agent. Each version should give its reader enough to complete the task, and shared product facts should stay consistent.

This sentence appears only in the Markdown twin.

## HTML, Markdown, and agents

An agent that fetches the direct `.md` URL, or requests this page with `Accept: text/markdown` on a host that supports [content negotiation](https://www.shoalrun.com/publish/content-negotiation.md), receives the shared text and `format="markdown"` blocks. It does not receive `format="html"` blocks. For the live example above, the relevant Markdown line is:

```md
This sentence appears only in the Markdown twin.
```

The build validates the contents of both blocks, including their links and supported components. `<Only>` needs block content and exactly one literal `format` attribute: `html` or `markdown`. Dynamic expressions and other values fail the build.

Keep facts, warnings, and task steps that both readers need outside `<Only>`, or provide suitable versions in both formats. You can add or suppress content in either output when that helps its intended reader. Check that each version remains accurate and usable for its task; see [Shoalrun's position on shared and format-specific content](https://www.shoalrun.com/publish/agent-friendliness.md). The browser search index uses the HTML output, so Markdown-only text is not included in that search. See [publishing and agent representations](https://www.shoalrun.com/publish/output.md) for the full output contract.

## Related reading

### Related topics

- [Content negotiation](https://www.shoalrun.com/publish/content-negotiation.md) — Write instructions that apply to only the HTML page or only the Markdown twin.

### Often confused with

- [Tabs](https://www.shoalrun.com/author/components/tabs.md) — Tabs show alternate views to every reader; Only limits content to the HTML page or its Markdown twin.
