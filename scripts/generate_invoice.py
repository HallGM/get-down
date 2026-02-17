"""
Generic invoice generation example script.
Demonstrates how to use the generic invoice library with custom business data.
Business details are loaded from environment variables (see .env.example).
Update the INVOICE DETAILS section below for each invoice you generate.
"""

from src.config import BusinessConfig, Address
from src.generic_invoice import create_generic_invoice, create_generic_receipt
from src.invoice import Line_item, Invoice, Receipt, Section
import os
import sys
import subprocess
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ============================================================================
# BUSINESS CONFIGURATION - loaded from environment variables
# Set these in your .env file (copy from .env.example)
# ============================================================================

BUSINESS_NAME = os.getenv("BUSINESS_NAME", "")
ADDRESS_LINE_1 = os.getenv("BUSINESS_ADDRESS_LINE1", "")
ADDRESS_LINE_2 = os.getenv("BUSINESS_ADDRESS_LINE2", "")
ADDRESS_LINE_3 = os.getenv("BUSINESS_ADDRESS_LINE3", "")
PHONE_NUMBER = os.getenv("BUSINESS_PHONE", "")
EMAIL_ADDRESS = os.getenv("BUSINESS_EMAIL", "")
ACCOUNT_NUMBER = os.getenv("BUSINESS_ACCOUNT_NUMBER", "")
SORT_CODE = os.getenv("BUSINESS_SORT_CODE", "")
LOGO_PATH = os.getenv("BUSINESS_LOGO_PATH", None)
DEPOSIT_PERCENTAGE = None


# ============================================================================
# INVOICE DETAILS - Update these for each invoice
# ============================================================================

CUSTOMER_NAME = "TMD Music Ltd"
INVOICE_NUMBER = "TMD-26-1"
INVOICE_TITLE = "Airtable Automation Consulting Services"

# Line items - add/remove as needed
LINE_ITEMS = [
    Line_item(description="16/12/24 - 1h", price=35.0),
    Line_item(description="3/03/25 - 2h", price=70.0),
    Line_item(description="11/03/25 - 2h20", price=81.67),
    Line_item(description="17/03/25 - 2h", price=70.0),
    Line_item(description="18/03/25 - 3h", price=105.0),
    Line_item(description="19/03/25 - 2h", price=70.0),
    Line_item(description="25/03/25 - 4h", price=140.0),
    Line_item(description="10/04/25 - 1h", price=35.0),
    Line_item(description="12/04/25 - 1h", price=35.0),
    Line_item(description="24/04/25 - 1h 30m", price=52.50),
    Line_item(description="27/10/25 - 1h", price=35.0),
]

DISCOUNT_PERCENT = None  # e.g., 10.0 for 10% discount, or None for no discount
CUSTOM_CHARGE = None     # e.g., 100.0 for additional charge, or None
# e.g., [Line_item(description="Deposit paid", price=500.0)]
PAYMENT_MADE = None

DEPOSIT_ONLY = False        # If True, amount due is only the deposit
AMOUNT_DUE_OVERRIDE = None  # e.g., 1000.0 to override calculated amount, or None
SHOW_DEPOSIT = False        # Whether to show deposit line in invoice


# ============================================================================
# MAIN SCRIPT - No changes needed below
# ============================================================================

def build_invoice(
    customer_name: str,
    invoice_number: str,
    title: str,
    line_items: list[Line_item],
    discount_percent=None,
    custom_charge=None,
    payment_made=None,
    deposit_percentage=20.0,
    deposit_only=False,
    amount_due_override=None,
    show_deposit=True
) -> Invoice:
    """Build an invoice object."""
    subtotal = sum(item.price for item in line_items)
    summary_items = [{"description": "Subtotal", "price": subtotal}]

    # Discount
    discount_amount = 0.0
    if discount_percent is not None and discount_percent > 0:
        discount_amount = round(subtotal * (discount_percent / 100), 2)
        summary_items.append({
            "description": f"Discount ({discount_percent}%)",
            "price": -discount_amount
        })

    # Custom charge
    custom_charge_total = 0.0
    if custom_charge is not None and custom_charge > 0:
        summary_items.append({
            "description": "Additional Charge",
            "price": custom_charge
        })
        custom_charge_total = custom_charge

    # Total
    total = subtotal - discount_amount + custom_charge_total
    summary_items.append({
        "description": "Total",
        "price": total,
        "bold": True
    })

    # Deposit
    if show_deposit and deposit_percentage is not None:
        deposit = round(total * (deposit_percentage / 100), 2)
        summary_items.append({
            "description": f"Deposit ({deposit_percentage}%)",
            "price": deposit
        })
    else:
        deposit = 0.0

    # Payment made
    if payment_made:
        for payment in payment_made:
            summary_items.append({
                "description": payment.description,
                "price": -abs(payment.price),
                "bold": getattr(payment, 'bold', False)
            })

    # Amount due
    # additional charges to add to deposit if in deposit_only mode
    custom_charge_total_for_calc = custom_charge_total
    payment_total = sum(
        item.price for item in payment_made) if payment_made else 0.0
    if amount_due_override is not None:
        amount_due = amount_due_override
    elif deposit_only:
        amount_due = deposit + custom_charge_total_for_calc - payment_total
    else:
        amount_due = total - payment_total

    amount_due_section = [{
        "description": "Amount Due",
        "price": amount_due,
        "bold": True
    }]

    return Invoice(
        customer_name=customer_name,
        invoice_number=invoice_number,
        title=title,
        sections=[
            Section(heading="Items", rows=[vars(item) for item in line_items]),
            Section(heading="Summary", rows=summary_items),
            Section(heading="Totals", rows=amount_due_section)
        ]
    )


# Create business config
business_config = BusinessConfig(
    business_name=BUSINESS_NAME,
    address=Address(
        line_1=ADDRESS_LINE_1,
        line_2=ADDRESS_LINE_2,
        line_3=ADDRESS_LINE_3,
    ),
    phone_number=PHONE_NUMBER,
    email_address=EMAIL_ADDRESS,
    account_number=ACCOUNT_NUMBER,
    sort_code=SORT_CODE,
    logo_path=LOGO_PATH,
    deposit_percentage=DEPOSIT_PERCENTAGE
)

# Generate invoice
invoice = build_invoice(
    customer_name=CUSTOMER_NAME,
    invoice_number=INVOICE_NUMBER,
    title=INVOICE_TITLE,
    line_items=LINE_ITEMS,
    discount_percent=DISCOUNT_PERCENT,
    custom_charge=CUSTOM_CHARGE,
    payment_made=PAYMENT_MADE,
    deposit_percentage=DEPOSIT_PERCENTAGE,
    deposit_only=DEPOSIT_ONLY,
    amount_due_override=AMOUNT_DUE_OVERRIDE,
    show_deposit=SHOW_DEPOSIT
)

# Create PDF
create_generic_invoice(invoice, business_config)
print(f"✓ Invoice {INVOICE_NUMBER} generated successfully!")

# Open output folder (macOS only)
if sys.platform == "darwin":
    subprocess.run(["open", "output"])
