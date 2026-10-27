# Cedar Parcel API documentation starter

This fictional parcel API uses the same OpenAPI source as the Shoalrun docs site's reference styling lab. It includes an overview, enrollment quickstart, generated references, search, system color mode, and linked reading paths.

## Preview your site

With the Shoalrun CLI installed, run these commands from this directory:

```sh
shoalrun config validate docs.config.yaml
shoalrun dev docs.config.yaml site-dist --port 8772
```

Open `http://127.0.0.1:8772/`. Editing a page or config rebuilds the preview. The CLI retains the last successful build if a change fails.

The development server builds the site before serving it. To inspect a fixed build instead, run `shoalrun build docs.config.yaml site-dist`, then `shoalrun serve site-dist --port 8772`.

## Make it yours

1. Change the title, header, footer, and `site.origin` in `docs.config.yaml`. Set the origin to the site's public URL before deployment.
2. If you keep the Cedar example, customize its descriptions and examples together with the authored pages. Replace the fictional server URLs before sending requests. To use a different API, follow **Bring your own API** below; replacing the file alone is not enough.
3. Update the authored pages in `content/`. Stable document IDs connect cards, navigation, and related reading. Keep their operation bindings consistent with `apis.cedar.operations`.
4. Review the API content for public release. Run `shoalrun api review docs.config.yaml --output review`, inspect the candidate, and update `apis.cedar.publicReview.digest` with the reported digest when API content changes.
5. Build again and inspect the overview, quickstart, and generated reference pages. Search for a field and try the color-mode toggle.

## Bring your own API

For a first import, start with `shoalrun init my-api-docs --starter minimal` and follow [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references). That guide supplies a complete small example: a local spec, operation registration, an authored reference, navigation, source review, and checks for both outputs. You can read the version bundled with your CLI using `shoalrun docs read guide.api-references`.

To adapt this Cedar demo instead, update these connected parts before running the review:

- Replace the source file and update its `source.path` if the filename changes. Remove the old `publicReview.digest`; it approves the Cedar source, not your replacement.
- Replace `apis.cedar.operations` entries with operations from your spec. Each `sourceOperationId` must exist in that spec. Update the corresponding page's `operations` list and the registry's `reference` page ID together.
- Update navigation operation IDs, authored API embeds, document links, related-reading relationships, header links, and footer links. Rewrite or remove the Cedar-specific guides and reference page as a connected set.
- Update or remove `mappings`, `querySyntax`, and `discovery.endpoint` when they do not describe your API. Review `generateReferences` and whether publishing the complete source with `source.publish: true` is appropriate.

Then run `shoalrun api review docs.config.yaml --output review`, inspect the candidate's HTML, Markdown, and contracts, and record the new digest. Rebuild and run `shoalrun api focused-audit site-dist`. A `Missing OpenAPI operationId createEnrollment` error means a Cedar operation binding still points into your replacement spec.

## Explore the reference features

The enrollment reference includes four request shapes, shared nested objects, required fields, nullable values, and four named examples. Parcel search includes direct field/operator filters and JSON, CSV, and spreadsheet responses. Other operations demonstrate a separate lookup server, binary manifest uploads, a deprecated route, and a delivery webhook with alternative proof shapes.

The config maps OpenAPI lifecycle extensions to status badges and defines the direct-query syntax used by parcel search. Enrollment uses an application key; the parcel lookup has no authentication. The generated references describe the security rules for each operation.

## Agent discovery

Every page has a Markdown twin and a **Read as Markdown** link. `/llms.txt` indexes the site, and `/documents.json` provides the document inventory. API references link to focused contracts containing one operation. The complete OpenAPI source and API catalog are also published.

`site.agentDiscovery` configures the early HTML instruction. `mode: focus` visually reveals it on keyboard focus; `visible` always shows it; `off` omits the block. Raw HTML agents and screen readers can encounter it in both `focus` and `visible` modes. The standard accessibility skip link and discovery files remain available in every mode.

## Deploy

Build Vercel routing and headers with:

```sh
shoalrun vercel build docs.config.yaml .vercel/output
```

Deploy the complete Build Output API directory using your Vercel project. A plain static folder upload does not apply the Markdown negotiation rules. See [Vercel hosting](https://www.shoalrun.com/publish/vercel/) for deployment instructions.
