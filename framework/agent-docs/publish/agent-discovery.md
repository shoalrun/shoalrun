---
id: guide.agent-discovery
title: Configure the agent discovery block
summary: Choose how early HTML guidance appears, customize its wording, and
  verify its links.
type: how-to
canonical: /publish/agent-discovery
---

# Configure the agent discovery block

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Configure the agent discovery block

**Updated: 2026-10-15.**

Configure the early HTML guidance so readers and agents can find the article, Markdown twin, and documentation index. Work in an existing Shoalrun project with a working local build.

## Choose the presentation

Set `site.agentDiscovery` to change the early HTML instruction. The default `mode: focus` hides it visually until keyboard focus enters its links. Choose `visible` for an always-shown banner, or `disclosure` for a compact **For agents** toggle in the header that starts closed. All three modes include the guidance links in the HTML source. Choose `off` to omit the block from HTML entirely.

The mode controls visual presentation and whether the block is included. Screen readers and agents parsing raw HTML can encounter the guidance in both `focus` and `visible` modes. The disclosure uses native HTML `details` and `summary`, so it works without JavaScript. Agents using screenshots see the same visual presentation as humans and need to open the disclosure to see its links. Some HTML extraction tools discard visually hidden elements; the document head also provides discovery links. This setting does not control access to documentation or make the guidance private.

## Set the message and link labels

```yaml title="docs.config.yaml"
site:
  title: Cedar Parcel documentation
  agentDiscovery:
    mode: disclosure
    label: For agents
    message: Use Markdown for complete examples and nested schemas.
    links:
      article: Jump to the article
      index: Browse documentation
      markdown: Read Markdown
```

The message and labels are plain text. Shoalrun generates the article, index, and Markdown destinations, including the site's base path. The standard **Skip to content** link stays first, even with the agent block disabled. The index destination is the compact text index, `/llms.min.txt`. It links to full Markdown pages and author-declared standalone sections with sizes and full-page fallbacks. The HTML head’s `rel="describedby"` link and each Markdown page’s index backlink use the same compact index, including when the visible block is off. The detailed `/llms.txt` index remains linked from the compact index. These settings affect HTML only; the Markdown index link and discovery files remain available.

See the [configuration reference](https://www.shoalrun.com/config.md) for defaults and validation rules.

## Build and check the result

Run these commands from the directory containing `docs.config.yaml`:

```sh
shoalrun check docs.config.yaml
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist --port 8765
```

Open a documentation page at `http://127.0.0.1:8765/`. With `focus`, press Tab until the guidance links receive focus and the block appears. With `visible`, confirm the block appears before focusing it. With `disclosure`, confirm the header toggle starts closed, opens with Enter or a click, and exposes working links. With `off`, confirm the block is absent and **Skip to content** still works.

Follow the article, index, and Markdown links. The article link should move focus to the main content; the index should open `/llms.min.txt`, and the Markdown link should open the current page's `.md` twin. A configured base path prefixes the generated resource URLs.

View the HTML source to confirm that all three enabled modes include the links. The Markdown twin and discovery files should remain available in all three modes. If labels or destinations look wrong, check `site.agentDiscovery` in the resolved config and rebuild. Stop the server with **Ctrl+C** when finished.

## Copy the page as Markdown

Use **Copy as Markdown** beside **Read as Markdown** to copy the current page's published Markdown twin. The button fetches the full file, including metadata and all reader-labeled sections, regardless of the selected HTML reader view. It uses the page's publication and base path.

Activate the button with Enter, Space, or a tap. A visible status announces success or failure to screen readers. If fetching or clipboard access fails, use **Read as Markdown** to open and copy the file manually. The plain link also works without JavaScript; the copy button appears when its script loads. Browser clipboard access requires a secure context and permission.

## Related reading

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up discovery modes, defaults, labels, and validation rules.

### Related topics

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — Understand how HTML guidance, Markdown, and discovery files serve different readers.
