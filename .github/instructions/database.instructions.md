---
applyTo: "migrations/**,schema.dbml"
---

# Database & Migration Conventions

## Schema definition
- The canonical schema is defined in `schema.dbml` at the repo root (DBML format).
- To preview generated SQL: `cd packages/api && pnpm dbml:sql`.
- DBML is documentation — `migrations/` files are what actually execute.

## Migration files
- Location: `migrations/` at the repo root.
- Naming: `NNN_short_description.sql` — zero-padded three-digit prefix, underscore-separated description.
- Example: `001_initial_schema.sql`, `002_add_status_column.sql`.
- Each file runs in a single transaction.
- Files are tracked in the `_migrations` table — once applied, they never run again.

## Writing a migration
- For new tables: `CREATE TABLE "table_name" ( ... );`
- For schema changes: `ALTER TABLE "table_name" ADD COLUMN ...;` — never drop/recreate.
- Always quote table and column names with double quotes for consistency.
- Foreign keys should specify `ON DELETE CASCADE` where appropriate.

## Seed data
- `migrations/seed.sql` — always re-run on every startup.
- MUST be idempotent: use `INSERT INTO ... ON CONFLICT DO NOTHING`.
- The `services.name` column has a UNIQUE constraint to support this.

## Migration runner (`packages/api/src/scripts/migrate.ts`)
- Runs automatically on API startup (before `app.listen()`).
- Can be run standalone: `cd packages/api && pnpm migrate`.
- Skip with `SKIP_MIGRATION=true` env var.

## Workflow for schema changes
1. Edit `schema.dbml` with the desired change.
2. Run `pnpm dbml:sql` to see the full DDL — diff against `001_initial_schema.sql` to identify what's new.
3. Create a new `migrations/NNN_description.sql` with only the `ALTER TABLE` / additive statements.
4. Commit both the DBML update and the new migration file.
5. On next startup, the migration runner picks it up automatically.

## PostgreSQL conventions
- Column names: `snake_case`.
- Use `SERIAL` for auto-incrementing primary keys.
- Use `varchar(255)` for short strings, `text` for long-form content.
- Use `date` for date-only fields, `timestamptz` for timestamps.
