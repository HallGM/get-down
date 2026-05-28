# Implementation plan

## Summary

This feature adds attribution fees management (CRUD) with expense linking, an attribution detail page that surfaces any linked showcase and all fees, and auto-creation of an attribution when a new showcase is created. It touches the shared type layer, four API layers (repo/service/controller/shared types), and four frontend layers (hooks, pages, components, routing). No DB migration is needed — `attribution_fees` and `attribution_fees_expenses` are already in `schema.dbml`.

## Files to create

| File | Purpose |
| --- | --- |
| `packages/api/src/repository/attribution_fees.ts` | SQL for `attribution_fees` CRUD and `attribution_fees_expenses` link/unlink |
| `packages/api/src/services/attribution_fees.ts` | Business logic for attribution fee CRUD and expense link management |
| `packages/gui/src/pages/attributions/AttributionDetail.tsx` | Detail page showing attribution info, optional showcase, fees with linked expenses |
| `packages/gui/src/api/hooks/useAttributionFees.ts` | React Query hooks for attribution fees CRUD and expense link/unlink |

## Files to modify

| File | What changes and why |
| --- | --- |
| `packages/shared/src/models.ts` | Add `AttributionFee`, `CreateAttributionFeeRequest`, `UpdateAttributionFeeRequest`; add `attributionFeeIds: number[]` to `Expense`; add optional `showcase` field to `Attribution`; make `attributionId` optional on `CreateShowcaseRequest` (auto-created server-side) |
| `packages/api/src/repository/expenses.ts` | Add `readAttributionFeeIdsByExpenseId` and bulk variant reading from `attribution_fees_expenses`; used by `mapExpense` to populate new `attributionFeeIds` field |
| `packages/api/src/repository/showcases.ts` | Add `readShowcaseByAttributionId(attributionId)` for use in the enriched attribution fetch |
| `packages/api/src/services/attributions.ts` | Enrich `getAttributionById` to include the linked showcase (if any) via `showcasesRepo.readShowcaseByAttributionId`; add conflict guard in `deleteAttribution` — throw `ConflictError` if a showcase references this attribution |
| `packages/api/src/services/showcases.ts` | Wrap `createShowcase` in `withTransaction`; auto-create the attribution (name = showcase name, type = `"showcase"`) and set `attributionId` from the new row — caller no longer needs to supply `attributionId` |
| `packages/api/src/services/expenses.ts` | Update `mapExpense` to fetch and include `attributionFeeIds`; add `linkAttributionFeeToExpense` and `unlinkAttributionFeeFromExpense` service functions |
| `packages/api/src/controllers/attributions.ts` | Add sub-resource routes: `GET /attributions/:id/fees`, `POST /attributions/:id/fees`, `PUT /attributions/:id/fees/:feeId`, `DELETE /attributions/:id/fees/:feeId`, `POST /attributions/:id/fees/:feeId/expenses`, `DELETE /attributions/:id/fees/:feeId/expenses/:expenseId` |
| `packages/api/src/controllers/expenses.ts` | Add `GET /expenses/:id/attribution-fees`, `POST /expenses/:id/attribution-fees`, `DELETE /expenses/:id/attribution-fees/:feeId` routes |
| `packages/gui/src/App.tsx` | Register `/attributions/:id` route pointing to `AttributionDetail`; unhide the Attributions nav link |
| `packages/gui/src/pages/attributions/AttributionsList.tsx` | Make rows navigable to `/attributions/:id` via `onRowClick`; remove inline edit modals or keep as column button |
| `packages/gui/src/pages/showcases/ShowcasesList.tsx` | Row click navigates to `/attributions/:attributionId`; create form drops the raw Attribution ID field — only name, date, location needed |
| `packages/gui/src/components/ExpenseModal.tsx` | Add "Attribution fees" section: list linked fees with unlink button, picker to link new ones. Requires `allAttributionFees` prop and link/unlink hooks |
| `packages/gui/src/pages/expenses/ExpensesList.tsx` | Pass `allAttributionFees` to `ExpenseModal` |
| `packages/gui/src/api/hooks/useAttributions.ts` | Add `useAttribution(id: number)` single-record hook |
| `packages/gui/src/api/hooks/useExpenses.ts` | Add `useLinkAttributionFeeToExpense` and `useUnlinkAttributionFeeFromExpense` mutation hooks; invalidate both `expenses` and `attribution-fees` query keys on success |

## Implementation notes

1. **`attribution_fees` repo pattern** — mirror `fee_allocations.ts` exactly: `SELECT_COLS` const, typed `AttributionFeeRow`, `AttributionFeeMutationInput`, expense link functions using `attribution_fees_expenses`. Use `ON CONFLICT DO NOTHING` on link insert.

2. **Auto-creating attribution on showcase create** — wrap both inserts in `withTransaction`. Create the attribution first (name = showcase name, type = `"showcase"`), then insert the showcase with the returned `id`. The service must not require `attributionId` from the caller; `CreateShowcaseRequest.attributionId` becomes optional (ignored on create, used only for the existing update path if needed).

3. **Enriched attribution response** — `getAttributionById` calls `readShowcaseByAttributionId` in parallel with the main fetch and attaches an optional `showcase` field (`{ id, name, date, location }`) to the returned `Attribution`. The `Attribution` shared type gains `showcase?: { id: number; name?: string; date: string; location?: string }`.

4. **Conflict guard on attribution delete** — check for a linked showcase via `readShowcaseByAttributionId` before deleting; throw `ConflictError("Cannot delete an attribution that has a linked showcase")` if one exists. The DB FK catches it too but a 409 is more user-friendly than a 500.

5. **`mapExpense` update** — `attributionFeeIds` must be fetched alongside `feeAllocationIds`. In `getAllExpenses` use a single bulk query from `attribution_fees_expenses` (same Map pattern as the existing `readAllocationIdsByExpenseIds`). In `getExpenseById` use a single-record query.

6. **Attribution fee label in GUI** — fees have no name field; label them `#${fee.id} — ${fee.description ?? fee.date ?? "fee"}` in the picker, consistent with how allocations are labelled in the existing `LinkedAllocationsSection`.

7. **`useAttributionFees` hook keys** — use query key `["attribution-fees", attributionId]` for per-attribution fetches and `["attribution-fees"]` for the full list needed by `ExpenseModal`. Link/unlink mutations should invalidate both `["expenses"]` and `["attribution-fees"]`.

8. **Showcases list row click** — `onRowClick` navigates to `/attributions/${showcase.attributionId}`. Inline edit/delete buttons remain as column actions so they still work without navigating away.

9. **`AttributionDetail` page structure** — three sections: (a) header with name/type/notes and Edit button opening an update modal (reuse existing form pattern), (b) showcase card shown conditionally (read-only — editing still happens from the Showcases list), (c) fees section with an inline create form, edit-in-place per row, delete confirmation, and linked expenses sub-list with `ExpensePickerModal`.

10. **Nav and routing** — unhide `{ to: "/attributions", label: "Attributions" }` in `App.tsx`; leave the Showcases link hidden since showcases are now reached through attribution detail pages.

11. **Attribution fees routes in controller** — add the sub-routes to the existing `attributions.ts` controller file (same router, same file) since they share the `/attributions/:id/...` prefix. Import `attributionFeesService` at the top.

## Out of scope

- Creating attributions that are not showcases via any new flow (existing form unchanged).
- Editing showcase fields from the attribution detail page.
- Reporting or aggregating attribution fee totals across multiple attributions.
- Linking expenses directly to an attribution without an attribution fee.
- Showing Showcases as a top-level nav item.
