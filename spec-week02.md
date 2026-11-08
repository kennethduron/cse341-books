# Books and Authors API — Week 02 Specification

## Version 1

### Feature 1: Book CRUD Operations and Author References

#### Goal
Update the Week 01 Books API so book documents reference authors and support complete CRUD operations. Every route must be documented and testable in Swagger.

#### Data model
Book documents are stored in `books` and contain:

- `id`: required custom string ID, such as `b1`.
- `authorId`: required string referencing an existing `authors.id`.
- `title`: required string.
- `publicationDate`: required string.

API routes use `id`, not MongoDB `_id`.

#### Relationship
`authorId` must match an existing author's custom `id`. Book create and update requests are rejected when the author does not exist.

#### Routes

| Route | Success | Errors |
| --- | --- | --- |
| `GET /books` | `200`, array of books | `500`, unexpected server/database error |
| `GET /books/:id` | `200`, one book | `404`, book absent; `500`, unexpected error |
| `POST /books` | `201`, created book | `400`, missing field or missing author; `409`, duplicate ID; `500`, unexpected error |
| `PUT /books/:id` | `200`, updated book | `400`, invalid body or missing author; `404`, book absent; `500`, unexpected error |
| `DELETE /books/:id` | `204`, no body | `404`, book absent; `500`, unexpected error |

POST body example:

```json
{
  "id": "b4",
  "authorId": "a1",
  "title": "Example Book Title",
  "publicationDate": "2026-01-15"
}
```

PUT body example:

```json
{
  "authorId": "a2",
  "title": "Updated Book Title",
  "publicationDate": "2026-02-20"
}
```

### Feature 2: Author CRUD Operations

#### Goal
Create an `authors` collection and API supporting all CRUD operations.

#### Data model
Author documents in `authors` contain:

- `id`: required custom string ID, such as `a1`.
- `name`: required string.
- `birthYear`: required integer.

#### Routes

| Route | Success | Errors |
| --- | --- | --- |
| `GET /authors` | `200`, array of authors | `500`, unexpected error |
| `GET /authors/:id` | `200`, one author | `404`, author absent; `500`, unexpected error |
| `POST /authors` | `201`, created author | `400`, missing/invalid fields; `409`, duplicate ID; `500`, unexpected error |
| `PUT /authors/:id` | `200`, updated author | `400`, invalid body; `404`, author absent; `500`, unexpected error |
| `DELETE /authors/:id` | `204`, no body | `404`, author absent; `409`, author has books; `500`, unexpected error |

POST body example:

```json
{ "id": "a4", "name": "Example Author", "birthYear": 1980 }
```

PUT body example:

```json
{ "name": "Updated Author", "birthYear": 1981 }
```

An author with related books cannot be deleted. The API returns `409 Conflict` and preserves the author and all related books.

### Version 1 evaluation

- **Error clarity:** Missing, malformed, duplicate, and absent resources need distinct outcomes; duplicate IDs are conflicts (`409`), while invalid fields or an unknown relationship are client validation errors (`400`).
- **Security:** Never return database exception details or MongoDB `_id`; accept only expected JSON object fields and do not permit changing a custom ID through a PUT body.
- **Efficiency:** Create unique indexes for custom IDs and check author references with a targeted existence query. Use projections to return only API fields.
- **Integrity:** Check for related books before deleting an author and retain both documents on conflict. The application check is appropriate for this single-service assignment; concurrent cross-collection writes may require a MongoDB transaction for stronger guarantees.
- **Validation:** A date-shaped string alone can represent an impossible date, and `birthYear` must be a finite integer. Validate both before database writes.
- **Swagger:** Every route needs path parameters, schemas, examples, request bodies for POST/PUT, and all response codes.

## Version 2 — Implementation checklist

### Feature 1: Book CRUD Operations and Author References

#### Data model and relationship
Store exactly these public fields: `id`, `authorId`, `title`, and `publicationDate`. IDs, title, author ID, and date are non-empty strings. `publicationDate` must be a real calendar date in `YYYY-MM-DD` form. Store no author object or author name in the new API representation; `authorId` references `authors.id`. Keep the Week 01 `b1`, `b2`, and `b3` records, preserving their titles and publication dates while linking them to matching Authors. Unique indexes enforce unique custom IDs. Responses omit `_id` and any legacy author-name field.

#### Routes and validation

- `GET /books`: `200` JSON array; `500` generic JSON error.
- `GET /books/:id`: `200` JSON book; `404` `{"message":"Book not found"}`; `500` generic JSON error.
- `POST /books`: require exactly `id`, `authorId`, `title`, `publicationDate`; validate types, non-empty values, real date, and author existence. Return `201` and created object; `400` invalid input or nonexistent author; `409` duplicate ID; `500` generic JSON error.
- `PUT /books/:id`: require `authorId`, `title`, `publicationDate`; reject unknown properties including `id`, validate date and author. Return `200` and updated object; `400` invalid input or nonexistent author; `404` unknown book; `500` generic JSON error.
- `DELETE /books/:id`: return `204` with no body; `404` if missing; `500` generic JSON error.

Unexpected errors are logged server-side without logging request bodies or connection details. No client response reveals internal errors.

#### Swagger and verification
Document all parameters, schemas, examples, request bodies, relationship rules, and `200`, `201`, `204`, `400`, `404`, `409`, and `500` responses as applicable. Execute routes through `/api-docs` locally and on Render. Automated tests cover validation, unique IDs, author references, missing resources, safe errors, and preservation of existing books.

### Feature 2: Author CRUD Operations

#### Data model
Store public fields `id`, `name`, and `birthYear`. `id` and `name` are non-empty strings; `birthYear` is a finite integer. Create a unique index on `id`. API responses omit `_id` and unknown stored fields.

#### Routes and validation

- `GET /authors`: `200` JSON array; `500` generic JSON error.
- `GET /authors/:id`: `200` author; `404` `{"message":"Author not found"}`; `500` generic JSON error.
- `POST /authors`: require exactly `id`, `name`, `birthYear`; return `201` created author, `400` invalid body, `409` duplicate ID, or `500` generic JSON error.
- `PUT /authors/:id`: require exactly `name`, `birthYear`; custom ID is immutable. Return `200` updated author, `400` invalid body, `404` absent author, or `500` generic JSON error.
- `DELETE /authors/:id`: check `books.authorId` before deleting. Return `204` with no body only when unreferenced; `404` if absent; `409` `{"message":"Author has books and cannot be deleted"}` if referenced; `500` generic JSON error. A conflict leaves both collections unchanged.

Unexpected errors are logged server-side without exposing database details to clients. The application checks the reference before the delete; a transaction would be needed to guarantee integrity under simultaneous cross-collection writes, which is outside this assignment's expected concurrency.

#### Swagger and verification
Document all routes, custom ID parameters, request bodies for POST/PUT, schemas, examples, and applicable `200`, `201`, `204`, `400`, `404`, `409`, and `500` responses. Tests cover CRUD success, missing and invalid input, duplicate IDs, absent resources, safe errors, deletion allowed, and deletion blocked while preserving related records. Test `/api-docs` locally and after deployment to Render.
