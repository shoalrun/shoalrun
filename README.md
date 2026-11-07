# Shoalrun

Build a documentation website, Markdown pages, and application content from the same Markdown and MDX source. People get navigation, search, and interactive components. Applications and agents get stable document references, readable content, and explicit publication metadata.

[Documentation](https://www.shoalrun.com/) · [Features](https://www.shoalrun.com/features) · [Install the CLI](framework/README.md#install) · [Changelog](framework/CHANGELOG.md)

## What you can build

- **Documentation sites.** Write guides and reference pages with steps, tabs, diagrams, code walkthroughs, recipes, and cookbooks. Essential instructions remain readable in Markdown.
- **API documentation.** Generate operation references from OpenAPI, add examples, and publish focused contracts for individual operations. API source changes have an explicit review gate.
- **Independently versioned products.** Give products separate version catalogs, defaults, and routes. Publish several product releases together and reuse pages across explicit publications.
- **Customer editions.** Use external profiles, versioned SKU mappings, feature grants, and page or section requirements to compile each edition. Preview it with `dev --profile`; excluded content is removed from generated output.
- **Branded sites.** Configure logos, fonts, palettes, color modes, and shared presets. Add project CSS for specific layouts or interaction states.
- **Application help.** Export pages, sections, and named snippet instances as Markdown and HTML. Read them through static-manifest or REST clients and mount trusted HTML with instance-specific IDs.
- **Agent access.** Publish Markdown twins and compact discovery indexes, or expose read-only MCP tools scoped to a publication. Bundled skills and offline references help coding agents maintain the source.
- **Search and answers.** Start with browser keyword search. Add semantic search and documentation chat with separately configured providers, server-side credentials, shared usage limits, and optional visitor checks.

Reader filters help visitors browse content. Customer-edition selection happens during compilation. Neither replaces authentication or authorization at the host.

## Create a site

Use Node.js 22.12 or newer. In your documentation project:

```sh
npm install --save-dev --save-exact @shoalrun/cli@0.1.0-beta.1
npx --no-install shoalrun init my-docs --starter showcase
npx --no-install shoalrun dev my-docs/docs.config.yaml my-docs/site-dist --port 8770
```

Open <http://127.0.0.1:8770/>. Edit pages in `my-docs/content/` and settings in `my-docs/docs.config.yaml`; the development server rebuilds on changes. The showcase uses fictional services and example API hosts. Replace those before using its examples against a real service.

Choose `--starter minimal` for a small site or `--starter api-docs` for an OpenAPI example. All three starters build without provider credentials. Installation uses the public npm registry and needs no account or package token.

For customer editions, pass the external profile to the same development command:

```sh
npx --no-install shoalrun dev docs.config.yaml site-dist --profile customers/example.yaml --port 8770
```

Configure the profile's feature manifest first; see [customer editions](https://www.shoalrun.com/publish/deployment-profiles). See the [package README](framework/README.md) for standalone builds, content delivery, and agent commands.

## Work with your coding agent

```sh
npx --no-install shoalrun skills list
npx --no-install shoalrun skills read shoalrun-author
npx --no-install shoalrun docs search "product publications" --json
```

The included skills cover setup, page authoring, components, recipes, walkthroughs, and branding. The branding skill guides visual changes and interaction-state checks. `skills list` reports the skills present in the version you're running; installing the CLI doesn't automatically install them into your coding agent.

Agents can inspect a project, capture a baseline, edit source, validate changes in a copied project, and open the resulting preview. See the [authoring command reference](framework/AUTHORING.md). Project plugins and configured checks execute trusted code; the validation copy isn't a sandbox for hostile projects.

## Use the right version

Pin an exact release and consult its [changelog](framework/CHANGELOG.md). Product catalogs and profile-aware development preview are available in `0.1.0-alpha.18`.

`shoalrun docs` reads the pinned offline snapshot included with your installed version. It doesn't fetch the live site. [Snapshot provenance](framework/agent-docs/SNAPSHOT.json) records its source commit and build identity. The website may describe features newer than an installed CLI.

## Develop the framework

The compiler and CLI are in `framework/src/`. Starters are in `framework/example-configs/`; runnable component and application examples are in `framework/examples/`. The public documentation site is maintained separately.

```sh
npm ci --prefix framework
npm --prefix framework run build
node framework/dist/cli.js init my-docs --starter showcase
node framework/dist/cli.js dev my-docs/docs.config.yaml my-docs/site-dist --port 8770
```

Set up the skill validator before running the full checks:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r framework/scripts/requirements-skills.txt
export SKILL_VALIDATOR_PYTHON="$PWD/.venv/bin/python"
npm run test:compiled
npm run authoring:package-check
```

`npm test` builds and runs the suite; `npm run test:compiled` reuses compiled output. Browser checks need Chrome or Puppeteer's development browser. Documentation-format checks use Vale 3.20 or newer. The package check installs a tarball with fresh production dependencies and needs registry access. Provider-backed evaluations are opt-in.

Bundled documentation is an explicit import: export a reviewed snapshot from the docs project, then run `npm run agent-docs:import -- PATH --source-commit FULL_DOCS_COMMIT`. Builds never fetch the latest site content.

The [release process](RELEASING.md) covers package checks, source and tag synchronization, and coordinated site deployment. Releases and hosted workflows are manual; ordinary pushes don't trigger them.

## Status and reporting

Shoalrun 1.0 is the stable release line. Pin exact versions and read the release notes for configuration, command, and content-delivery changes. Older release lines aren't maintained. Rebuild and check your site and content consumers before deploying an upgrade.

Local builds, previews, keyword search, and bundled references don't need a model provider. Semantic search and generated answers need separately configured services. Production hosting, private-edition access, and application authentication remain the deployer's responsibility.

The project is maintainer-led and doesn't accept unsolicited pull requests. Bug reports are welcome, with no guaranteed response time. Read the [contribution policy](CONTRIBUTING.md) and [security policy](SECURITY.md) before reporting an issue.

## License

[Apache-2.0](LICENSE). Authored documentation keeps its own license; retain applicable notices when distributing generated output.
