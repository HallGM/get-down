"""Shared calculation helpers used across invoice generation paths."""

from __future__ import annotations


def calculate_amount_due(
    *,
    deposit: float,
    charges_total: float,
    payment_total: float,
    full_balance_total: float,
    deposit_only: bool,
    amount_due_override: float | None,
) -> float:
    """Return the amount due for an invoice.

    For deposit-only invoices the result is floored at 0 so that an
    overpayment never produces a negative amount due.  Full-balance invoices
    may return a negative value when the client has overpaid.
    """
    if amount_due_override is not None:
        return amount_due_override
    if deposit_only:
        return max(0, deposit + charges_total - payment_total)
    return full_balance_total - payment_total
