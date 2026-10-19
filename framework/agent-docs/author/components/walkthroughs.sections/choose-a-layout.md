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
