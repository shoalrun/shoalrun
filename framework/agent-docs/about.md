---
id: guide.about
title: About Shoalrun
summary: Learn what Shoalrun is exploring and where the private prototype stands.
type: overview
area: project
subarea: project-overview
canonical: /about
---

# About Shoalrun

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

**Updated: 2026-10-25.**

I'm CT Smith, and I'm building Shoalrun cause there's no such thing as a perfect doc tool. I have opinions, undirected rage, and curiosity about doc-building tools. I built my first documentation generator back in 2015. It was based on Jekyll and relied heavily (probably too heavily) on general templating and... you guessed it... *page metadata*.

Shoalrun is part art project, part portfolio piece, and part laboratory. I use it to push the limits of content and tooling in whatever domain I'm working in.

I had a lot of sources of inspiration (both negative and positive) from my years as a tech writer and tooling lover. I wanted to build something maximally flexible that also could keep things on the rails. I wanted something that uses frontmatter for deterministic features that *feel* like AI. I also wanted to play with what a BYO search and chat hookup could look like. And also leave room for others to use as much AI as they want.

I wanted to chew on how to give human and AI readers content that works for them without cognitive—or contextual???—overload. No, I'm not saying AI has true cognition; stick with me here. I want flashy interactive components that help humans understand a concept. I also want agents to get the useful information without the extra junk—and WITHOUT extra authoring work.

I centered the design with this project around making everything for two audiences: humans and agents. Not one above the other because it's honestly trivial to give them both what they need.

I guess the more polished marketing-friendly summary is:

> One source can serve different readers without fuss. Shoalrun lets authors shape the browser experience and choose what enters agent-facing Markdown. Authors can add content for one format when readers need different explanations. The framework also provides settings and extension points for the rest of a documentation site.

## What makes Shoalrun special

What interests me most is the interconnectedness that comes from treating information as a first-class object. Each doc has its own identity, metadata, and relationships. Its stable ID connects links, navigation, cards, and related reading, so I can move the source file without breaking those connections. [See how Shoalrun works](https://www.shoalrun.com/concepts.md).

I want config to be composable, too. I can keep navigation, API sources, templates, and other settings in small YAML files. Includes and presets combine them; I can trace each value's source. The project can grow without forcing every concern into one config file. [See configuration composition](https://www.shoalrun.com/configuration.md).

Presenting and linking content for humans and agents are first-class features. A rich component has an explicit form in both the browser and the page's Markdown twin. The build can turn one accepted source into interactive HTML, agent-readable Markdown, `/llms.txt`, and a document manifest. It rejects unsupported dynamic MDX instead of silently dropping content. Authors can still write a section for just one output when that reader needs a different explanation. [See agent-friendly output](https://www.shoalrun.com/publish/agent-friendliness.md).

This structure also makes workflows easier to connect. An ingredient can be reused in a complete recipe, and a cookbook can assemble the reviewed recipes a reader selects into one path. [See recipes and cookbooks](https://www.shoalrun.com/author/recipes.md).

API content follows the same approach. Local OpenAPI files can supply reference pages, examples, and focused contracts for individual operations. A public build requires a review digest for imported API content, so a changed source returns to review before publication. [See API review](https://www.shoalrun.com/publish/api-references.md).

I'm building Shoalrun for tinkerers like me, who will never be fully satisfied with a mass market docs tool. Docs are never one-size-fits-all, on any level.

As for project's current status and future -- right now, only this documentation site is public. The compiler and CLI remain private prototype code and are not available to install.

yee haw forever,

CT
