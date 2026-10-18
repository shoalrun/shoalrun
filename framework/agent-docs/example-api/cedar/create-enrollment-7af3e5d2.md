---
id: reference.cedar.createEnrollment
title: Create a parcel enrollment
summary: POST /Enrollments
type: api-reference
subjectLifecycle: beta
canonical: /example-api/cedar/create-enrollment-7af3e5d2
---

# Create a parcel enrollment

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Examples > Cedar Parcel API · styling lab > Enrollment > Create a parcel enrollment

**Updated: 2026-10-15.**

**Status: Beta.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/cedar-createenrollment-6f4c7b1ced9545eecbe8cc0f67b874b11f6ff2d206086f80322b741803b20dcf.json).

## POST /Enrollments

Create a parcel enrollment

Create one of four enrollment shapes. The service accepts different
required fields for each program; the examples illustrate the shapes
but have not been sent to a server.

### Servers

`https://sandbox.api.cedar-parcel.example/v1` — Enrollment sandbox only

### Authentication

**API key**

API key in header X-Application-Key.

Enrollment-only key.

### Request body

Required.

Choose the program that matches the parcels you will dispatch.

#### application/json

Use exactly one of these shapes:

**Local pickup** · 6 properties

A shop with ordinary pickup windows.

6 properties

- `program` `string` **required**&#x20;

  const: "local"

- `organization` `object` **required**&#x20;

  3 properties

  - `displayName` `string` **required**&#x20;

    Name shown on parcel labels.

  - `address` `object` **required**&#x20;

    5 properties

    - `line1` `string` **required**&#x20;

      Street and number.

    - `line2` `string` **optional** **nullable**&#x20;

      Additional address line, if present.

    - `city` `string` **required**&#x20;

    - `region` `string` **required**&#x20;

    - `postalCode` `string` **required**&#x20;

  - `registrationCode` `string` **optional** **nullable**&#x20;

    Optional local registration code.

- `contact` `object` **required**&#x20;

  3 properties

  - `name` `string` **required**&#x20;

  - `email` `string` **required**&#x20;

    format: email

  - `phone` `string` **optional** **nullable**&#x20;

- `pickupWindows` `list of object` **required**&#x20;

  The windows when parcels can be collected.

  Array items:

  3 properties

  - `day` `enum<string>` **required**&#x20;

    Available options: `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"`

  - `opensAt` `string` **required**&#x20;

    Local time in HH:mm format.

  - `closesAt` `string` **required**&#x20;

    Local time in HH:mm format.

- `fragileHandling` `boolean` **optional**&#x20;

  default: false

- `notes` `string` **optional** **nullable**&#x20;

**Chilled goods** · 6 properties

Requires a temperature range and handling instructions.

6 properties

- `program` `string` **required**&#x20;

  const: "chilled"

- `organization` `object` **required**&#x20;

  3 properties

  - `displayName` `string` **required**&#x20;

    Name shown on parcel labels.

  - `address` `object` **required**&#x20;

    5 properties

    - `line1` `string` **required**&#x20;

      Street and number.

    - `line2` `string` **optional** **nullable**&#x20;

      Additional address line, if present.

    - `city` `string` **required**&#x20;

    - `region` `string` **required**&#x20;

    - `postalCode` `string` **required**&#x20;

  - `registrationCode` `string` **optional** **nullable**&#x20;

    Optional local registration code.

- `contact` `object` **required**&#x20;

  3 properties

  - `name` `string` **required**&#x20;

  - `email` `string` **required**&#x20;

    format: email

  - `phone` `string` **optional** **nullable**&#x20;

- `temperatureRange` `object` **required**&#x20;

  2 properties

  - `minimumCelsius` `number` **required**&#x20;

  - `maximumCelsius` `number` **required**&#x20;

- `handlingNotes` `string` **optional**&#x20;

  Instructions printed for handlers.

- `sensorRequired` `boolean` **optional**&#x20;

  default: true

**Bulk dispatch** · 7 properties

Requires an estimated volume and manifest format.

7 properties

- `program` `string` **required**&#x20;

  const: "bulk"

- `organization` `object` **required**&#x20;

  3 properties

  - `displayName` `string` **required**&#x20;

    Name shown on parcel labels.

  - `address` `object` **required**&#x20;

    5 properties

    - `line1` `string` **required**&#x20;

      Street and number.

    - `line2` `string` **optional** **nullable**&#x20;

      Additional address line, if present.

    - `city` `string` **required**&#x20;

    - `region` `string` **required**&#x20;

    - `postalCode` `string` **required**&#x20;

  - `registrationCode` `string` **optional** **nullable**&#x20;

    Optional local registration code.

- `contact` `object` **required**&#x20;

  3 properties

  - `name` `string` **required**&#x20;

  - `email` `string` **required**&#x20;

    format: email

  - `phone` `string` **optional** **nullable**&#x20;

- `monthlyParcelEstimate` `integer` **required**&#x20;

  exclusiveMinimum: 0

  Example 1 (authored in OpenAPI):

  ```json
  8000
  ```

  Example 2 (authored in OpenAPI):

  ```json
  12000
  ```

- `manifestFormat` `enum<string>` **required**&#x20;

  Available options: `"csv"`, `"json"`

- `callbackUrl` `string` **optional** **nullable**&#x20;

  format: uri

- `customMetadata` `any value` **optional** **nullable**&#x20;

  Any value is allowed.

**Combined program** · 8 properties

Supplies pickup, temperature, and volume details.

8 properties

- `program` `string` **required**&#x20;

  const: "combined"

- `organization` `object` **required**&#x20;

  3 properties

  - `displayName` `string` **required**&#x20;

    Name shown on parcel labels.

  - `address` `object` **required**&#x20;

    5 properties

    - `line1` `string` **required**&#x20;

      Street and number.

    - `line2` `string` **optional** **nullable**&#x20;

      Additional address line, if present.

    - `city` `string` **required**&#x20;

    - `region` `string` **required**&#x20;

    - `postalCode` `string` **required**&#x20;

  - `registrationCode` `string` **optional** **nullable**&#x20;

    Optional local registration code.

- `contact` `object` **required**&#x20;

  3 properties

  - `name` `string` **required**&#x20;

  - `email` `string` **required**&#x20;

    format: email

  - `phone` `string` **optional** **nullable**&#x20;

- `pickupWindows` `list of object` **required**&#x20;

  Array items:

  3 properties

  - `day` `enum<string>` **required**&#x20;

    Available options: `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"`

  - `opensAt` `string` **required**&#x20;

    Local time in HH:mm format.

  - `closesAt` `string` **required**&#x20;

    Local time in HH:mm format.

- `temperatureRange` `object` **required**&#x20;

  2 properties

  - `minimumCelsius` `number` **required**&#x20;

  - `maximumCelsius` `number` **required**&#x20;

- `monthlyParcelEstimate` `integer` **required**&#x20;

  minimum: 1

- `manifestFormat` `enum<string>` **required**&#x20;

  Available options: `"csv"`, `"json"`

- `callbackUrl` `string` **optional** **nullable**&#x20;

  format: uri

##### Example: Local shop

Key: localShop. Location: request; application/json. Authored in OpenAPI.

A storefront with standard pickup windows.

```json
{
  "program": "local",
  "organization": {
    "displayName": "Example Corner Shop",
    "address": {
      "line1": "12 Sample Lane",
      "city": "Northport",
      "region": "NP",
      "postalCode": "00012"
    }
  },
  "contact": {
    "name": "Taylor Example",
    "email": "taylor@example.com"
  },
  "pickupWindows": [
    {
      "day": "monday",
      "opensAt": "09:00",
      "closesAt": "17:00"
    }
  ]
}
```

Example request (cURL):

```bash
curl --request POST \
  --url 'https://sandbox.api.cedar-parcel.example/v1/Enrollments' \
  --header 'X-Application-Key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{"program":"local","organization":{"displayName":"Example Corner Shop","address":{"line1":"12 Sample Lane","city":"Northport","region":"NP","postalCode":"00012"}},"contact":{"name":"Taylor Example","email":"taylor@example.com"},"pickupWindows":[{"day":"monday","opensAt":"09:00","closesAt":"17:00"}]}'
```

##### Example: Chilled goods

Key: chilledGoods. Location: request; application/json. Authored in OpenAPI.

```json
{
  "program": "chilled",
  "organization": {
    "displayName": "Demo Cold Store",
    "address": {
      "line1": "9 Test Quay",
      "city": "Northport",
      "region": "NP",
      "postalCode": "00019"
    }
  },
  "contact": {
    "name": "Robin Sample",
    "email": "robin@example.com"
  },
  "temperatureRange": {
    "minimumCelsius": 2,
    "maximumCelsius": 6
  },
  "handlingNotes": "Keep upright."
}
```

Example request (cURL):

```bash
curl --request POST \
  --url 'https://sandbox.api.cedar-parcel.example/v1/Enrollments' \
  --header 'X-Application-Key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{"program":"chilled","organization":{"displayName":"Demo Cold Store","address":{"line1":"9 Test Quay","city":"Northport","region":"NP","postalCode":"00019"}},"contact":{"name":"Robin Sample","email":"robin@example.com"},"temperatureRange":{"minimumCelsius":2,"maximumCelsius":6},"handlingNotes":"Keep upright."}'
```

##### Example: Bulk dispatch

Key: bulkDispatch. Location: request; application/json. Authored in OpenAPI.

```json
{
  "program": "bulk",
  "organization": {
    "displayName": "Fictional Warehouse",
    "address": {
      "line1": "4 Mock Road",
      "city": "Eastmere",
      "region": "EM",
      "postalCode": "00044"
    }
  },
  "contact": {
    "name": "Lee Demo",
    "email": "lee@example.com"
  },
  "monthlyParcelEstimate": 12000,
  "manifestFormat": "csv"
}
```

Example request (cURL):

```bash
curl --request POST \
  --url 'https://sandbox.api.cedar-parcel.example/v1/Enrollments' \
  --header 'X-Application-Key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{"program":"bulk","organization":{"displayName":"Fictional Warehouse","address":{"line1":"4 Mock Road","city":"Eastmere","region":"EM","postalCode":"00044"}},"contact":{"name":"Lee Demo","email":"lee@example.com"},"monthlyParcelEstimate":12000,"manifestFormat":"csv"}'
```

##### Example: Combined program

Key: combinedProgram. Location: request; application/json. Authored in OpenAPI.

```json
{
  "program": "combined",
  "organization": {
    "displayName": "Synthetic Logistics",
    "address": {
      "line1": "8 Example Drive",
      "city": "Eastmere",
      "region": "EM",
      "postalCode": "00048"
    }
  },
  "contact": {
    "name": "Morgan Test",
    "email": "morgan@example.com"
  },
  "pickupWindows": [
    {
      "day": "friday",
      "opensAt": "08:00",
      "closesAt": "16:00"
    }
  ],
  "temperatureRange": {
    "minimumCelsius": 1,
    "maximumCelsius": 7
  },
  "monthlyParcelEstimate": 8000,
  "manifestFormat": "json"
}
```

Example request (cURL):

```bash
curl --request POST \
  --url 'https://sandbox.api.cedar-parcel.example/v1/Enrollments' \
  --header 'X-Application-Key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{"program":"combined","organization":{"displayName":"Synthetic Logistics","address":{"line1":"8 Example Drive","city":"Eastmere","region":"EM","postalCode":"00048"}},"contact":{"name":"Morgan Test","email":"morgan@example.com"},"pickupWindows":[{"day":"friday","opensAt":"08:00","closesAt":"16:00"}],"temperatureRange":{"minimumCelsius":1,"maximumCelsius":7},"monthlyParcelEstimate":8000,"manifestFormat":"json"}'
```

### Responses

#### 201: Created

`application/json`

The enrollment was recorded. Review may still be pending.

4 properties

- `enrollmentId` `string` **always present**&#x20;

- `status` `enum<string>` **always present**&#x20;

  Available options: `"pending"`, `"approved"`, `"rejected"`

- `warnings` `list of string` **always present**&#x20;

  Array items:

  string

- `approvedAt` `string` **always present** **nullable**&#x20;

  format: date-time

  Always present; null until approved.

##### Example: Pending review

Key: pending. Location: response 201; application/json. Authored in OpenAPI.

```json
{
  "enrollmentId": "enr_demo_001",
  "status": "pending",
  "warnings": [],
  "approvedAt": null
}
```

#### 400: Bad Request

`application/problem+json`

The selected program is missing one or more required fields.

4 properties

- `type` `string` **always present**&#x20;

  format: uri

- `title` `string` **always present**&#x20;

- `status` `integer` **always present**&#x20;

- `detail` `string` **may be absent**&#x20;
