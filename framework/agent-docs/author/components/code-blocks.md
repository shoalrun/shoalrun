---
id: guide.component.code-blocks
title: Code blocks
summary: Write fenced examples and configure Shiki or another highlighter.
type: reference
area: components
subarea: components-code
canonical: /author/components/code-blocks
---

# Code blocks

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Code blocks

**Updated: 2026-10-26.**

Fenced code is ordinary Markdown rather than an MDX component. It belongs in the component reference because authors use it beside components to show commands, configuration, and payloads.

## Syntax

````md
```yaml title="Frontmatter fields" filename="config/frontmatter.yaml"
fields:
  agent.intent:
    type: string
```
````

```yaml title="Frontmatter fields" filename="config/frontmatter.yaml"
fields:
  agent.intent:
    type: string
```

| Fence option                         | Required | Meaning                                                                    |
| ------------------------------------ | -------- | -------------------------------------------------------------------------- |
| Language, such as `yaml`             | No       | Chooses a build-time highlighting grammar; unknown languages remain plain. |
| `title="Frontmatter fields"`         | No       | Shows a descriptive heading above the HTML block.                          |
| `filename="config/frontmatter.yaml"` | No       | Shows a file path beside the title.                                        |

Use `title`, `filename`, both, or neither. Existing fences that use `title` for a path still display that text. Code, title, and filename are available before browser scripts run. HTML adds a Copy button when clipboard access is available; it copies the original text without syntax markup. Long blocks scroll horizontally. The Markdown twin keeps both options on the original fence. The settings below explain Shiki, themes, plain code, and custom adapters.

## Highlighting with Shiki

Shoalrun highlights fenced code and OpenAPI example panels while building the site. Shiki is the default provider, with the `site` theme. The HTML already contains the colored code before browser scripts run. The Markdown twin keeps the original fenced text. Language labels, filenames, and copy controls are covered above.

### Configure Shiki

Add this to the root config or an imported `outputs` fragment:

```yaml
outputs:
  html:
    highlighting:
      provider: shiki
      theme: site
```

The default is equivalent to that configuration. The `site` theme takes code colors from the site [palette](https://www.shoalrun.com/styling/palettes.md). Keywords use the accent color. Strings, numbers, and functions use the palette's green, amber, and blue. Code colors change with the palette, including in the [theme previewer](https://www.shoalrun.com/styling/try.md). A color below 4.5:1 contrast on the code background falls back to plain code text.

To use a theme you know from your editor, set `theme` to a bundled Shiki theme name, such as `github-dark`, `dracula`, or `one-dark-pro`. A dark theme sets the syntax colors, and the palette still sets the block background so it matches the toolbar. A light theme, such as `github-light`, sets both its colors and its background. [Shiki's theme list](https://shiki.style/themes) shows available names. Site typography and surrounding colors still come from [CSS tokens](https://www.shoalrun.com/author/css.md). An unknown theme fails the build.

The built-in grammars are JSON, YAML, shell, JavaScript, TypeScript, Python, HTML, CSS, MDX, Markdown, HTTP, XML, SQL, Go, Java, Ruby, C#, PHP, and Rust. Shiki also recognizes loaded aliases such as `sh` and `js`. Unknown or unlabeled code stays plain. JSON-compatible API examples use JSON highlighting; text media currently use plain text.

### Choose plain code

```yaml
outputs:
  html:
    highlighting:
      provider: none
```

`none` keeps code readable without syntax colors. Shiki is loaded only when its provider is selected. Code titles, scrolling, and copy behavior still work.

### Use a custom highlighter

```yaml
outputs:
  html:
    highlighting:
      provider: custom
      module: ./highlight.mjs
```

The module path is relative to the config fragment that declares it. Export a synchronous function that returns flat text tokens. Each token may have a hexadecimal color:

```javascript
export function highlight(code, language) {
  // Replace this with tokens from your preferred highlighter.
  return [{ text: code, color: "#e4f2e9" }];
}
```

The adapter may import an installed library and initialize it with top-level await. Its `highlight` function must be synchronous. Tokens must reproduce the source code exactly, including whitespace, and colors must use `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`. The framework validates tokens and escapes HTML; the adapter does not return raw HTML. Invalid tokens or changed text fail the build. The same adapter handles authored fences and API example panels. The entry module appears in the dependency manifest, while its own imports are not tracked individually.

## HTML, Markdown, and agents

Highlighted code remains selectable without JavaScript. Blocks scroll horizontally without widening the page. Keyboard users can focus a long block to scroll it. The Copy button appears when the browser supports clipboard access in a secure context such as HTTPS or localhost. It copies the original code text rather than the colored spans. Without clipboard access, readers can select and copy manually.

The Markdown twin keeps the original fenced code, language, title, and filename. An agent reading it receives the complete source text without syntax-color markup or the Copy control.

The [publishing guide](https://www.shoalrun.com/publish/output.md) explains where HTML and Markdown outputs are written.

## Related reading

### Reference while working

- [CSS and theme reference](https://www.shoalrun.com/author/css.md) — Look up the code color tokens and selectors.

### Related topics

- [Walkthroughs](https://www.shoalrun.com/author/components/walkthroughs.md) — Walkthroughs build on code blocks to explain an example one step at a time.
