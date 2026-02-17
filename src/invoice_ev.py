from .invoice import Invoice, Receipt, Line_item, Section
from .generic_invoice import create_generic_invoice, create_generic_receipt
from .config import BusinessConfig
from dataclasses import dataclass
from typing import Optional

# Options class for EV invoice generation


@dataclass
class EVInvoiceOptions:
    customer_name: str
    event_date: str
    venue: str
    invoice_number: str
    line_items: list["Line_item"]
    discount_percent: Optional[float] = None
    travel_cost: Optional[float] = None
    payment_made: Optional[list["Line_item"]] = None
    additional_charges: Optional[list["Line_item"]] = None


def _build_summary_items(options: EVInvoiceOptions, show_deposit: bool = True, show_payments: bool = True) -> tuple[list[dict], float, float]:
    """
    Build summary items common to both invoices and receipts.
    Returns (summary_items, total, deposit)
    """
    subtotal = sum(item.price for item in options.line_items)
    summary_items = [
        {"description": "Subtotal", "price": subtotal}
    ]

    # Discount
    discount_amount = 0.0
    if options.discount_percent is not None and options.discount_percent > 0:
        discount_amount = round(subtotal * (options.discount_percent / 100), 2)
        summary_items.append(
            {"description": f"Discount ({options.discount_percent}%)", "price": -discount_amount})

    # Travel cost
    travel_cost = 0.0
    if options.travel_cost is not None and options.travel_cost > 0:
        summary_items.append(
            {"description": "Travel Cost", "price": options.travel_cost})
        travel_cost = options.travel_cost

    # Total after discount and travel (before additional charges)
    total = subtotal - discount_amount + travel_cost
    summary_items.append(
        {"description": "Total", "price": total, "bold": True})

    # Deposit (20% of total before additional charges)
    deposit = round(total * 0.2, 2)
    if show_deposit:
        summary_items.append(
            {"description": "Deposit (20%)", "price": deposit})

    # Additional charges (applied after deposit calculation)
    if options.additional_charges:
        for charge in options.additional_charges:
            summary_items.append({
                "description": charge.description,
                "price": charge.price
            })

    # Payment made (if showing)
    if show_payments and options.payment_made:
        for payment in options.payment_made:
            summary_items.append({"description": payment.description, "price": -abs(
                payment.price), "bold": getattr(payment, 'bold', False)})

    return summary_items, total, deposit


def generate_ev_invoice(options: EVInvoiceOptions, deposit_only: bool = False, amount_due_override: float = None, show_deposit: bool = True) -> "Invoice":
    """
    Wrapper to create an Invoice with sections for line items, summary, and amount due.
    If deposit_only is True, the amount due is the deposit, not the full balance.
    If amount_due_override is set, it will be used for Amount Due instead of any calculated value.
    If show_deposit is False, the deposit line will not be shown in the summary section.
    """
    # Build common summary items
    summary_items, total, deposit = _build_summary_items(
        options, show_deposit=show_deposit, show_payments=True)

    # Calculate additional charges total
    additional_charges_total = 0.0
    if options.additional_charges:
        additional_charges_total = sum(
            charge.price for charge in options.additional_charges)

    # Calculate total including additional charges for amount due
    total_with_charges = total + additional_charges_total

    # Calculate payment total
    payment_total = 0.0
    if options.payment_made:
        payment_total = sum(item.price for item in options.payment_made)

    # Amount due (was Remaining Balance)
    if amount_due_override is not None:
        amount_due = amount_due_override
    elif deposit_only:
        amount_due = deposit + additional_charges_total - payment_total
    else:
        amount_due = total_with_charges - payment_total

    amount_due_section = [
        {"description": "Amount Due", "price": amount_due, "bold": True}
    ]

    title = f"{options.event_date} - {options.venue}"
    return Invoice(
        customer_name=options.customer_name,
        invoice_number=options.invoice_number,
        title=title,
        sections=[
            Section(heading="Items", rows=[vars(item)
                    for item in options.line_items]),
            Section(heading="Summary", rows=summary_items),
            Section(heading="Totals", rows=amount_due_section)
        ]
    )


def generate_receipt(options: EVInvoiceOptions, show_deposit: bool = True) -> Receipt:
    """
    Generate a receipt for a fully paid invoice.
    Reuses common summary logic from generate_ev_invoice.
    If show_deposit is False, the deposit line will not be shown in the summary section.
    """
    # Build common summary items
    # We ignore total and deposit since balance is always zero for receipts
    summary_items, _, _ = _build_summary_items(
        options, show_deposit=show_deposit, show_payments=True)

    # Balance is now zero for receipts
    balance_section = [
        {"description": "Balance Due", "price": 0.0, "bold": True}]

    title = f"{options.event_date} - {options.venue}"
    return Receipt(
        customer_name=options.customer_name,
        invoice_number=options.invoice_number,
        title=title,
        linked_invoice_number=options.invoice_number,
        sections=[
            Section(heading="Items", rows=[vars(item)
                    for item in options.line_items]),
            Section(heading="Summary", rows=summary_items),
            Section(heading="Totals", rows=balance_section)
        ]
    )
