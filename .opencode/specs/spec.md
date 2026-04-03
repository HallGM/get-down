# Seed 2026 invoice sequence at 149

## Background

The first 148 invoices were created in a separate system before this platform existed. To maintain continuity, the 2026 invoice counter in this system must start at 149 so that invoice numbers do not collide with the legacy records.

## Goals

- The first invoice created in 2026 is numbered `26-0149`.
- No invoice number below `26-0149` is ever issued by this system for the year 2026.

## Acceptance criteria

1. When the first invoice of 2026 is created, its invoice number must be `26-0149`.
2. Each subsequent invoice in 2026 must increment normally: `26-0150`, `26-0151`, and so on.
3. The starting value of 149 must apply only to 2026; other years must continue to start from 1 as normal.
4. If a row for 2026 already exists in the sequence table, the migration must not lower the counter below 149 — it should only raise it if the current value is less than 149.
5. The change must survive a full tear-down and re-apply of all migrations (i.e. it must be implemented as a migration, not a manual data fix).

## Out of scope

- Importing or recording the 148 legacy invoices into this system.
- Any changes to how future years (2027 onwards) are seeded.
- Any changes to the invoice number format.
