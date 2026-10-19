---
id: reference.glossary
title: Glossary
summary: Look up documentation, publishing, search, and agent terminology, with
  links to the relevant guides.
type: reference
area: project
subarea: project-overview
canonical: /glossary
---

# Glossary

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Glossary

**Updated: 2026-10-19.**

This page defines the terms used across Shoalrun's documentation. Look a term up when a guide uses a word you don't know. Terms are sorted A to Z, and each definition links to the full guide. Filter the list by a term or a word in its definition, for example `publication` or `agent`. In the Markdown version, use your reader's Find command. To see how the main terms fit together, read [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **`$concat`**

  A directive that adds items to a list inherited through `extends`. See [Configuration reference](https://www.shoalrun.com/config.md).

- **`$include`**

  A directive that replaces a value with the contents of another YAML file. Paths are relative to the file that uses it. See [Configuration reference](https://www.shoalrun.com/config.md).

- **`$remove`**

  A directive that drops inherited mapping keys, or list items by `id`. It fails when nothing is inherited. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Access policy**

  The `access.policy` field. `public` puts a page in the build. Any other value, such as `draft`, keeps it out. It does not control who can read a published page. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **AFDocs**

  An external scorecard for agent-friendly documentation used in development checks. See [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md).

- **Agent intent**

  A self-reported category describing why an agent called an MCP tool. Optional analytics can record allowed categories; it does not reveal private model reasoning. See [MCP analytics](https://www.shoalrun.com/publish/mcp-analytics.md).

- **Agent skill**

  Packaged instructions that help an existing agent set up or maintain a Shoalrun project. A skill guides the workflow; documentation tools provide reference lookups. See [Bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md).

- **Alt text**

  Text describing an image for readers who cannot see it. `<Image>` requires `alt`; `alt=""` marks a decorative image for screen readers to skip. See [Images](https://www.shoalrun.com/author/components/images.md).

- **Analytics adapter**

  A project module that sends supported browser or MCP events to your chosen service. Each integration is optional and off by default. See [browser analytics](https://www.shoalrun.com/author/analytics.md) and [MCP analytics](https://www.shoalrun.com/publish/mcp-analytics.md).

- **Answer cache**

  Temporary storage for checked answers in a running chat server. Matching repeated questions can reuse them while their source passages remain current. It is separate from prepared answer cards. See [Answer checks and reuse](https://www.shoalrun.com/chat/checks.md).

- **Answer card**

  A reviewed answer to a common question, generated ahead of time with `shoalrun answers` using a chat model. A confirmed match serves it without a new chat-model answer, though matching uses an embedding provider and scorer. It is not a page-preview card. See [Prepared answers](https://www.shoalrun.com/chat/prepared-answers.md).

- **API catalog**

  The `/.well-known/api-catalog` file, a linkset that points an API endpoint to its OpenAPI description. It needs a discovery endpoint and the site origin. See [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md).

- **`ApiExample`**

  A component that copies a named example from an OpenAPI source into a guide. See [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md).

- **`ApiSchema`**

  A component that includes a request body, response body, object, or single field from an OpenAPI source. See [ApiExample and ApiSchema](https://www.shoalrun.com/author/components/api-embeds.md).

- **API source**

  An entry in `apis` that points to a local OpenAPI file. `kind: file` is the only supported kind. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Audit**

  The `shoalrun audit` command. It runs configured tests, audits OpenAPI sources, builds the site, and checks focused contracts. See [Audit a docs project](https://www.shoalrun.com/publish/audit.md).

- **Authored reference**

  An API reference page you write in MDX. The build adds the operation details below your text. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Authoring guidance**

  Project editorial instructions, writing-guide paths, and reviewed examples that help an agent follow team conventions. See [writing guides](https://www.shoalrun.com/author/design-writing-guides.md).

- **Automatic footer**

  A list that the build adds to the end of a page without a relationship. Examples are Related documentation and Related API references. See [Related reading](https://www.shoalrun.com/author/related-reading.md).

- **Base path**

  The `site.basePath` setting. It prefixes public page and resource URLs, including assets, search, API downloads, and discovery files. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Build**

  The `shoalrun build` command. It compiles a site into an output directory and replaces that directory. See [CLI reference](https://www.shoalrun.com/cli.md).

- **Build provenance**

  The `/build-info.json` file. It records the config digest and, when you pass them, a source commit and release label. See [Publishing and agent representations](https://www.shoalrun.com/publish/output.md).

- **Bundled docs**

  The documentation snapshot shipped with an installed Shoalrun package. Local CLI reads and the local documentation MCP server use it without fetching the live site. See [CLI reference](https://www.shoalrun.com/cli.md).

- **`Callout`**

  A component that highlights a short message. It has a type and an optional label. See [Callouts](https://www.shoalrun.com/author/components/callout.md).

- **Callout tone**

  The line, background, and text colors of a callout type. Five tones are built in, and you can register more. See [Callouts](https://www.shoalrun.com/author/components/callout.md).

- **Callout type**

  The purpose of a callout: `note`, `tip`, `important`, `warning`, `caution`, or a type you register. See [Callouts](https://www.shoalrun.com/author/components/callout.md).

- **Card**

  A linked preview of another page. It shows the target's title and summary and follows the target's current URL. It is not an [answer card](https://www.shoalrun.com/chat/prepared-answers.md). See [Cards and collections](https://www.shoalrun.com/author/components/cards.md).

- **Changelog identifier**

  The `frontmatter.changelogIdentifier` rule. It decides whether a changelog entry is identified by date, release version, or either. See [Release notes and changelog](https://www.shoalrun.com/author/release-notes.md).

- **Channel**

  An audience or environment, such as `production` or `sandbox`. It is one third of a publication. See [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **Chat answer**

  A response written from retrieved passages by a chat model, with citations. It differs from a search result, which links to a page or section. See [Ask your documentation](https://www.shoalrun.com/chat.md).

- **Choice ID**

  The stable ID of one option in a reader-view facet, such as `developer`. Pages and sections refer to choice IDs. See [Reader views](https://www.shoalrun.com/author/reader-views.md).

- **Code fence**

  A fenced code block. Options such as `title` and `filename` add a heading and a file path. See [Code blocks](https://www.shoalrun.com/author/components/code-blocks.md).

- **`Collapsible`**

  A native disclosure for optional detail. Its full body remains in the initial HTML and the Markdown twin. See [Collapsibles](https://www.shoalrun.com/author/components/collapsible.md).

- **`CollapsibleGroup`**

  A wrapper that joins related `Collapsible` items without gaps. Items open independently, and Markdown contains every title and body. See [Collapsibles](https://www.shoalrun.com/author/components/collapsible.md).

- **Collection**

  A set of cards found by filters such as type, tag, operation, or audience. It updates on each build. See [Cards and collections](https://www.shoalrun.com/author/components/cards.md).

- **Color mode**

  The `theme.mode` setting: `light`, `dark`, or `system`. `system` follows the reader's device and can show a toggle. See [Light and dark mode](https://www.shoalrun.com/styling/color-modes.md).

- **Compiler**

  The part of Shoalrun that turns config, pages, and OpenAPI files into HTML, Markdown, and manifests. See [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **Confidence gate**

  The `chat.gate` setting. Two scores, `decline` and `hedge`, decide whether the chat answers, answers with a caveat, or lists the closest pages. See [Check and speed up answers](https://www.shoalrun.com/chat/checks.md).

- **Config digest**

  A SHA-256 hash of the fully resolved config. `config validate` prints it and `/build-info.json` records it. See [CLI reference](https://www.shoalrun.com/cli.md).

- **Config preset**

  A base config file listed in a top-level `extends`. Later files override earlier ones. Don't confuse it with a theme preset. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Content directory**

  The folder set by `site.contentDir`, `content` by default. Shoalrun reads every `.md` and `.mdx` file in it, drafts included. See [Content and stable IDs](https://www.shoalrun.com/author/content.md).

- **Content negotiation**

  Returning the Markdown twin at a page's usual URL when a request sends `Accept: text/markdown`. The host must do it. See [Content negotiation](https://www.shoalrun.com/publish/content-negotiation.md).

- **Contrast check**

  A build check that palette colors meet WCAG 2.2 contrast. A failing pair stops the build. See [Color palettes](https://www.shoalrun.com/styling/palettes.md).

- **Cookbook**

  A page that helps readers choose among complete published recipe pages. Its introduction is authored separately; an optional chooser loads selected recipe instructions in the browser. It does not assemble ingredients or execute tasks. See [How recipes and cookbooks work](https://www.shoalrun.com/author/recipes.md).

- **Curated list**

  A set of cards you choose by ID and order, using `DocCards`. See [Cards and collections](https://www.shoalrun.com/author/components/cards.md).

- **Custom field**

  A frontmatter field your project declares in `frontmatter.fields`. The declaration lives in config and the value lives on the page. See [Customize page metadata](https://www.shoalrun.com/author/custom-metadata.md).

- **D2**

  A diagram language supported by the `Diagram` component. Shoalrun renders separate light and dark SVG assets during the build. See [Diagrams](https://www.shoalrun.com/author/components/diagrams.md).

- **Default (frontmatter)**

  A value in `frontmatter.defaults` that a page inherits and can replace. See [Customize page metadata](https://www.shoalrun.com/author/custom-metadata.md).

- **Default publication**

  The channel, version, and language in `publications.defaults`. Each API's top-level source belongs to it. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Deployment check**

  A script that tests a live site for Markdown twins, headers, discovery files, and 404 behavior. See [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md).

- **Description**

  An optional `description` field with fuller text than the summary. A project chooses where it appears. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **Design token**

  A named styling value, such as the CSS custom property `--color-accent`. Themes, palettes, and project CSS use these values to style the site. See [CSS reference](https://www.shoalrun.com/author/css.md).

- **Dev server**

  The `shoalrun dev` command. It builds, serves, watches for changes, and refreshes open pages. See [CLI reference](https://www.shoalrun.com/cli.md).

- **`Diagram`**

  A component that renders D2 or Mermaid source to SVG at build time. The Markdown twin keeps the source. See [Diagrams](https://www.shoalrun.com/author/components/diagrams.md).

- **Direct excerpt**

  A passage the chat shows word for word instead of calling the model, when one passage clearly answers the question. See [Check and speed up answers](https://www.shoalrun.com/chat/checks.md).

- **Discovery endpoint**

  The public HTTPS API URL in `discovery.endpoint`. The API catalog links to it. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Discovery file**

  A file that helps agents find content. Examples are `/llms.txt` and the API catalog. See [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md).

- **Display text**

  The `displayText` field. It sets literal text for one output, such as a card, the page header, search, or a social preview. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **`DocCard`, `DocCards`, `DocCollection`**

  Components that show cards. `DocCard` shows one page, `DocCards` a curated list, and `DocCollection` a filtered set. See [Cards and collections](https://www.shoalrun.com/author/components/cards.md).

- **`DocLink`**

  A component that links to a page by ID. A `doc:` Markdown link does the same job. See [DocLink](https://www.shoalrun.com/author/components/doc-link.md).

- **`docs.config.yaml`**

  The entry config file. The CLI looks for this name by default. See [Understand and organize configuration](https://www.shoalrun.com/configuration.md).

- **Document manifest**

  The `documents.json` file. It lists every built page with its ID, URLs, publication, and content digest. See [Publishing and agent representations](https://www.shoalrun.com/publish/output.md).

- **Draft**

  A page excluded from normal public builds by its access policy. Review previews can render drafts for inspection. See [Create a page](https://www.shoalrun.com/author/add-page.md).

- **Edition badge**

  The label in the masthead that names the publication. `site.editionBadge` controls it. See [CSS and theme reference](https://www.shoalrun.com/author/css.md).

- **Embedding**

  A numeric representation of text. Shoalrun can embed passages after the site build so queries can match by meaning. See [Passage index](https://www.shoalrun.com/chat/passage-index.md).

- **Embedding space**

  The coordinate system in which passage and query vectors can be compared. The query model must share the stored passages’ space and dimension. See [Passage index](https://www.shoalrun.com/chat/passage-index.md).

- **Enabled publication**

  An entry in `publications.enabled`. The build makes pages only for enabled combinations. See [Share pages across versions](https://www.shoalrun.com/publish/publications.md).

- **Enforced value**

  A value in `frontmatter.enforced` that replaces whatever a page sets. Use it for values every page must share. See [Customize page metadata](https://www.shoalrun.com/author/custom-metadata.md).

- **Escalation**

  Asking a second chat model when checks flag an answer, then comparing the checked results. It differs from a fallback after a provider failure. See [Chat settings](https://www.shoalrun.com/chat/settings.md).

- **Example project**

  The `framework/example/` project used as a test fixture. It is not a deployed API. See [Example configs](https://www.shoalrun.com/config/examples.md).

- **`extends`**

  A top-level key that layers the current file over one or more config presets. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Extension mapping**

  A config rule that maps an operation-level `x-*` value to a Shoalrun status badge. See [OpenAPI extension mappings](https://www.shoalrun.com/publish/openapi-extension-mappings.md).

- **Eyebrow**

  A short label above a card title. It doesn't change the page type or filters. See [Cards and collections](https://www.shoalrun.com/author/components/cards.md).

- **Facet**

  A dimension for a reader view, such as audience or product. Each facet has a label and a set of choices. See [Reader views](https://www.shoalrun.com/author/reader-views.md).

- **Fallback**

  An alternative path used when a configured capability is unavailable. Search may return keyword results; chat can try another model or return page links, depending on its settings. See [Search and chat](https://www.shoalrun.com/search-and-chat.md).

- **Favicon**

  The site icon. Shoalrun draws one from the preset unless `site.favicon` names a file. See [Share images and favicon](https://www.shoalrun.com/styling/share-images.md).

- **`Field`, `Fields`**

  Components that write field lists in the same format as OpenAPI schemas. See [Fields](https://www.shoalrun.com/author/components/fields.md).

- **`FileTree`, `Tree`**

  Aliases for a file-and-folder hierarchy with expandable folders and optional links. Markdown retains every node, including files in closed folders. See [File trees](https://www.shoalrun.com/author/components/file-tree.md).

- **Focused contract**

  A generated OpenAPI JSON file for one operation and the schemas it needs. Tools use it instead of the full spec. See [Focused OpenAPI contracts](https://www.shoalrun.com/api-docs/focused-contracts.md).

- **Footer**

  The block below every page, set by `site.footer`. It can hold link columns, a bottom row of links, and a text line. See [Site footer](https://www.shoalrun.com/styling/footer.md).

- **ForPublication**

  A component that shows its content only in matching publications. Use it to vary one part of a shared page. See [Share pages across versions](https://www.shoalrun.com/publish/publications.md).

- **Fragment**

  A config file pulled in with `$include`. It holds one section, such as navigation or API sources. See [Understand and organize configuration](https://www.shoalrun.com/configuration.md).

- **Frontmatter**

  The YAML header at the top of a page. It holds the page's identity, publication, and presentation fields. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **`FrontmatterReference`**

  A component that publishes the project's frontmatter field inventory. See [Frontmatter field reference](https://www.shoalrun.com/author/frontmatter-reference.md).

- **Full source download**

  The whole OpenAPI file published on the site. `source.publish: true` turns it on. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Generated reference**

  An API reference page the build creates from `generateReferences`, with no MDX file. See [Generate and select API pages](https://www.shoalrun.com/api-docs/generate.md).

- **Generator**

  A navigation node with `generated: tags` or `generated: remaining`. It adds API reference pages by OpenAPI tag. See [Organize site navigation](https://www.shoalrun.com/author/navigation.md).

- **Global frontmatter**

  Shared page values set in the `frontmatter` block of project config. Precedence runs defaults, then the page, then enforced values. See [Customize page metadata](https://www.shoalrun.com/author/custom-metadata.md).

- **Group**

  A navigation node with a `label` and `items`. Groups can nest. See [Organize site navigation](https://www.shoalrun.com/author/navigation.md).

- **Harness**

  The application running an agent and its tools, such as a coding-agent client. Its reported name does not establish which model it uses. See [MCP client metadata](https://www.shoalrun.com/publish/mcp-analytics.md).

- **Header link**

  A link in the masthead, set under `site.header.links`. Its style is `link`, `button`, or `primary`. See [Header links](https://www.shoalrun.com/styling/header.md).

- **`Hero`**

  A component that opens a landing or splash page with a title, tagline, and action buttons. See [Page layouts](https://www.shoalrun.com/styling/layouts.md).

- **Host adapter**

  The glue that adds Shoalrun's files to another build or host so it serves them correctly. See [Add Shoalrun to another build or host](https://www.shoalrun.com/publish/host-adapters.md).

- **HTML, Markdown, and agents**

  A page section that explains the HTML and Markdown outputs and what an agent receives. Templates ask for it when it applies. See [Templates](https://www.shoalrun.com/author/templates.md).

- **Hybrid retrieval**

  Combining lexical and vector-ranked passage results. Chat uses it when vectors are available; the browser search uses semantic ranking with a lexical fallback. See [Search and chat](https://www.shoalrun.com/search-and-chat.md).

- **ID (document ID)**

  The stable identity of a page, such as `guide.concepts`. Links, cards, navigation, and relationships use it, so you can rename the file or slug freely. See [Content and stable IDs](https://www.shoalrun.com/author/content.md).

- **`Image`**

  A responsive image component with required alt text and optional width, caption, and expanded viewing. Markdown retains the image description and caption. See [Images](https://www.shoalrun.com/author/components/images.md).

- **`InfoHint`**

  A short definition that readers expand with a click, tap, or keyboard using a native disclosure. See [Short definitions](https://www.shoalrun.com/author/components/info-hint.md).

- **Ingredient**

  A reusable source document containing instructions for one action or check. Authors can copy it into several recipe drafts with the recipe assembler. Optional workflow metadata declares inputs, outputs, prerequisites, and a success check; it does not execute the action. See [How recipes and cookbooks work](https://www.shoalrun.com/author/recipes.md).

- **Jev**

  The supported relevance-scoring protocol used by `chat.rerank`. A compatible service rates passage relevance and support for claims; it does not write the answer. See [Scorer settings](https://www.shoalrun.com/chat/settings.md).

- **JSON shape**

  A view of a request or response schema that uses type placeholders instead of real values. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Language**

  The content language of a publication, such as `en`. The default language has no route prefix. Shoalrun does not translate text. See [Share pages across versions](https://www.shoalrun.com/publish/publications.md).

- **Layout**

  The `layout` field. `docs` is the default. `wide` drops the on-page outline. `landing` removes the sidebar for home pages. `splash` is a full-bleed marketing page. See [Page layouts](https://www.shoalrun.com/styling/layouts.md).

- **Lexical retrieval**

  Finding matches by the words in a page or passage. It works without embeddings. See [Search and chat](https://www.shoalrun.com/search-and-chat.md).

- **`llms.txt`**

  A generated index of published Markdown pages, API downloads, and discovery files. See [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md).

- **Locale**

  An optional `locale` field for date, number, and currency conventions. It does not choose a publication. Use `language` for that. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **Local MCP**

  A documentation MCP server launched on your computer, such as `shoalrun docs mcp` over stdio. By default it reads the installed package’s bundled docs. See [MCP connections](https://www.shoalrun.com/publish/mcp.md).

- **Markdown metadata**

  The YAML header on a Markdown twin. Config selects which page values it holds. See [Choose Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

- **Markdown twin**

  The generated `.md` copy of a page, at the page route plus `.md`. Agents read it as text. See [Publishing and agent representations](https://www.shoalrun.com/publish/output.md).

- **Masthead**

  The header bar. It shows the site title, edition badge, search box, mode toggle, and header links. See [Header links](https://www.shoalrun.com/styling/header.md).

- **MCP**

  Model Context Protocol: an interface through which an agent client discovers and calls tools. Shoalrun exposes read-only documentation tools through local stdio and an optional HTTP endpoint. See [MCP connections](https://www.shoalrun.com/publish/mcp.md).

- **MCP client**

  An application that connects to an MCP server and exposes its tools to an agent. Configuring a client is separate from hosting a server. See [Connect a client](https://www.shoalrun.com/connect/mcp.md).

- **MCP endpoint**

  The HTTP address of a hosted documentation MCP server, such as this site’s `/mcp` endpoint. It requires a running server or host function; static files alone cannot serve it. See [Host an MCP endpoint](https://www.shoalrun.com/publish/mcp.md).

- **MDX**

  Markdown with components. Shoalrun accepts GitHub Flavored Markdown and its own component set. Unknown components and dynamic expressions fail the build. See [Component reference](https://www.shoalrun.com/author/components.md).

- **Mermaid syntax**

  A text notation for diagrams. Shoalrun renders supported Mermaid syntax with Pele during the build. See [Diagrams](https://www.shoalrun.com/author/components/diagrams.md).

- **Metadata profile**

  A named set of Markdown-header settings that a page can select with `markdownMetadata`. See [Choose Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

- **Metadata provider**

  A local module that supplies extra page fields at build time. It exports `provideMetadata`. See [Customize page metadata](https://www.shoalrun.com/author/custom-metadata.md).

- **Named example**

  An entry in an OpenAPI `examples` map. Reference pages show it, and `ApiExample` can embed it. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Navigation node**

  One entry in the sidebar. It has an `id` and exactly one of `doc`, `operation`, `generated`, or `items`. See [Organize site navigation](https://www.shoalrun.com/author/navigation.md).

- **Navigation tab**

  A top-level site section, such as Docs or Changelog, with its own navigation scope. It is separate from the in-page `Tabs` component. See [Navigation](https://www.shoalrun.com/author/navigation.md).

- **`Only`**

  A component that shows content in the HTML page or the Markdown twin alone. See [Content for one format](https://www.shoalrun.com/author/components/only.md).

- **Origin**

  The `site.origin` setting, the site's HTTPS origin. It makes preview URLs absolute and is required for the API catalog. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Page mark**

  The audience or reader-filter values on a page. They decide whether a reader view shows the page. See [Reader views](https://www.shoalrun.com/author/reader-views.md).

- **Page type**

  The free-text `type` field. Some values change behavior. An `api-reference` page must name exactly one operation. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **Palette**

  A set of light and dark color tokens. Built-in palettes are `kelp`, `coral`, `ink`, `harbor`, `amethyst`, and `vice`. See [Color palettes](https://www.shoalrun.com/styling/palettes.md).

- **Passage**

  A short, headed part of a built Markdown page. One page can produce several passages. See [Passage index](https://www.shoalrun.com/chat/passage-index.md).

- **Passage index**

  The `ai/chunks.json` file of text passages and source metadata used by retrieval. Optional embeddings are stored in separate files beside it. See [Passage index](https://www.shoalrun.com/chat/passage-index.md).

- **Path prefix**

  The `pathPrefix` on a channel or version. It becomes part of every route in that publication. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Pele**

  The renderer Shoalrun uses for supported Mermaid-syntax diagrams. It produces SVG during the build without launching Chrome. See [Diagrams](https://www.shoalrun.com/author/components/diagrams.md).

- **Placeholder**

  A scaffolded prompt written as `[[TODO:` followed by text and two closing brackets. A public page fails the build while one remains. See [Templates](https://www.shoalrun.com/author/templates.md).

- **Presence label**

  A field badge that says `always present` or `may be absent`. A separate `nullable` label says the value can be `null`. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Project CSS**

  The stylesheet named by `site.customCss`. It loads last, so it overrides the framework's styles. See [CSS and theme reference](https://www.shoalrun.com/author/css.md).

- **Projection**

  The `outputs.markdown.metadata` settings that pick which frontmatter values go into a Markdown header. See [Choose Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

- **Publication**

  One enabled combination of channel, version, and language. A page belongs to one or more publications. See [Share pages across versions](https://www.shoalrun.com/publish/publications.md).

- **Public field**

  A custom field declared with `public: true`. It can appear in a Markdown twin's header, but only if the output config selects it. See [Choose Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

- **Public review digest**

  The `publicReview.digest` value. It records that you reviewed the API content a public page can show. A missing or stale digest stops the build. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Query embedding**

  The vector made from a reader’s search or question. It must be compatible with the stored passage vectors. See [Passage index](https://www.shoalrun.com/chat/passage-index.md).

- **Query syntax rule**

  A `querySyntax` entry for an API that puts filters directly in the query string. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **`ReaderChoice`, `ReaderFilter`, `ReaderSection`**

  Components for reader views. Buttons and filters set a choice. A section shows only in matching views. See [Reader views](https://www.shoalrun.com/author/reader-views.md).

- **Reader mark**

  A page or section value that names which reader-view choices it belongs to, such as `audience: [authors]`. A page can have no mark and remain shared; marks narrow what a chosen view shows, not who can access the published content. See [Reader views](https://www.shoalrun.com/author/reader-views.md).

- **Reader view**

  A reader's saved choice of audience, product, or another facet. It narrows navigation, search, cards, and marked sections. It is not access control. See [Reader views](https://www.shoalrun.com/author/reader-views.md).

- **Recipe**

  A complete task page with setup, ordered instructions, and a final success check for a person or agent to follow. Authors can write it directly or assemble a draft from ingredient files. An assembled recipe is a snapshot that must be regenerated to pick up ingredient changes. See [How recipes and cookbooks work](https://www.shoalrun.com/author/recipes.md).

- **Redirect**

  An entry in `redirects` that sends an old URL to a page ID. It also redirects the old `.md` URL. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Reference page**

  The page that presents one API operation. Its ID must match the `reference` value in the API config. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Related reading**

  A block of authored links grouped by purpose. It draws on relationships in config. See [Related reading](https://www.shoalrun.com/author/related-reading.md).

- **`RelatedReading`**

  A component that shows the relationships declared for a page as links or cards. See [RelatedReading](https://www.shoalrun.com/author/components/related-reading.md).

- **Relationship**

  An authored link between two pages with a type and a reason. Types are prerequisite, next-step, reference, advanced, see-also, and not-confused-with. See [Related reading](https://www.shoalrun.com/author/related-reading.md).

- **Release label**

  A short public name for a build, set with `--release-label`. It appears in `/build-info.json`. See [CLI reference](https://www.shoalrun.com/cli.md).

- **Relevance scorer**

  A service that rates how well a passage answers a question. The chat uses it to reorder passages, decide whether to answer, and check claims. See [Retrieval and chat settings](https://www.shoalrun.com/chat/settings.md).

- **`resource-headers.json`**

  A generated file that lists the content types a host must send for Markdown and discovery files. See [Content negotiation](https://www.shoalrun.com/publish/content-negotiation.md).

- **Review candidate**

  A local build made by `api review`. You inspect it, then pin its digest. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

- **Revision**

  A Git branch, tag, or commit chosen as the source for a build. It doesn't select a publication. See [Git branches for separate sites](https://www.shoalrun.com/publish/revisions.md).

- **Route**

  The final URL of a page. It joins the base path, a language prefix, the channel and version prefixes, and the slug. See [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **Scaffold**

  The `shoalrun scaffold` command. It creates a draft page from a template. See [Create a page](https://www.shoalrun.com/author/add-page.md).

- **Schema version**

  The required `schemaVersion: 1` key in the root config file. See [Configuration reference](https://www.shoalrun.com/config.md).

- **Search index**

  The public `/search-index.json` file, with one record per page. Built-in site search, the local search command, and custom lexical fallbacks can read it. See [Site search](https://www.shoalrun.com/author/search.md).

- **Search provider**

  The browser module that retrieves results for the masthead search box. The built-in provider is lexical; a custom provider can call a service. See [Site search](https://www.shoalrun.com/author/search.md).

- **Section mark**

  A `ReaderSection` block that shows only in some reader views. The Markdown twin keeps every section. See [Reader views](https://www.shoalrun.com/author/reader-views.md).

- **Section resource**

  A generated Markdown file containing a qualifying section and its context. It supports bounded documentation reads and differs from a retrieval passage. See [Markdown sections](https://www.shoalrun.com/author/markdown-metadata.md).

- **Semantic retrieval**

  Finding passages by comparing a query embedding with passage embeddings, including paraphrases that share few words. See [Search and chat](https://www.shoalrun.com/search-and-chat.md).

- **SEO fields**

  The `seo.title` and `seo.description` fields. They override the browser title and meta description for one page. See [SEO and social previews](https://www.shoalrun.com/publish/seo.md).

- **Shared page**

  One source file that lists several publications in its frontmatter. It produces one page per publication. See [Share pages across versions](https://www.shoalrun.com/publish/publications.md).

- **Share image**

  A generated 1200 by 630 PNG that appears in link previews. Every page gets one. See [Share images and favicon](https://www.shoalrun.com/styling/share-images.md).

- **Shiki**

  The default code highlighter. It runs at build time, so colored code is in the HTML before any script runs. See [Code blocks](https://www.shoalrun.com/author/components/code-blocks.md).

- **`.shoalrun/` directory**

  A generated folder beside the config. It holds the frontmatter reference, its JSON Schema, and cached share images. Keep it out of Git. See [Frontmatter field reference](https://www.shoalrun.com/author/frontmatter-reference.md).

- **Sidebar filter**

  The menu filter that matches navigation labels and optional node-level `search` words. It does not change site search. See [Organize site navigation](https://www.shoalrun.com/author/navigation.md).

- **Site search**

  The masthead search box that returns page and section links. Its built-in provider uses the public page index. See [Site search](https://www.shoalrun.com/author/search.md).

- **Slug**

  The `slug` field, the page's URL path before any prefixes. It must start with `/`. The `/api` and `/.well-known` paths are reserved. See [Content and stable IDs](https://www.shoalrun.com/author/content.md).

- **Snippet**

  Shared prose registered in config and expanded into each page that includes it. See [Reusable snippets](https://www.shoalrun.com/author/snippets.md).

- **Social preview**

  The Open Graph tags and share image that link-preview services read. Set `site.origin` so their URLs are absolute. See [SEO and social previews](https://www.shoalrun.com/publish/seo.md).

- **Source `operationId`**

  The `operationId` in the OpenAPI file. Your config maps it to a stable operation ID. See [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **Stable ID**

  Another name for a page ID. Operations also have stable IDs, such as `notes.create`. See [Content and stable IDs](https://www.shoalrun.com/author/content.md).

- **Stable operation ID**

  Your own ID for an operation, such as `notes.create`. Pages and navigation use it, so it survives an OpenAPI rename. See [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **Standalone section**

  A section an author declares useful on its own. Documentation search can recommend reading its generated section resource when the query and eligibility rules match. See [Site search](https://www.shoalrun.com/author/search.md).

- **Stdio**

  A local process connection that sends MCP messages through standard input and output. No public web endpoint is needed. See [MCP connections](https://www.shoalrun.com/publish/mcp.md).

- **`Steps`, `Step`**

  Components for a numbered procedure with a title and body for each step. See [Steps](https://www.shoalrun.com/author/components/steps.md).

- **Subject lifecycle**

  The `subjectLifecycle` field. It marks the feature a page covers as `beta`, `in-development`, `experimental`, or `deprecated` and shows a badge. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **Summary**

  The required `summary` field, one short sentence. Cards, search, and previews use it by default. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **Synchronized tabs**

  Tab groups that share a named `sync` group and update matching choices on the same page. All alternatives remain in Markdown. See [Tabs](https://www.shoalrun.com/author/components/tabs.md).

- **`Table`**

  A component that adds a filter box or sticky headings to one long table. See [Tables](https://www.shoalrun.com/author/components/tables.md).

- **Table of contents depth**

  The `tocDepth` field. It sets the deepest heading in the on-page outline. `0` hides the outline. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **`Tabs`, `Tab`**

  Components for alternate views. The Markdown twin turns each tab into a heading. See [Tabs](https://www.shoalrun.com/author/components/tabs.md).

- **Tag**

  A short editorial label in the `tags` list. Collections use tags to find pages. See [Cards and collections](https://www.shoalrun.com/author/components/cards.md).

- **Template**

  A starting page for a new draft, with commented frontmatter and prompts. Editing it later doesn't change existing pages. See [Templates](https://www.shoalrun.com/author/templates.md).

- **Theme**

  The `theme` setting. It has a preset, a palette, a mode, a toggle, and fonts. See [Themes](https://www.shoalrun.com/styling/themes.md).

- **Theme preset**

  The shape of the site. Built-in presets are `shoal`, `reef`, `ledger`, and `vice`. See [Themes](https://www.shoalrun.com/styling/themes.md).

- **`ThemePreview`**

  A component that lets a reader try every preset, palette, and color mode on the page. See [Try a theme](https://www.shoalrun.com/styling/try.md).

- **`Timeline`, `Milestone`**

  Components for showing progress through an ordered process. See [Timelines](https://www.shoalrun.com/author/components/timeline.md).

- **Title**

  The required `title` field. It is the page heading and the default browser title. See [Page metadata](https://www.shoalrun.com/author/frontmatter.md).

- **Token**

  A unit of text counted by a model or tokenizer. Token budgets limit how much text a tool or model processes; a token is not necessarily a word. For styling values, see Design token. See [CLI token limits](https://www.shoalrun.com/cli.md).

- **`Tooltip`**

  A brief explanation shown on hover or keyboard focus, with a tap option on touch screens. Markdown includes its label and explanation. See [Tooltips](https://www.shoalrun.com/author/components/tooltips.md).

- **Vale**

  [Vale](https://vale.sh/) is a prose linter that checks configured editorial rules. Authors and agents run it with the project's configuration. See [writing guides](https://www.shoalrun.com/author/design-writing-guides.md).

- **Variable**

  A named value used inside a snippet with `Var`. Values resolve from snippet defaults, project variables, page variables, then the include. See [Reusable snippets](https://www.shoalrun.com/author/snippets.md).

- **Variant**

  One copy of a page in a single publication. Two files with the same ID and different versions are two variants. See [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **Vector**

  The stored list of numbers for an embedding. Search compares query and passage vectors in the same embedding space. See [Passage index](https://www.shoalrun.com/chat/passage-index.md).

- **Vercel build**

  The `shoalrun vercel build` command. It writes a Vercel Build Output directory with redirects and Markdown rules. See [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md).

- **Version**

  An API or documentation edition, such as `v1` or `current`. It is one third of a publication. See [How Shoalrun works](https://www.shoalrun.com/concepts.md).

- **`Walkthrough`, `Step`**

  Components that explain code one step at a time beside a code pane. `Step` has different attributes inside `Steps`. See [Walkthroughs](https://www.shoalrun.com/author/components/walkthroughs.md).

- **Webhook reference**

  A reference page for an OpenAPI 3.1 webhook. It shows the inbound request and the expected reply, with no cURL command. See [OpenAPI support and limits](https://www.shoalrun.com/api-docs/support.md).

## Related reading

### Related topics

- [Definition lists](https://www.shoalrun.com/author/components/definition-list.md) — See a long, filterable definition list in use.
