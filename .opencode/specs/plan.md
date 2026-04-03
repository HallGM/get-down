# Implementation plan

## Summary

Add a single migration that seeds the `invoice_sequences` table with `next_seq = 149` for the year `'26'`. This ensures the first invoice number issued in 2026 is `26-0149`. No application code, frontend, or shared types need to change — the sequence table is the only data that matters.

## Files to create

| File | Purpose |
|---|---|
| `migrations/010_seed_2026_sequence.sql` | Upsert the 2026 row in `invoice_sequences`, setting `next_seq = 149` only if the current value is less than 149 |

## Files to modify

| File | What changes and why |
|---|---|
| *(none)* | All application logic reads from `invoice_sequences` at runtime — no code changes needed |

## Implementation notes

1. **Migration content** — use an `INSERT … ON CONFLICT DO UPDATE` with a `WHERE` guard so it never lowers an existing counter. The exact intent:
   - Insert `('26', 149)` if no row exists for year `'26'`.
   - If a row already exists and `next_seq < 149`, update it to `149`.
   - If a row already exists and `next_seq >= 149`, do nothing (leave it as-is).
   - Postgres expression: `ON CONFLICT (year) DO UPDATE SET next_seq = 149 WHERE invoice_sequences.next_seq < 149`

2. **Why this is safe on re-apply** — the migrations system (`_migrations` table) tracks applied migrations by name, so `010_seed_2026_sequence.sql` will only ever run once on a live database. On a full wipe-and-replay (`docker compose down -v`), it runs in order after `007_invoice_sequence.sql` which creates the table, so the upsert always finds the table ready.

3. **Year key** — the column is `VARCHAR(2)` and the application derives the key as `today.slice(2, 4)` (e.g. `"26"`). The migration must use the string `'26'`, not an integer.

4. **No schema change** — `schema.dbml` describes structure only; data seeds live in migration files. `schema.dbml` does not need to change.

5. **`seed.sql` is not the right place** — `seed.sql` re-runs on every startup and must be idempotent. Putting a hard-coded sequence seed there would interfere with normal counter advancement. The dedicated migration is the correct home.

6. **No tests to write** — there is no integration test suite for the repository layer; the only test file (`enquiries.test.ts`) is a pure-unit test for a CSV parser. The acceptance criteria are fully verified by observing the first invoice number issued in a running environment.

## Out of scope

- Importing or recording the 148 legacy invoices.
- Changes to how any year other than 2026 is seeded.
- Changes to the invoice number format (`YY-NNNN`).
- Any frontend or shared-types changes.
