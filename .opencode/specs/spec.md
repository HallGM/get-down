# Separate invoice and billing from gig details

## Background

The current gig detail page is overcrowded, mixing general gig information with invoice line items, payments, and billing settings. Splitting invoice and billing concerns into a dedicated per-gig page will improve usability and give users a focused workspace for financial management.

## Goals

- Reduce clutter on the gig detail page by moving all invoice and billing content to its own page.
- Give users a dedicated "Invoice and billing" page per gig for managing line items, payments, invoices, and billing settings.
- Consolidate customer invoice management under the per-gig billing area instead of a separate top-level section.

## Acceptance criteria

1. The gig detail page must retain general gig details and services only; all invoice and billing content must be removed from it.
2. The gig detail page must link to a new "Invoice and billing" page following the same view-more/manage pattern used by set list.
3. The new page must be titled "Invoice and billing".
4. The new page must display gig context and a calculated financial summary at the top.
5. The new page must contain line items, payments, invoice preview/generation, saved customer invoices, and invoice-related settings/details such as travel cost and discount percentage.
6. Deposit paid, if shown, must be calculated from known rules or data rather than entered manually.
7. Balance/amount due must be calculated, not manually entered.
8. Existing customer invoice management and viewing must move under the per-gig "Invoice and billing" area.
9. The standalone "Invoices" area in the main navigation must be removed.
10. The new page should follow existing UI patterns and conventions used elsewhere in the application.

## Out of scope

- Performer invoices.
- Changes to invoice generation logic or the invoice service itself.
- New financial features beyond relocating and organising existing content.
