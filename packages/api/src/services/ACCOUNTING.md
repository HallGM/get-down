# Accounting definitions

This document is the single source of truth for what every accounting figure
means. If code and this document disagree, treat the document as correct and
fix the code (or update the document deliberately, with review, before
changing the code).

Every calculation function in `repository/accounting.ts`, `repository/gigs.ts`,
`repository/settled.ts` and `shared/billing.ts` links back to the relevant
section here in its JSDoc comment.

All monetary figures are integers in pennies unless stated otherwise.

## Foundational concepts

### Settled vs unsettled gig

A gig is **settled** when all of the following are true (see `repository/settled.ts`
for the exact SQL, `SETTLED_CONDITION`):

1. It has at least one billing line item.
2. The billing total (see below) is greater than zero and exactly equals net received.
3. It has at least one assigned performer role.
4. Every assigned role has a person linked (nobody is a placeholder).
5. Every assigned role has a fee allocation linked.
6. Every performer's fee allocation is "closed out":
   - a non-partner (contractor) allocation must have at least one linked expense
     (proof they were actually paid/invoiced), OR
   - a partner allocation must be marked `confirmed`.

This is calculated in exactly one place (`SETTLED_CONDITION`) and used by both
the gigs list/detail pages and the Accounting page, so "settled" always means
the same thing everywhere in the app.

**Unsettled** simply means "not settled" — including drafts, gigs missing
payments, gigs with unconfirmed partner fees, etc. A cancelled gig is never
settled and is always excluded from both settled and predicted figures.

### Billing total (what the client owes)

`billingTotal = (line items subtotal, each after its own item discount, further
reduced by the greater of item-level or overall gig discount) + travelCost +
cardCharges − creditRefunds − writeOffRefunds`

- `creditRefunds` and `writeOffRefunds` both reduce billing total because they
  reduce what the client is deemed to owe (a goodwill cash gesture and a
  forgiven debt respectively).
- `travelCost` is included because it is billed to the client. It is **not**
  a business expense — the money is passed straight through to the performer
  who travelled, via a larger fee allocation. No separate travel expense is
  recorded for this reason today (see "Travel cost" below for a caveat).
- `cardCharges` are additional amounts charged to cover card processing fees;
  they are also recorded as an expense (see "Card charges are net-zero" below).

### Net received (what has actually been collected)

`netReceived = totalPaid − creditRefunds − adjustmentRefunds`

- `adjustmentRefunds` reduce net received only: they represent cash handed
  back for an overpayment, with no change to what was billed.
- `creditRefunds` reduce both billing total and net received, because the
  goodwill amount is both forgiven and handed back.
- `writeOffRefunds` reduce billing total only: debt is forgiven but no cash
  moves, so net received is untouched.

For a settled gig, `billingTotal == netReceived` by definition. Refund
subtypes deliberately affect only one side each (except `credit`, which
affects both) — this is not a bug, it reflects that "money owed" and "money
collected" are genuinely different things. `repository/settled.ts` contains
the full algebraic derivation and unit/integration tests exercise every
subtype combination to prove it holds.

### Travel cost — known limitation

Today, travel cost is billed to the client (adds to billing total and net
received) and is intended to be passed through entirely to whichever performer
travelled, via a larger fee allocation. There is currently no requirement that
a fee allocation actually reflects the travel amount, and no separate expense
is recorded for it. This means travel cost can currently inflate turnover
without a matching expense if a performer's fee allocation was not increased
to cover it. This is a known data-entry risk, not a code bug, and is out of
scope for this round of work. A future improvement should add an explicit
"other" expense for travel cost paid to partners, so it nets out like any
other pass-through cost.

### Card charges are net-zero

An invoice card charge (recorded to recover payment processing fees) increases
billing total (and therefore net received once paid) **and** has a linked
expense (`invoice_card_charges.expense_id`) for the same amount. The net
effect on business profit should be zero: the extra income and the matching
expense cancel out. This is proven by an integration test
(`accounting.integration.test.ts`).

### Confirmed profit (per-gig)

`confirmedProfit = billingTotal − feesTotal`

Where `feesTotal` is the sum of **all** fee allocation line items for the
gig — both partner and contractor allocations. This is the figure shown on
the gigs list and detail pages. It intentionally includes partner fee
allocations, because from a bookkeeping perspective the partner has been
"paid" for playing, exactly like a contractor would be. What is left over is
the true margin on that individual booking before any wider business
overheads (equipment, showcases, admin, etc.) are considered.

This is a single shared implementation (`calcConfirmedProfit` in
`@get-down/shared`), used by both the API and the GUI, so there is exactly one
definition of "confirmed profit" in the codebase.

### Predicted profit (per-gig)

For non-cancelled, unsettled gigs only. `predictedProfit = predictedBilling −
predictedFees`, where:

- `predictedBilling` = discounted line-item subtotal + travel cost + card
  charges — i.e. the same shape as billing total for a settled gig, so
  predicted and settled figures are directly comparable and summable.
- `predictedFees` = sum of each assigned role's configured fee (from
  `roles.fee`, via the service's role list) — a forecast of what allocations
  will eventually be, not the actual allocations recorded yet.

`predictedProfit` is `null` (unavailable) when:
- the gig is cancelled, or
- it has no billing line items yet, or
- any role attached to one of its services has no configured fee.

A gig with no roles at all contributes £0 predicted fees (not "unavailable") —
there is simply nothing to predict a cost for.

## Accounting page figures

All figures are optionally filtered to a calendar year or a UK tax year
(6 April–5 April), always floored at the partnership start date
(`PARTNERSHIP_START_DATE`). With no filter, "all time" is used (still floored
at the partnership start date).

| Figure | Definition |
| --- | --- |
| `gigsBooked` | Count of non-cancelled gigs whose date falls in the period. |
| `gigsPerformed` | Count of non-cancelled gigs whose date falls in the period **and** is on or before today. |
| `settledNetReceived` | Sum of `netReceived` across settled gigs in the period. Actual cash collected, proven by the settlement condition to equal billing. |
| `predictedBillingUnsettled` | Sum of `predictedBilling` across non-cancelled, unsettled gigs in the period where a prediction is available. Uses the full amount the client is expected to pay (line items + travel + card charges), matching the shape of `settledNetReceived` so the two can be meaningfully added together. |
| `expensesBreakdown.feeAllocation` | Sum of the **full** amount of every expense linked (via `fee_allocations_expenses`) to a fee allocation on a settled gig. Full amount, not apportioned — see "Expense apportionment" below. |
| `expensesBreakdown.showcase` | Sum of the full amount of every expense linked to a showcase, either via a showcase fee allocation or directly via `showcase_expenses`, and not already counted in `feeAllocation`. |
| `expensesBreakdown.other` | Sum of the full amount of every expense with no fee-allocation link and no showcase link. This also includes expenses linked only to fee allocations on **unsettled** gigs — until that gig settles, its linked expense is treated as a general business cost, not yet attributed to a specific gig's turnover. |
| `expenses` | `feeAllocation + showcase + other`. The total settled-period expense figure that turnover is measured against. |
| `predictedFeeAllocations` | Sum of `predictedFees` across the same unsettled gigs used for `predictedBillingUnsettled` — the forecast cost of paying performers on bookings not yet settled. |
| `businessProfit` | `settledNetReceived − expenses`. This is the whole-business result for the period: everything collected from clients minus everything spent, including contractor and partner-adjacent costs that show up as expenses. **Partner fee allocations are never included in `expenses`** because a partner drawing their allocated fee is not a business expense — it is a distribution of profit. See "Partner fee allocations" below. |
| `feeAllocationsTotal` / `feeAllocationsBreakdown` | Sum (and per-partner breakdown) of fee allocation line item amounts for partners (`is_partner = true`) on settled, non-cancelled gigs in the period. This is money partners have taken for playing, still shown as a slice of business profit, not as a cost that reduced it. |
| `confirmedSharedProfit` | `businessProfit − feeAllocationsTotal`. What is left to split between partners after each partner has already taken their own playing fee. This is the number partners actually divide between themselves. |
| `predictedSharedProfit` | Sum of `predictedProfit` across non-cancelled, unsettled gigs where a prediction is available. Already excludes predicted partner fees (since `predictedProfit` subtracts all predicted role fees, partner and contractor alike) — directly comparable to `confirmedSharedProfit`. |
| `predictedProfitExcludedCount` | Count of non-cancelled, unsettled gigs in the period whose predicted profit is unavailable (missing price or fee configuration). Shown so a large number is a visible prompt to fix missing data, not a silent gap. |

### Partner fee allocations are not expenses

A contractor's fee allocation is proven by a linked expense record — contractors
are paid out of the business bank account like any other supplier, and that
payment is recorded as an expense (see settlement rule 6 above). A partner's
fee allocation is never linked to an expense: partners take **drawings**
against their share, tracked through the partner's account, not through the
expenses table. This is why `expensesBreakdown` never contains a partner fee
allocation, and why "business profit" is calculated before partner
allocations are subtracted, while "confirmed shared profit" is calculated
after.

An automated data-integrity check (`readPartnerAllocationDataAudit`) asserts
that no fee allocation for a partner has ever been linked to an expense. If
this ever finds a row, it means either a partner was incorrectly treated as a
contractor, or a data entry mistake double-counted a partner's fee as both a
business expense and a profit distribution — either way it must be
investigated and corrected, not silently accepted.

### Expense apportionment on the Accounting page

An expense can, in principle, be linked to more than one fee allocation or
showcase, with an `apportioned_amount` recorded per link so a shared cost
(for example, a single rehearsal room hire shared across several gigs) can be
split between events on a per-gig basis. **The Accounting page deliberately
does not apply this apportionment.** It always counts an expense at its
**full** amount, once, in whichever bucket its links resolve to. This is
correct because the Accounting page is a business-wide total, not a per-gig
figure — the expense happened once, for the full amount, regardless of how
many bookings it is later associated with for reporting purposes. Per-gig
views (which do care about apportionment, to fairly split a shared cost across
several gigs) use separate calculations and are unaffected by this note.

In practice, a single expense linked to fee allocations spanning both settled
and unsettled gigs, or spanning gigs and showcases, is expected to be rare.
When it happens, the bucket priority is: settled-gig fee allocation wins over
showcase, which wins over "other" — so the expense is never double-counted
across buckets, only ever placed in the highest-priority bucket it qualifies
for.

## Internal consistency

For any period, the following must hold and is proven by an integration test:

```
businessProfit
  == sum(confirmedProfit for every settled gig in the period)
     + feeAllocationsTotal (settled partner allocations)
     − (expensesBreakdown.showcase + expensesBreakdown.other)
```

In words: per-gig `confirmedProfit` subtracts **every** fee allocation on that
gig, partner and contractor alike (see "Confirmed profit (per-gig)" above).
`businessProfit` only subtracts contractor allocations (via the expenses they
generate) — partner allocations are added back here because they were never
subtracted from `businessProfit` in the first place. Overheads not
attributable to a specific gig (showcase costs, unlinked "other" expenses)
are then subtracted, since they have no per-gig counterpart to net against.

**This is exactly the confusion that originally motivated this audit**: a
gig can look profitable "per gig" (confirmed profit, after subtracting the
partner's own playing fee) while the business-wide total looks different,
because the two figures are answering different questions — "what's left
after everyone (including me) got paid to play" vs. "what did the business
keep before anyone splits the leftover profit". Neither figure is wrong; they
are not the same question, and this document exists so nobody has to
rediscover that the hard way again.

If this identity ever fails in a test, it means `businessProfit`,
`feeAllocationsTotal`, and per-gig `confirmedProfit` have drifted apart in
some way not explained by the formula above, and the drift must be found and
fixed before trusting any of the three figures.
