# Attributions and showcases — expense linking

## Background

Attributions track how clients discovered Get Down (showcase, venue referral, social media, word of mouth, etc.). Showcases are a specific type of attribution representing a physical event. Attribution fees capture the costs incurred through each advertising method, and those fees need to be traceable to real expenses.

## Goals

- Give each attribution a detail page that surfaces its showcase details, fees, and linked expenses in one place.
- Allow attribution fees to be managed (created, edited, deleted) directly from an attribution.
- Allow expenses to be linked to and unlinked from an attribution fee, both from the attribution detail page and from within an individual expense.
- Simplify showcase creation by automatically creating the linked attribution, so users only fill in one form.

## Acceptance criteria

1. The attributions list must navigate to an attribution detail page when a row is clicked.
2. The attribution detail page must show the attribution's name, type, and notes.
3. If the attribution has a linked showcase, the detail page must display the showcase's name, date, and location.
4. The attribution detail page must list all attribution fees for that attribution, showing description, date, and amount.
5. A user must be able to create a new attribution fee (description, date, amount) from the attribution detail page.
6. A user must be able to edit or delete an attribution fee from the attribution detail page.
7. Each attribution fee on the detail page must show its linked expenses (description, amount, date).
8. A user must be able to link an existing expense to an attribution fee from the attribution detail page, using an expense picker.
9. A user must be able to unlink an expense from an attribution fee from the attribution detail page.
10. The expense detail view must show any attribution fees the expense is linked to.
11. A user must be able to link an expense to an attribution fee from within the expense view.
12. A user must be able to unlink an attribution fee from within the expense view.
13. Creating a new showcase must automatically create a linked attribution with the showcase name and type "showcase". The user should not need to set attribution fields separately.
14. The showcases list must navigate to the attribution detail page (not a separate showcase detail) when a row is clicked.
15. Deleting an attribution that has a linked showcase must not be permitted while the showcase exists.
16. If an attribution has no fees, the fees section must display an empty state rather than an error or blank space.

## Out of scope

- Creating attributions that are not showcases via a new flow (the existing attributions list create form is unchanged).
- Editing showcase fields from the attribution detail page (the existing showcases list handles this).
- Reporting or aggregating attribution fee costs across multiple attributions.
- Linking expenses directly to an attribution without going through an attribution fee.
