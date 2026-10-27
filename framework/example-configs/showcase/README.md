# Cedar Parcel showcase

Build an editable fictional service handbook with native components, generated API references, and Markdown twins.

```sh
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist
```

Choose **Explore the starter**, the first item in the left navigation. `content/features.mdx` maps the examples and explains integrations that need your own services. No provider credentials are required to build. API hosts and operational examples are fictional; replace them before sending requests.

## Make your first edit

Change a heading or paragraph in `content/reading.mdx`, keeping its frontmatter `id` and `slug`. Rebuild with the command above, refresh `/handbook/reading`, and follow **Read as Markdown** to check the edit in both outputs. For automatic rebuilds, stop the preview and run `shoalrun dev docs.config.yaml site-dist`.

## Replace the fictional API

The source file, operation registry, authored pages, navigation, and API embeds are connected. Replacing only `apis/cedar-parcel.yaml` leaves bindings to Cedar operations such as `createEnrollment`.

For your first API import, use the `minimal` starter with [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references), also available through `shoalrun docs read guide.api-references`. To keep this showcase, update the Cedar operation bindings and all affected pages and links together. Update or remove API-specific mappings, query syntax, and discovery settings. Review whether the complete source should be published. Remove the old `publicReview.digest`, generate a new local candidate with `shoalrun api review docs.config.yaml --output review`, and inspect it before recording its digest and building.
