# Get Down — Repository Context

## Overview

Event services booking platform. TypeScript/pnpm monorepo.

| Package            | Path               | Tech          | Purpose                    |
| ------------------ | ------------------ | ------------- | -------------------------- |
| `@get-down/shared` | `packages/shared/` | TypeScript    | Shared types, models, DTOs |
| `@get-down/api`    | `packages/api/`    | Express, pg   | REST API (port 3000)       |
| `@get-down/gui`    | `packages/gui/`    | React, Vite   | Frontend SPA (port 5173)   |
| Invoice            | `invoice/`         | Python, Flask | Invoice generation         |

GUI proxies `/api` → `localhost:3000`. API connects to Postgres in Docker (port 5432).

## API Layer Architecture

**Controllers → Services → Repository → `run_query<T>()`**

- **Controllers** (`src/controllers/`): Declarative route registration via `handle()`. No try/catch.
- **Services** (`src/services/`): Business logic and validation. Throws `AppError` subclasses.
- **Repository** (`src/repository/`): SQL only. Returns raw row types.
- **Errors** (`src/errors.ts`): `BadRequestError(400)`, `UnauthorizedError(401)`, `ForbiddenError(403)`, `NotFoundError(404)`, `ConflictError(409)`.
- **`handle()`** (`src/utils/handle.ts`): Wraps service calls; errors go to global error middleware in `app.ts`.

### Controller pattern

```typescript
router.get(
  "/things",
  handle(() => service.getAll()),
);
router.get(
  "/things/:id",
  handle((req) => service.getById(+req.params.id)),
);
router.post(
  "/things",
  handle((req) => service.create(req.body), 201),
);
router.delete(
  "/things/:id",
  handle((req) => service.delete(+req.params.id), 204),
);
```

## Validation

**Validation lives in services only — never in controllers.**

Use `parseOrBadRequest()` from `src/utils/parse.ts` when validating external input (`req.body`) at the service boundary. It converts `ZodError` to `BadRequestError(400)`.

```typescript
import { z } from "zod";
import { parseOrBadRequest } from "../utils/parse.js";

const CreateThingSchema = z.object({
  name: z.string().min(1, "name is required"),
  date: z.string(),
});

export function createThing(body: unknown): Promise<Thing> {
  const input = parseOrBadRequest(CreateThingSchema, body);
  // input is fully typed; invalid input throws BadRequestError(400)
}
```

Simple business rules (e.g. "must not be empty after merge") may still use manual `throw new BadRequestError(...)` — both styles are valid. Use zod when you need structural validation of `unknown` input.

## Transactions

**Use `withTransaction()` from `src/db/init.ts` any time an operation writes to multiple tables.**

```typescript
import { run_query, withTransaction } from "../db/init.js";

export async function createThing(input: ...) {
  return withTransaction(async () => {
    const [a] = await run_query(...); // uses tx client automatically
    const [b] = await run_query(...); // same tx — rolls back both if this throws
    return result;
  });
}
```

- `run_query` automatically uses the active transaction client when inside `withTransaction`.
- Nesting is safe — nested calls reuse the outer transaction.
- Single-table writes don't need it — Postgres handles those atomically.

## Database / Schema

- Schema source of truth: `schema.dbml`
- Migrations: `migrations/NNN_description.sql`, applied automatically on API startup
- To change schema: edit `schema.dbml` → `cd packages/api && pnpm dbml:sql` → write migration file
- `seed.sql` always re-runs; must be idempotent (`ON CONFLICT DO NOTHING`)

## Dev Commands

| Command                            | Description                           |
| ---------------------------------- | ------------------------------------- |
| `pnpm dev`                         | Start everything (Docker + API + GUI) |
| `pnpm build`                       | Build all packages                    |
| `pnpm test`                        | Run all tests                         |
| `cd packages/api && pnpm dbml:sql` | Print SQL from DBML                   |
| `cd packages/api && pnpm migrate`  | Run migrations standalone             |
| `docker compose down -v`           | Stop Postgres and wipe data           |

## Environment Variables (`packages/api/.env`)

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `PORT`, `FRONTEND_URL`, `JWT_SECRET`, `SKIP_MIGRATION`

## Deployment

`render.yaml` — Render.com: managed Postgres, Node API (migrations run on startup), Vite static site, Flask invoice service.

## Airtable API Reference

Local documentation lives in `airtable_api/`. Consult it whenever reading from or writing to Airtable.

| File / Folder | Contents |
| --- | --- |
| `01_introduction.txt` | Base overview; base ID `appZXteLrpESv7H8X`; available client libraries |
| `02_metadata.txt` | Listing bases, tables, fields, and views |
| `03_rate limits.txt` | 5 req/s per base; 429 → wait 30 s before retrying |
| `04_authentication.txt` | Bearer token (personal access token) in `Authorization` header; HTTPS required |
| `05_tables/` | Per-table CRUD docs for all 12 tables: `expenses`, `gig_payment`, `gigs`, `invoices`, `people`, `recipient`, `rehearsals`, `services`, `set_list_items`, `showcase_payment`, `showcases`, `songs` |
| `06_errors.txt` | HTTP status codes: 200 success; 400/401/403/404/422/429 client errors; 500/502/503 server errors |

## Removed Features

- **Todos** — the `todos` table, `repository/todos.ts`, and any todo-related service/controller/hook have been removed and must not be re-added. Migration `004_drop_todos.sql` drops the table.

## Code Conventions

- ESM modules throughout; import paths use `.js` extension.
- DB columns: `snake_case`; TypeScript: `camelCase`.
- Tests: Jest with `--experimental-vm-modules`.
- **File layout**: exported functions first, private helpers (mappers, validators, builders) at the bottom.
- **Em dashes**: never use em dashes (—) in user-facing text or sentences (hints, labels, paragraphs, error messages). They are only permitted as visual separators in UI elements (e.g. `Title — Subtitle`). Use a period, comma, or reword instead.
