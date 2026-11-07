---
id: reference.content-sdk.ContentSnapshot
title: ContentSnapshot
summary: A client pinned to one immutable inventory revision and publication.
type: code-reference
area: publishing
subarea: publishing-content-delivery
canonical: /content-delivery/sdk/content-snapshot
---

# ContentSnapshot

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > TypeScript symbols > ContentSnapshot

**Updated: 2026-11-07.**

**Interface** `shoalrun.content.ContentSnapshot`

```typescript
interface ContentSnapshot
```

A client pinned to one immutable inventory revision and publication.

## Fields

| Name                                                                                                                            | Type                                                                                                       | Required / default | Description                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| [`publication`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot.md#shoalrun-content-contentsnapshot-publication) | `Readonly<`[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)`>` | Required           | Publication shared by every resource available from this snapshot. |
| [`revision`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot.md#shoalrun-content-contentsnapshot-revision)       | `string`                                                                                                   | Required           | Content digest identifying this inventory revision.                |

## Methods

| Name                                                                                                                    | Kind     | Description                                                               |
| ----------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| [`dispose`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot.md#shoalrun-content-contentsnapshot-dispose) | `method` | Cancel pending requests and prevent subsequent reads or inventory access. |
| [`get`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot.md#shoalrun-content-contentsnapshot-get)         | `method` | Fetch one available representation of a stable content reference.         |
| [`list`](https://www.shoalrun.com/content-delivery/sdk/content-snapshot.md#shoalrun-content-contentsnapshot-list)       | `method` | List the resources in the opened inventory without fetching their bodies. |

## shoalrun.content.ContentSnapshot.dispose

**Method** `shoalrun.content.ContentSnapshot.dispose`

```typescript
dispose(): void
```

Cancel pending requests and prevent subsequent reads or inventory access.

### Returns

`void`

## shoalrun.content.ContentSnapshot.get

**Method** `shoalrun.content.ContentSnapshot.get`

```typescript
get(ref: ContentRef, options: { format: ContentFormat; signal?: AbortSignal; }): Promise<ContentResult>
```

Fetch one available representation of a stable content reference.

### Parameters

| Parameter | Type / default                                                                                                            | Description                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ref`     | [`ContentRef`](https://www.shoalrun.com/content-delivery/sdk/content-ref.md)                                              | Page, section, or named snippet instance in this snapshot. |
| `options` | `{ format: `[`ContentFormat`](https://www.shoalrun.com/content-delivery/sdk/content-format.md)`; signal?: AbortSignal; }` | Required format and an optional signal for this read.      |

### Returns

`Promise<`[`ContentResult`](https://www.shoalrun.com/content-delivery/sdk/content-result.md)`>`

Validated representation text with its routing and revision metadata.

## shoalrun.content.ContentSnapshot.list

**Method** `shoalrun.content.ContentSnapshot.list`

```typescript
list(): readonly Readonly<ContentResource>[]
```

List the resources in the opened inventory without fetching their bodies.

### Returns

`readonly Readonly<`[`ContentResource`](https://www.shoalrun.com/content-delivery/sdk/content-resource.md)`>[]`

Read-only resource entries for this publication and revision.

## shoalrun.content.ContentSnapshot.publication

**Property** `shoalrun.content.ContentSnapshot.publication`

```typescript
readonly publication: Readonly<ContentPublication>
```

Publication shared by every resource available from this snapshot.

**Type:&#x20;**`Readonly<`[`ContentPublication`](https://www.shoalrun.com/content-delivery/sdk/content-publication.md)`>`

Required

## shoalrun.content.ContentSnapshot.revision

**Property** `shoalrun.content.ContentSnapshot.revision`

```typescript
readonly revision: string
```

Content digest identifying this inventory revision.

**Type:&#x20;**`string`

Required
