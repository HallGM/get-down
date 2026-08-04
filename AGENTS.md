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
| `pnpm test`                        | Run all unit tests                    |
| `cd packages/api && pnpm test:unit`        | API unit tests only (fast, no DB)        |
| `cd packages/api && pnpm test:integration` | API integration tests (Testcontainers-Postgres; requires Docker) |
| `cd packages/api && pnpm dbml:sql` | Print SQL from DBML                   |
| `cd packages/api && pnpm migrate`  | Run migrations standalone             |
| `docker compose down -v`           | Stop Postgres and wipe data           |

Integration tests (`*.integration.test.ts` under `packages/api/test/integration/`)
spin up a disposable Postgres container per test file via Testcontainers, apply
every migration, and drive real repository/service/API code against it — no
mocking of SQL. If Docker is managed through Colima (or another non-default
context) rather than Docker Desktop, set `DOCKER_HOST` to the active context's
socket before running them, e.g. `docker context inspect | grep Host`.

## Accounting

`packages/api/src/services/ACCOUNTING.md` is the single source of truth for
what every accounting figure means (Accounting page and per-gig profit
views). If code and that document disagree, the document is correct — fix
the code, or update the document deliberately with review before changing
the code. **No calculation formula (billing total, net received, settled
status, confirmed/predicted profit) may be duplicated across files.** Each
lives in exactly one place — `@get-down/shared` (`billing.ts`) for the TS
formulas shared between API and GUI, `repository/settled.ts` and
`repository/gigs.ts` SQL fragments for the settled/predicted status queries —
and every other file must import from there.

## Environment Variables (`packages/api/.env`)

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `PORT`, `FRONTEND_URL`, `JWT_SECRET`, `SKIP_MIGRATION`, `DB_SSL_REJECT_UNAUTHORIZED`

**TLS behavior** — determined by `src/db/init.ts`:
- **Local connections** (localhost, 127.0.0.1, ::1, host.docker.internal, docker-compose): `ssl: false`
- **Render-managed Postgres** (detected by `*.render.com` hostname or `RENDER=true` env): `rejectUnauthorized: false` (Render uses self-signed certs)
- **Other remote connections**: `rejectUnauthorized: true` (full certificate verification)

`DB_SSL_REJECT_UNAUTHORIZED` can override the above: set to `"true"` to force verification, or `"false"` to disable it. Use this only if auto-detection fails or you need to test different settings.

## Deployment

`render.yaml` — Render.com: managed Postgres, Node API (migrations run on startup), Vite static site, Flask invoice service.

Production connects to Postgres via the discrete `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`
variables (wired from the Render-managed database in `render.yaml`), not `DATABASE_URL`.
TLS configuration is automatic: Render-managed Postgres uses self-signed certificates, so the API connects with `rejectUnauthorized: false` for that platform (detected via `*.render.com` hostname). For other remote databases, strict certificate verification (`rejectUnauthorized: true`) is the default.

**After deploying:**

1. Watch the deploy logs for a successful startup. TLS connection issues will show up immediately as errors during migrations.
2. Hit a lightweight authenticated endpoint (e.g. log in, or load the Accounting summary) and confirm it returns data rather than a 500.
3. If the TLS handshake fails for a non-Render database, set `DB_SSL_REJECT_UNAUTHORIZED=false` in the dashboard to unblock it, then investigate the root cause (custom CA cert, etc.) and re-enable verification.

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
