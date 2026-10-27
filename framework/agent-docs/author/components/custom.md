---
id: guide.custom-components
title: Custom components
summary: Register trusted component plugins with shared HTML and Markdown content.
type: reference
area: components
subarea: components-custom
canonical: /author/components/custom
---

# Custom components

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Configure and customize > Custom components > Overview

**Updated: 2026-10-26.**

A component package adds a custom component, such as `<CopyText>`, that authors can use in their pages. Its `content()` function produces the content shown in both HTML and Markdown. An optional browser module adds interactive behavior.

## Use a component

Install the component package and add its exported manifest to your configuration. For a local component, register its manifest path:

```yaml
components:
  - ./components/copy-text/components.json
```

An installed package can export its manifest as its entry point, or as a subpath such as `@acme/docs-components/shoalrun`. Replace that illustrative name with your installed package's export. Paths resolve relative to the configuration file that declares them, including includes and presets.

The page supplies the content:

```mdx
<CopyText>
Contact support@example.com for help.
</CopyText>
```

Contact <support@example.com> for help.

`CopyText` requires child content and accepts no attributes. Its copy button is optional browser behavior. Markdown retains the authored text:

```md
Contact <support@example.com> for help.
```

## Develop a component

The package's manifest declares its names and implementation files. Consumers register this manifest once; they do not configure its internal browser files:

```json
{
  "apiVersion": 1,
  "components": {
    "CopyText": {
      "module": "./plugin.mjs",
      "browser": "./browser.jsx"
    }
  }
}
```

Each component needs `module`. `browser` and a `styles` list are optional. These paths are relative to the manifest. Names start with an uppercase letter, contain only letters and digits, and must be unique across registrations. They cannot replace built-ins.

The complete build module for the small example passes the page's children through unchanged:

```js
import { defineComponent } from '@shoalrun/cli/components';
export default defineComponent({
  children: 'required',
  content({ children }) { return children; }
});
```

A component that generates documentation uses the supported `content` helpers:

```js
import { defineComponent, content as c } from '@shoalrun/cli/components';

export default defineComponent({
  attributes: { label: { type: 'string', required: true } },
  children: 'required',
  content({ attributes, children }) {
    return [c.paragraph(c.strong(attributes.label)), children];
  }
});
```

Helpers include `paragraph`, `strong`, `emphasis`, `inlineCode`, `code`, `heading`, `link`, `list`, `table`, `group`, and `component`. They create shared content without requiring compiler-node objects. `component` composes an existing Shoalrun component using its documented attributes. Raw HTML and representation filters are unsupported.

`content()` is required. A missing function or empty result fails with a diagnostic; there is no separate HTML-only renderer. It receives validated attributes and the authored children. It runs once per invocation before either output is rendered.

## Attributes and children

Attribute schemas define the values page authors may supply:

| Setting                 | Meaning                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `type`                  | `string`, `boolean`, or `number`.                             |
| `required`              | Whether the attribute must be present when it has no default. |
| `default`               | A value matching the declared type and constraints.           |
| `values`                | Allowed string values.                                        |
| `min`, `max`, `integer` | Optional numeric constraints.                                 |

Booleans accept a bare attribute or quoted `"true"` and `"false"`. Numbers use quoted literals such as `attempts="4"`. Dynamic expressions are unsupported. Unknown or duplicate attributes fail. The TypeScript API infers attribute types from the schema.

`children` is `none` by default, or `optional` or `required`. Return the supplied children to preserve page-authored content. Use `content.component` to compose built-ins with more specific child rules.

## Browser data and behavior

For an interactive component, resolve its model in `content()` and return both shared documentation and browser data:

```js
content({ attributes }) {
  const policy = makePolicy(attributes);
  return {
    content: describePolicy(policy),
    data: policy
  };
}
```

`makePolicy` and `describePolicy` represent your component's model and content functions. `data` must contain only JSON values. Shoalrun snapshots it per invocation and gives that same data to the browser. Do not recover data by parsing tables or matching display labels. Import shared validation and calculation functions into both implementations when they need the same behavior.

The browser module exports an enhancement function:

```js
export async function enhance({ root, controls, content, data }) {
  // Mount optional controls into the empty controls element.
  // Read the instance model from data, not from presentation markup.
  // Keep the shared documentation in content intact.
  // Reveal controls after mounting; return when the interface is ready.
}
```

`root` contains this component instance; `content` contains its rendered documentation. React can mount into `controls`. Browser behavior enhances the shared documentation; this is not an arbitrary React renderer or an MDX import mechanism. If enhancement fails or JavaScript is disabled, shared content remains readable.

The [data-driven React fixture](https://www.shoalrun.com/author/components/custom/react.md) exercises the explicit model handoff and shared calculation module.

## Dependencies and assets

Write ordinary JavaScript or TypeScript imports in the build module and JavaScript, TypeScript, or JSX in the browser module. Shoalrun compiles them and tracks their imported source, JSON, and package metadata. Component packages declare their own dependencies, including React when used. There is no separate browser-bundle step for consumers.

Imported local JSON supplies build data. Module imports must be statically resolvable; remote plugins and build-time fetching are outside the supported contract. Styles must be self-contained CSS files listed in the manifest. Existing content components such as `Image` retain their own asset rules; local image paths are relative to the authored page.

Browser output uses deduplicated content-based asset URLs. Imported modules, data, manifests, and styles participate in rebuilds and isolated validation. Changes to imports invalidate earlier validation evidence. A failed build preserves the last successful output.

Configured modules execute trusted code with build-process permissions. Browser modules run with the site's page permissions. Neither is sandboxed. Isolated validation compiles the captured dependency graph and executes the build module inside that captured project.

## HTML, Markdown, and agents

Shoalrun renders the same shared documentation into both formats. Authors remain responsible for whether it adequately explains the component. A calculator typically needs its inputs, formula, limits, a default worked example, and qualifications; it does not need every possible numeric state enumerated.

Page content, links, warnings, and code must remain available without browser interaction. Shared content participates in normal search, links, section extraction, digests, and artifact generation. Check the component's own behavior and meaning in both outputs, including keyboard use and no-JavaScript fallback.

## Use the component-authoring skill

`shoalrun-component-author` guides an agent to implement the component's content, optional browser behavior, package manifest, and focused fixtures. The agent uses its own model and normal editing tools. Framework registration and dependency conformance are tested by Shoalrun; the component's tests should focus on its own content and behavior.

From the consumer project, validate a fixture and inspect the returned report:

```sh
shoalrun docs validate --config docs.config.yaml --file content/component-example.mdx
shoalrun docs review <report> --format markdown
shoalrun docs preview <report> --port 0
```

The skill does not publish the result or infer a static explanation from arbitrary React. See [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) for installation and invocation.

## Related reading

### Next steps

- [Check working-tree documentation edits](https://www.shoalrun.com/author/workspace.md) — Validate component fixtures and review matching HTML and Markdown snapshots. (Status: experimental.)

- [Data-driven React components](https://www.shoalrun.com/author/components/custom/react.md) — Add local data and generated documentation to a React interface.

### Reference while working

- [Publishing and agent representations](https://www.shoalrun.com/publish/output.md) — Check the published content and artifacts available to readers and agents.
