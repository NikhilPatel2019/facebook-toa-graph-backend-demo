# Facebook TAO Sample

A small, educational implementation of Facebook’s TAO (The Associations and Objects) paper concepts.
This project focuses on the core TAO ideas—objects, associations, and time‑ordered association lists—implemented as a minimal API with Redis caching.

This repository is intentionally scoped to a compact, research‑paper‑aligned feature set to make the design easy to study and extend.

## What This Implements (TAO Concepts)

TAO models data as:
- **Objects**: typed entities like users, posts, and pages.
- **Associations**: typed edges between objects (friend, like, follow) with optional metadata.
- **Association lists**: time‑ordered lists of edges for a given source object and association type.

This repo implements those primitives with:
- Object CRUD
- Association CRUD (soft delete via `status`)
- Time‑ordered, cursor‑based association listing
- Association counts
- Redis caching for list queries

## Why This Repo Exists

The goal is to provide a clean, small “TAO-like” backend you can run and understand quickly, without extra features beyond the paper’s core ideas. It is intended as a learning and experimentation base for engineers exploring the TAO model.

## Code Organization

The code is structured using a simple layered architecture:
- **Routes**: define API endpoints and map to controllers
- **Controllers**: request validation and orchestration
- **Services**: business logic and data access
- **Validators**: input validation helpers
- **Infra**: DB and Redis clients
- **Middlewares**: error handling and async wrapper

Key folders:
- `routes/`
- `controllers/`
- `services/`
- `validators/`
- `infra/`
- `middlewares/`
- `scripts/`

## Branch Evolution (for easier reading)

If you want to understand the project step‑by‑step, read it in this order:

1. **`1-APIs(objects-and-associations)`**
   - Minimal API for objects and associations
   - Single‑file implementation to show core flows clearly

2. **`2-Queries(pagination-and-count)`**
   - Cursor‑based association listing
   - Association counts
   - Pagination correctness for TAO‑style access

3. **`3-Cache(redis-and-invalidation)`**
   - Redis caching of association lists
   - Cache invalidation on write paths

4. **`4-CodeRestructure`**
   - Layered architecture (routes/controllers/services/validators)
   - Clean code organization and better maintainability

## API Overview

### Objects
- `POST /objects`
- `GET /objects/:id`
- `PUT /objects/:id`
- `DELETE /objects/:id`

Object types:
- `user`: requires `data.name`, `data.username`
- `post`: requires `data.authorId`, `data.body`
- `page`: requires `data.title`
- `checkin`: requires `data.userId`, `data.placeId`, `data.caption` (optional)
- `place`: requires `data.name`, `data.city` (optional)
- `comment`: requires `data.authorId`, `data.body`

### Associations
- `POST /associations`
- `GET /associations/:sourceId/:type/:destinationId`
- `PUT /associations`
- `DELETE /associations`
- `GET /associations` (list, cursor‑based)
- `GET /associations/count`

Association types:
- `friend`, `like`, `follow`, `authored`, `tagged_in`, `located_at`, `has_comment`

Optional data fields:
- `friend`: `note`
- `like`: `reaction`
- `follow`: `note`
- `authored`: `role`
- `tagged_in`: `context`
- `located_at`: `precision`
- `has_comment`: `note`

### Cursor‑Based Listing

`GET /associations?sourceId=1&type=friend&limit=20&cursor=2026-01-01T00:00:00.000Z|123`

Response:
```
{
  "items": [ ... ],
  "nextCursor": "2026-01-01T00:00:00.000Z|122"
}
```

## Running Locally

1. Install dependencies:

```
npm install
```

2. Configure environment variables (example):

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=toa
REDIS_URL=redis://localhost:6379
PORT=3000
```

3. Run migrations:

```
npm run migrate
```

4. Start the server:

```
npm start
```

## Postman Collection

A Postman collection is included for quick testing:
- `toa-pos.postman_collection.json`

Import it into Postman and run the requests in order (object creation first, then associations).

## Notes and Scope

- This is a simplified, educational TAO‑inspired implementation.
- It intentionally avoids features not central to the paper (ACLs, sharding, replication, multi‑region consistency, etc.).
- Associations are soft‑deleted via a `status` field, and reads exclude `status=0`.
