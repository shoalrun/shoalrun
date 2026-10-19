---
id: guide.cedar-parcel
title: API reference styling lab
summary: Inspect a synthetic API with complex schemas, filters, response
  formats, and webhooks.
type: overview
area: api
subarea: api-examples
canonical: /example-api/cedar
---

# API reference styling lab

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Examples > Cedar Parcel API · styling lab > API reference styling lab

**Updated: 2026-10-19.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

The Cedar Parcel API is fictional. Its `.example` hosts do not accept requests, and its OpenAPI examples have not been executed. We keep it in the Shoalrun docs to check API reference layouts alongside other pages. It uses the same navigation, search, themes, and Markdown output.

Use these pages to inspect the hardest layouts:

- [Create a parcel enrollment](https://www.shoalrun.com/example-api/cedar/create-enrollment-7af3e5d2.md) shows four named request shapes with overlapping nested objects and required fields. In **Bulk dispatch**, `monthlyParcelEstimate` demonstrates an exclusive lower bound and schema-level examples, while `customMetadata` accepts any JSON value.
- [List parcel records](https://www.shoalrun.com/example-api/cedar/list-parcels-0345fb5f.md) shows direct query filters, three response formats, and the new object, array, and number constraints: `minProperties`, `maxProperties`, `uniqueItems`, and `multipleOf`.
- [Get a parcel](https://www.shoalrun.com/example-api/cedar/get-parcel-edee10e6.md) uses a path-specific server and no authentication.
- [Upload a manifest](https://www.shoalrun.com/example-api/cedar/upload-manifest-1af17891.md) requires two binary upload fields.
- [Get a parcel through the old route](https://www.shoalrun.com/example-api/cedar/get-legacy-parcel-6758d051.md) shows OpenAPI deprecation overriding an extension value.
- [Parcel delivered event](https://www.shoalrun.com/example-api/cedar/parcel-delivered-7d1ba6db.md) shows an inbound OpenAPI 3.1 webhook with a nested `oneOf` proof.

The source and standalone test project live at `framework/example-configs/reference-stress/` in the repository. The source is not copied into the built site; each operation publishes only its focused contract.

## How it works for agents

Every operation has a complete `.md` page and a focused OpenAPI contract. Schema fields remain in Markdown even when their HTML disclosure is closed. The site manifest and search index include these pages, and the reader's theme choice does not change what an agent can read.
