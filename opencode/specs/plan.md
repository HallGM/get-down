# Implementation plan

## Summary

A PostgreSQL view (`account_ledger`) will merge `account_transactions` (debits) and `fee_allocations` (credits, summed from line items) into a single unified ledger per account. The `GET /accounts/:id/ledger` endpoint will query this view. The account detail page will display the combined ledger instead of transactions alone, while all transaction CRUD operations remain unchanged. The all-time balance on the accounts list and detail page will also be updated to include fee allocation credits.

## Prerequisites

The `account_transactions_fee_allocations` join table is confirmed to exist (created in `migrations/002_expand_core_schema.sql` — note it differs from the name in `schema.dbml`). No new dependencies required.

## Files to create

| File | Purpose |
| ---- | ------- |
| `migrations/026_gig_id_not_null.sql` | Adds `NOT NULL` constraint to `fee_allocations.gig_id`, enforcing that every allocation must belong to a gig |
| `migrations/027_account_ledger_view.sql` | Creates the `account_ledger` view, UNIONing account transactions and fee allocations (summed line items) for partner accounts |

## Files to modify

| File | What changes and why |
| ---- | -------------------- |
| `schema.dbml` | Add `not null` to `fee_allocations.gig_id` to match the enforced constraint |
| `packages/shared/src/models.ts` | Add `LedgerEntry` interface: `sourceId`, `entryType: 'transaction' \| 'allocation'`, `accountId`, `date?`, `amount`, `label`, `description?` |
| `packages/api/src/repository/accounts.ts` | Add `LedgerEntryRow` interface and `readLedgerByAccountId(accountId, year?)` querying the view. Update `readAllAccounts` to compute `ca_balance` from the view via subquery instead of joining `account_transactions` directly |
| `packages/api/src/services/accounts.ts` | Add `getLedgerByAccount(accountId, year?)` — validates account exists, delegates to repo, maps rows to `LedgerEntry` |
| `packages/api/src/controllers/accounts.ts` | Add `GET /accounts/:id/ledger` route, passing optional `?year` query param |
| `packages/gui/src/api/hooks/useAccounts.ts` | Add `useAccountLedger(accountId, year?)` hook fetching `/accounts/:id/ledger` |
| `packages/gui/src/pages/accounts/AccountDetail.tsx` | Replace `useAccountTransactions` (display) with `useAccountLedger`. Update table: show `entryType` column, use `label` instead of `type`, show edit button only on `transaction` entries. The create/edit/delete modals are unchanged. |

## Implementation notes

1. **View structure.** The `account_ledger` view UNIONs two selects. The transaction arm joins `account_transactions → accounts → people` and passes `amount` as-is. The allocation arm joins `fee_allocations → accounts → people → gigs → fee_allocation_line_items (optional)` and emits `-(COALESCE(SUM(li.amount), 0))::int` as the amount (negative = credit). Both arms filter `WHERE p.is_partner = true`. The allocation arm groups by `fa.id, a.id, a.person_id, g.date` to aggregate line items per allocation. `gig_id` is always present on a fee allocation so the gig join is always satisfied.

2. **Sign convention is preserved.** Positive amount = person has taken money (drawing = overdrawn direction). Negative amount = business owes person (earned credit). The `caLabel` utility and all balance display logic are unchanged.

3. **Balance update.** The `readAllAccounts` query currently does `LEFT JOIN account_transactions t … SUM(t.amount)`. Replace this with a correlated subquery `(SELECT COALESCE(SUM(amount), 0) FROM account_ledger WHERE account_id = a.id)::int AS ca_balance`. This keeps the query simple and ensures the list-page balance matches the detail-page ledger.

4. **Non-partner accounts.** The view filters `is_partner = true` on the allocation arm, so non-partner accounts will have zero allocation rows. Their balance is still correctly computed from transactions only. The accounts list continues to show all accounts regardless of partner status.

5. **Year filter.** The ledger endpoint must support `?year` filtering the same way transactions do: `EXTRACT(YEAR FROM date) = $2`. For allocations, the date is always the linked gig's date, which is always present.

6. **Allocation rows are read-only in the UI.** The edit button in the ledger table must only render for `entryType === 'transaction'` rows. Allocation entries show as informational credits with no action controls.

7. **Query key invalidation.** `useAccountLedger` should share the `"accounts"` query key prefix so that creating/updating/deleting a transaction (which already invalidates `[KEY]`) also refreshes the ledger. Specifically use `queryKey: ["accounts", accountId, "ledger", year ?? "all"]` and ensure the existing mutations call `qc.invalidateQueries({ queryKey: ["accounts"] })` which already covers this via prefix matching.

8. **Table column order.** Suggested ledger table columns: Date | Type | Description | Amount | — (edit button for transactions). Remove the "Allocations" column that currently shows linked allocation IDs — that was only relevant for the old transaction-only view.

9. **`LedgerEntry.label`** for transaction rows = the transaction's `type` field (e.g. "Drawing"). For allocation rows = `"Fee Allocation"`. This is set in the view so the repository layer needs no branching logic.

10. **`gig_id` NOT NULL migration.** Migration `026` should first delete any orphaned rows with `DELETE FROM fee_allocations WHERE gig_id IS NULL` before applying `ALTER TABLE fee_allocations ALTER COLUMN gig_id SET NOT NULL`. This is safe because such rows would have no date, no ledger entry, and no meaningful business purpose. The `FeeAllocationMutationInput` type in the repository and the `CreateFeeAllocationRequest` / `UpdateFeeAllocationRequest` types in shared models should mark `gigId` as required (non-optional) to reflect this at the TypeScript level.

## Out of scope

- Auto-creating account transaction records when a fee allocation is created
- Auto-creating accounts for people who do not already have one
- Any changes to fee allocation creation, editing, or deletion
- Showing the combined ledger for non-partners
- Filtering allocations by paid/invoiced status

## Delta

### Add

| File | Purpose |
| ---- | ------- |
| `migrations/028_account_ledger_description.sql` | Replaces the view with an auto-generated description: `COALESCE(g.name, g.first_name \|\| ' ' \|\| g.last_name) \|\| ' — ' \|\| TO_CHAR(g.date, 'DD Mon YYYY')` instead of `fa.notes` |
| `packages/gui/src/components/FeeAllocationPanel.tsx` | Extracted shared component (previously local to `GigRoles.tsx`) |

### Modify

| File | What changes |
| ---- | ------------ |
| `packages/gui/src/pages/gigs/GigRoles.tsx` | Import `FeeAllocationPanel` from shared component; remove local definition |
| `packages/gui/src/api/hooks/useFeeAllocations.ts` | `invalidateLineItemCaches` also invalidates `["accounts"]` so ledger balance refreshes when line items change |
| `packages/gui/src/pages/accounts/AccountDetail.tsx` | Add Edit button on allocation rows; add fee allocation edit modal (FeeAllocationPanel + Reset + Delete) |

### Skip (already built)

Everything in the original plan above.
