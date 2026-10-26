"""Tests for event invoice and receipt payment summaries."""

import unittest
from pathlib import Path

from jinja2 import Template

from app import _parse_payment_list
from src.invoice import Line_item, Payment_item
from src.invoice_ev import EVInvoiceOptions, generate_ev_invoice, generate_receipt


class PaymentRowsTest(unittest.TestCase):
    def setUp(self):
        self.options = EVInvoiceOptions(
            customer_name="Client",
            event_date="2026-06-15",
            venue="Venue",
            invoice_number="26-0001",
            line_items=[Line_item(description="Event service", price=500.0)],
            payment_made=[Payment_item(
                description="Deposit", price=100.0, date="2026-05-02"
            )],
        )

    def test_invoice_payment_label_date_and_amount_due_are_preserved(self):
        invoice = generate_ev_invoice(self.options)
        payment_row = self._payment_row(invoice)
        amount_due = invoice.sections[-1].rows[0]

        self.assertEqual(payment_row["description"], "Payment received: Deposit")
        self.assertEqual(payment_row["payment_date"], "02/05/26")
        self.assertEqual(payment_row["price"], -100.0)
        self.assertEqual(amount_due["price"], 400.0)
        item_row = invoice.sections[0].rows[0]
        self.assertEqual(item_row["description"], "Event service")
        self.assertNotIn("payment_date", item_row)

    def test_missing_description_and_date_use_plain_payment_label(self):
        self.options.payment_made = [Payment_item(description="", price=25.0)]

        invoice = generate_ev_invoice(self.options)
        payment_row = self._payment_row(invoice)

        self.assertEqual(payment_row["description"], "Payment received")
        self.assertIsNone(payment_row["payment_date"])
        self.assertEqual(payment_row["price"], -25.0)
        self.assertIn("Payment received</td>", self._render_summary(invoice))
        self.assertNotIn("Payment received (", self._render_summary(invoice))

    def test_payment_parser_keeps_optional_date_and_description(self):
        payments = _parse_payment_list([
            {"description": "Deposit", "price": "45.50", "date": "2026-05-02"},
            {"price": "10"},
        ])

        self.assertEqual(payments[0].date, "2026-05-02")
        self.assertEqual(payments[0].description, "Deposit")
        self.assertEqual(payments[1].description, "")
        self.assertIsNone(payments[1].date)

    def test_receipt_payment_date_and_zero_balance_are_preserved(self):
        receipt = generate_receipt(self.options)
        payment_row = self._payment_row(receipt)
        balance = receipt.sections[-1].rows[0]

        self.assertEqual(payment_row["description"], "Payment received: Deposit")
        self.assertEqual(payment_row["payment_date"], "02/05/26")
        self.assertEqual(payment_row["price"], -100.0)
        self.assertEqual(balance["description"], "Balance Due")
        self.assertEqual(balance["price"], 0.0)

    def test_template_contains_readable_label_and_optional_date_as_plain_text(self):
        invoice = generate_ev_invoice(self.options)
        rendered = self._render_summary(invoice)

        self.assertIn("Payment received: Deposit (02/05/26)", rendered)
        self.assertIn("Payment received: Deposit", rendered)

    @staticmethod
    def _payment_row(document):
        return next(
            row
            for section in document.sections
            for row in section.rows
            if row.get("description", "").startswith("Payment received")
        )

    @staticmethod
    def _render_summary(document):
        template_path = Path(__file__).resolve().parents[1] / "invoice_template.html"
        template = Template(template_path.read_text())
        sections = [
            {"heading": section.heading, "rows": section.rows}
            for section in document.sections
        ]
        return template.render(
            data={
                "document_type": document.document_type,
                "customer_name": document.customer_name,
                "invoice_number": document.invoice_number,
                "title": document.title,
                "sections": sections,
            },
            business={
                "business_name": "Business",
                "address_lines": [],
                "phone_number": "",
                "email_address": "",
                "account_number": "",
                "sort_code": "",
            },
            date_today="15/06/2026",
            logo_data_uri=None,
        )


if __name__ == "__main__":
    unittest.main()
