# Implementation plan

## Summary

Extract invoice and billing UI from the monolithic `GigDetail` page into a new dedicated `GigBilling` page at `/gigs/:id/invoices`, following the same "Manage →" link pattern used by Set List. The gig detail page keeps only general gig info (including quoted price), services, assigned roles, and the two "manage" links. On the API side, `depositPaid` and `balanceAmount` become computed values (deposit = 10% of total; balance = total − payments) instead of stored columns, requiring a migration and changes to the gig service/repository/shared types. The standalone Invoices nav entry and pages are removed. Both the quoted price (`totalPrice`) and the computed total from line items are displayed on the billing page so users can compare them.

## Prerequisites

None — no new dependencies required.

## Files to create

| File | Purpose |
| --- | --- |
| `packages/gui/src/pages/gigs/GigBilling.tsx` | New "Invoice and billing" page — financial summary (showing both quoted price and computed total from line items), billing settings (travel cost, discount %), line items, payments, invoice preview/generation, saved invoices list with PDF viewer. Shows gig context at top. Follows breadcrumb pattern from `SetListBuilder.tsx`. |
| `migrations/008_drop_deposit_balance_columns.sql` | Migration to drop `deposit_paid` and `balance_amount` columns from the `gigs` table. |

## Files to modify

| File | What changes |
| --- | --- |
| `packages/gui/src/App.tsx` | **Remove** `InvoicesList` and `InvoiceDetail` imports, their two `<Route>` entries (`/invoices`, `/invoices/:id`), and the `{ to: "/invoices", label: "Invoices" }` entry from `NAV_LINKS`. **Add** import for `GigBilling` and a new route at `/gigs/:id/invoices`. |
| `packages/gui/src/pages/gigs/GigDetail.tsx` | **Remove** all invoice/billing sections and state: line items section, payments section, invoices section, invoice preview dialog, invoice PDF dialog, add-line-item modal, add-payment modal, and all associated hooks/state (`useAddGigLineItem`, `useRemoveGigLineItem`, `useGenerateLineItems`, `useGigPayments`, `useCreatePayment`, `useDeletePayment`, `useCreateInvoice`, `useGigInvoices`, `useInvoicePreview`, `useSavedInvoicePdf`, `useDeleteInvoice`). **Remove** `travelCost`, `discountPercent`, `depositPaid`, `balanceAmount` from the display `<dl>` and remove `travelCost`/`discountPercent` from the edit form (these move to the billing page). **Keep** `totalPrice` in both the display `<dl>` (as "Quoted Price") and the edit form — it is a core gig field. **Add** a "Manage Invoice & Billing →" link section (same pattern as "Manage Set List →") pointing to `/gigs/:id/invoices`. Keep: general details, services, assigned roles, set list link, edit/delete gig. |
| `packages/shared/src/models.ts` | On the `Gig` interface: make `depositPaid` and `balanceAmount` optional (they are computed server-side and only present on the detail endpoint). On `CreateGigRequest` and `UpdateGigRequest`: remove `depositPaid` and `balanceAmount`. |
| `packages/api/src/services/gigs.ts` | Update `getGigById` to also fetch payments (via `paymentsRepo.readPaymentsByGigId`) alongside line items and services. Compute `depositPaid` and `balanceAmount` from live data and include them in the returned `Gig`. Remove `depositPaid` and `balanceAmount` from `buildMutationInput`. Update `convertEnquiryToGig` to stop passing these fields. |
| `packages/api/src/repository/gigs.ts` | Remove `deposit_paid` and `balance_amount` from `GigRow`, `GigMutationInput`, `SELECT_COLS`, and all INSERT/UPDATE SQL statements. |
| `schema.dbml` | Remove `deposit_paid` and `balance_amount` from the `gigs` table definition. |
| `packages/api/src/services/invoices.ts` | Verify that neither `buildPreviewPayloadForGig` nor `createInvoice` references `gig.deposit_paid` or `gig.balance_amount`. Currently they do not, so this is verification-only — no code change needed unless the build breaks. |
| `packages/api/src/scripts/migrate_airtable.ts` | Remove `depositPaid` and `balanceAmount` from the gig insert object, since these columns no longer exist. |

## Files to delete

| File | Reason |
| --- | --- |
| `packages/gui/src/pages/invoices/InvoicesList.tsx` | Standalone invoices list page removed — no longer routed. |
| `packages/gui/src/pages/invoices/InvoiceDetail.tsx` | Standalone invoice detail page removed — its functionality (PDF viewing, delete) moves into the new `GigBilling` page. |

## Implementation notes

1. **Computed financials formula**: The gig service must compute `depositPaid` and `balanceAmount` server-side. The formula should match what `createInvoice` already uses: `subtotal = Σ lineItem.amount`, `discountAmount = round(subtotal × discountPercent / 100)`, `total = subtotal − discountAmount + travelCost`, `totalPaid = Σ payment.amount`, `depositRequired = round(total × 0.10)`, `depositPaid = min(totalPaid, depositRequired)` (i.e. whether enough has been paid to cover the 10% deposit), `balanceAmount = max(0, total − totalPaid)`.
2. **`getGigs()` (list endpoint)**: For the list view, fetching payments per gig would be an N+1 problem. Since `GigsList` only shows `totalPrice`, make `depositPaid` and `balanceAmount` optional on the `Gig` interface and only compute them in `getGigById`.
3. **Two totals displayed**: The billing summary must show both "Quoted price" (the stored `totalPrice` from the gig — the price agreed with the client) and "Total from line items" (the computed subtotal − discount + travel). This lets users compare the quoted figure against what line items actually add up to. Both values are shown read-only on the billing page; `totalPrice` is editable only on the gig detail page.
4. **`GigBilling` page structure**: Follow `SetListBuilder` as the template — breadcrumb (Gigs → {name} → Invoice & Billing), gig context header, then sections. Use `useGig` for context and all the billing hooks. At the top show a calculated summary `<article>` with: quoted price, computed total, discount, travel, deposit status, total paid, and balance. Below that: billing settings (travel cost, discount % — editable), line items section (with add/generate from services), payments section (with add/delete), and invoices section (with preview/generate/list/PDF viewer/delete).
5. **Billing settings editing**: Travel cost and discount percentage are still stored on the gig and editable. The new page should have inline editing for these two fields. Saving uses the existing `useUpdateGig` hook with only `travelCost` and `discountPercent` in the payload.
6. **Migration safety**: The migration drops two columns with default values. No data migration needed — the values are replaced by computation.
7. **Invoice PDF and delete**: Each saved invoice row in the invoices table on `GigBilling` needs PDF and delete buttons — carry over the existing pattern from the current invoices section in `GigDetail`.
8. **`totalPrice` stays everywhere it was**: It remains on the `Gig` model, the gig detail display and edit form, the gigs list table, and is also shown (read-only) on the billing summary. It will be removed in a future backfill task.
9. **Route ordering**: The new route `/gigs/:id/invoices` must be registered in `App.tsx` alongside `/gigs/:id/set-list`, inside the same `ProtectedRoute` wrapper.

## Out of scope

- Performer invoices.
- Changes to invoice generation logic or the Flask invoice service.
- New financial features beyond relocating and computing existing values.
- Removing or backfilling the `totalPrice` stored field.
- Any changes to the payments API endpoints or controller.
