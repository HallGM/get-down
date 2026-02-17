from typing import List, Any, Optional
import base64
from datetime import datetime
import yaml
from weasyprint import HTML, CSS
from jinja2 import Template
import os
from dataclasses import dataclass
from typing import List
from abc import ABC


@dataclass
class Line_item:
    description: str
    price: float
    bold: bool = False


@dataclass
class Section:
    heading: str
    rows: list[dict]


@dataclass
class Document(ABC):
    """Base class for invoice and receipt documents."""
    customer_name: str
    invoice_number: str
    title: str
    sections: list[Section]

    @property
    def document_type(self) -> str:
        """Return the document type ('invoice' or 'receipt')."""
        raise NotImplementedError

    def get_linked_invoice_number(self) -> Optional[str]:
        """Return linked invoice number if applicable (None for invoices)."""
        return None


@dataclass
class Invoice(Document):
    """Represents an invoice document."""

    @property
    def document_type(self) -> str:
        return "invoice"


@dataclass
class Receipt(Document):
    """Represents a receipt document, linked to an invoice."""
    linked_invoice_number: str

    @property
    def document_type(self) -> str:
        return "receipt"

    def get_linked_invoice_number(self) -> Optional[str]:
        return self.linked_invoice_number


def _render_document(document: Document, return_bytes: bool = False) -> None | bytes:
    """
    Base function to render and generate both invoices and receipts.
    If return_bytes is True, returns PDF as bytes (BytesIO). Otherwise, writes to disk.
    """
    from io import BytesIO

    output_directory = "output"
    logoPath = "static/logo.png"
    stylesheet_path = './dejavu_sans.css'

    with open(logoPath, "rb") as image_file:
        encoded_logo = base64.b64encode(image_file.read()).decode('utf-8')

    logo_data_uri = f"data:image/png;base64,{encoded_logo}"

    # Load and render the template
    with open('invoice_template.html', 'r') as file:
        template_content = file.read()

    template = Template(template_content)

    formatted_date = datetime.today().strftime('%d/%m/%Y')
    document_html = template.render(
        data={
            "customer_name": document.customer_name,
            "invoice_number": document.invoice_number,
            "title": document.title,
            "document_type": document.document_type,
            "linked_invoice_number": document.get_linked_invoice_number(),
            "sections": [
                {"heading": section.heading, "rows": section.rows}
                for section in document.sections
            ]
        },
        date_today=formatted_date,
        logo_data_uri=logo_data_uri,
    )

    if return_bytes:
        # Generate PDF to bytes
        pdf_bytes = BytesIO()
        HTML(string=document_html).write_pdf(
            pdf_bytes,
            stylesheets=[CSS(stylesheet_path)] if os.path.exists(
                stylesheet_path) else None
        )
        pdf_bytes.seek(0)
        return pdf_bytes.getvalue()
    else:
        # Ensure output directory exists
        os.makedirs(output_directory, exist_ok=True)

        # Output PDF path based on document type
        if document.document_type == "receipt":
            output_pdf_path = os.path.join(
                output_directory, f"receipt-{document.invoice_number}.pdf")
        else:
            output_pdf_path = os.path.join(
                output_directory, f"invoice-{document.invoice_number}.pdf")

        # Generate PDF using WeasyPrint
        HTML(string=document_html).write_pdf(
            output_pdf_path,
            stylesheets=[CSS(stylesheet_path)] if os.path.exists(
                stylesheet_path) else None
        )


def create_invoice(invoice: Invoice, return_bytes: bool = False) -> None | bytes:
    """
    Render and generate invoice from an Invoice dataclass with sections.
    If return_bytes is True, returns PDF bytes instead of writing to disk.
    """
    return _render_document(invoice, return_bytes=return_bytes)


def create_receipt(receipt: Receipt, return_bytes: bool = False) -> None | bytes:
    """
    Render and generate receipt from a Receipt dataclass with sections.
    If return_bytes is True, returns PDF bytes instead of writing to disk.
    """
    return _render_document(receipt, return_bytes=return_bytes)
