# Combined partner account ledger view

## Background

Partners earn fees when fee allocations are created for gigs they perform. Currently, fee allocations and account transactions (drawings, payments, etc.) live in separate tables with no unified view. This means a partner's true balance — what they are owed versus what they have already taken — cannot be seen in one place.

## Goals

- Partners can see a single, unified ledger showing both what they have earned (fee allocations) and what they have taken out (account transactions).
- The account balance reflects the live difference between earned fees and actual drawings, without any manual data entry or duplication.
- Edits to fee allocations are automatically reflected in the balance and ledger with no extra steps.

## Acceptance criteria

1. A database view must combine fee allocations and account transactions into a single ledger for each partner who has an account.
2. Fee allocations must appear in the ledger as credit entries, with the amount equal to the sum of their line items.
3. Account transactions must appear in the ledger as debit entries, using their existing amounts and types.
4. The account balance must be computed as total credits from fee allocations minus total debits from account transactions.
5. The account detail page must display the combined ledger view instead of the current transactions-only list.
6. The combined ledger must only include people who are marked as partners and have an existing account. Non-partners must not appear.
7. If a fee allocation is edited or deleted, the ledger and balance must update automatically without any additional action.
8. Fee allocations with no line items should contribute zero to the balance.
9. A partner with no fee allocations and no transactions should show a balance of zero.
10. The existing ability to add, edit, and delete account transactions must continue to work as before.

## Out of scope

- Auto-creating account transaction records when a fee allocation is created.
- Auto-creating accounts for people who do not already have one.
- Any changes to the fee allocations table or its line items structure.
- Showing the combined ledger for non-partners.


