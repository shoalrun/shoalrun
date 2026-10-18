# Cedar Parcel API reference stress project

This is a wholly fictional API written for Shoalrun testing. Its names, hosts, descriptions, and payloads were authored as synthetic data. It is safe to keep in Git; it is not a transformed copy of a private vendor spec. The `.example` hosts do not provide an API.

The project exercises:

- four titled `oneOf` enrollment requests with shared nested objects and different required fields, including an exclusive lower bound, schema-level examples, and a boolean `true` schema;
- a placeholder `parameters` query field mapped to direct filter expressions;
- one `200` response that can be JSON, CSV, or a spreadsheet;
- named examples, enums, nullable required response fields, and multipart binary uploads;
- object property counts, unique array items, and decimal increments in the parcel-list response;
- operation and path-level server/auth overrides, a deprecated operation, and an explicit `x-*` lifecycle mapping;
- an OpenAPI 3.1 webhook and an authored MDX guide among generated operation links.

`EnrollmentBase` is intentionally unused so a focused contract can prove it excludes unrelated components.

From `framework/`, build and serve it:

```sh
npm run build
node dist/cli.js build example-configs/reference-stress/docs.config.yaml /tmp/cedar-parcel-site
DOCS_PREVIEW_ROOT=/tmp/cedar-parcel-site DOCS_PREVIEW_PORT=8768 node preview.mjs
```

Open `http://127.0.0.1:8768/`. To check the source and both rendered representations, run:

```sh
node dist/cli.js api audit example-configs/reference-stress/apis/cedar-parcel.yaml
node dist/cli.js api focused-audit /tmp/cedar-parcel-site
```

The fixture uses `focused: true` and leaves the full OpenAPI download unpublished. If you edit its source or operation selection, run `shoalrun api review` and update `publicReview.digest` before the next build.
