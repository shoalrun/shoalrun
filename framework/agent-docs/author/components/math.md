---
id: guide.component.math
title: Math
summary: Render inline and display LaTeX expressions at build time.
type: reference
area: components
subarea: components-visuals
canonical: /author/components/math
---

# Math

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Math

**Updated: 2026-10-19.**

Use `<Math>` with a literal LaTeX expression. It supports the KaTeX math subset and reports invalid expressions during the build.

```mdx
Energy is <Math expression="E=mc^2" />.

<Math display expression="c^2=a^2+b^2" />
```

Energy is `E=mc^2`.

```latex
c^2=a^2+b^2
```

`expression` is required and nonempty. Add the bare `display` attribute on a block element for centered display math. The component does not parse dollar delimiters in ordinary prose or code fences. Escape quotes in MDX attributes as needed.

## HTML, Markdown, and agents

HTML contains build-time MathML with the source expression as an annotation. The expression remains available to assistive technology without client JavaScript. Markdown keeps inline expressions as code and display expressions in a `latex` code block. An agent can read the original LaTeX in either form. Check complicated notation with the screen readers your readers use.
