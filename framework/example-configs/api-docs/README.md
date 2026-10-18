# Cedar Parcel API documentation starter

This fictional parcel API uses the same OpenAPI source as the Shoalrun docs site's reference styling lab. It includes an overview, enrollment quickstart, generated references, search, system color mode, and linked reading paths.

## Preview your site

With the Shoalrun CLI installed, run these commands from this directory:

```sh
shoalrun check docs.config.yaml
shoalrun build docs.config.yaml site-dist
shoalrun dev docs.config.yaml site-dist --port 8772
```

Open `http://127.0.0.1:8772/`. Editing a page or config rebuilds the preview. The CLI retains the last successful build if a change fails.

## Make it yours

1. Change the title, header, footer, and `site.origin` in `docs.config.yaml`. Set the origin to the site's public URL before deployment.
2. Replace `apis/cedar-parcel.yaml` with your own API description. Replace the fictional server URLs before sending requests.
3. Update the authored pages in `content/`. Stable document IDs connect cards, navigation, and related reading.
4. Review the API content for public release. Run `shoalrun api review docs.config.yaml --output review`, inspect the candidate, and update `apis.cedar.publicReview.digest` with the reported digest when API content changes.
5. Build again and inspect the overview, quickstart, and generated reference pages. Search for a field and try the color-mode toggle.

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
