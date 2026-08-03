"""Generic invoice generation with configurable business details."""

from typing import List, Optional
import base64
from datetime import datetime
import os
from io import BytesIO
from weasyprint import HTML, CSS
from jinja2 import Template
from dataclasses import dataclass

from .invoice import Invoice, Receipt, Line_item, Section, Document
from .config import BusinessConfig, Address


def _get_logo_data_uri(business_config: BusinessConfig) -> Optional[str]:
    """
    Get logo as a data URI, or return None if no logo is configured.
    """
    if not business_config.logo_path or not os.path.exists(business_config.logo_path):
        return None
    
    with open(business_config.logo_path, "rb") as image_file:
        encoded_logo = base64.b64encode(image_file.read()).decode('utf-8')
    
    # Determine file extension for MIME type
    ext = os.path.splitext(business_config.logo_path)[1].lower()
    mime_types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
    }
    mime_type = mime_types.get(ext, 'image/png')
    
    return f"data:{mime_type};base64,{encoded_logo}"


def _render_document_with_config(
    document: Document,
    business_config: BusinessConfig,
    return_bytes: bool = False,
    invoice_date: Optional[str] = None,
    customer_address: Optional["Address"] = None,
    show_contact_line: bool = True,
    gig_details: Optional[dict] = None,
) -> Optional[bytes]:
    """
    Generic function to render and generate invoices and receipts with custom business config.
    If return_bytes is True, returns PDF as bytes. Otherwise, writes to disk.
    
    Args:
        document: The document to render
        business_config: Business configuration (issuer details)
        return_bytes: If True, return PDF bytes; otherwise write to disk
        invoice_date: Optional invoice date (YYYY-MM-DD format); falls back to today
        customer_address: Optional Address for the customer (Every Angle for person invoices)
        show_contact_line: Whether to show the "Got a question..." contact line (default True)
    """
    # Get the app root directory (parent of src/)
    app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    output_directory = os.path.join(app_root, "output")
    stylesheet_path = os.path.join(app_root, 'dejavu_sans.css')
    template_path = os.path.join(app_root, 'invoice_template.html')
    
    logo_data_uri = _get_logo_data_uri(business_config)
    address_lines = business_config.address.to_lines()
    
    # Load and render the template
    with open(template_path, 'r') as file:
        template_content = file.read()
    
    template = Template(template_content)
    
    # Use provided invoice date or fall back to today
    if invoice_date:
        formatted_date = invoice_date
    else:
        formatted_date = datetime.today().strftime('%d/%m/%Y')
    
    # Prepare business details for template
    business_details = {
        "business_name": business_config.business_name,
        "address_lines": address_lines,
        "phone_number": business_config.phone_number,
        "email_address": business_config.email_address,
        "account_number": business_config.account_number,
        "sort_code": business_config.sort_code,
    }
    
    # Prepare customer address lines if provided
    customer_address_lines = []
    if customer_address:
        customer_address_lines = customer_address.to_lines()
    
    # Prepare document data
    document_data = {
        "customer_name": document.customer_name,
        "invoice_number": document.invoice_number,
        "title": document.title,
        "document_type": document.document_type,
        "linked_invoice_number": document.get_linked_invoice_number(),
        "sections": [
            {"heading": section.heading, "rows": section.rows}
            for section in document.sections
        ],
        "customer_address_lines": customer_address_lines,
        "show_contact_line": show_contact_line,
        "gig": gig_details,
    }
    
    document_html = template.render(
        data=document_data,
        business=business_details,
        date_today=formatted_date,
        logo_data_uri=logo_data_uri,
    )
    
    if return_bytes:
        # Generate PDF to bytes
        pdf_bytes = BytesIO()
        HTML(string=document_html).write_pdf(
            pdf_bytes,
            stylesheets=[CSS(stylesheet_path)] if os.path.exists(stylesheet_path) else None
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
            stylesheets=[CSS(stylesheet_path)] if os.path.exists(stylesheet_path) else None
        )
        return None


def create_generic_invoice(
    invoice: Invoice,
    business_config: BusinessConfig,
    **kwargs,
) -> Optional[bytes]:
    """
    Render and generate invoice with custom business configuration.
    See _render_document_with_config for the full set of supported kwargs
    (return_bytes, invoice_date, customer_address, show_contact_line, gig_details).
    """
    return _render_document_with_config(invoice, business_config, **kwargs)


def create_generic_receipt(
    receipt: Receipt,
    business_config: BusinessConfig,
    **kwargs,
) -> Optional[bytes]:
    """
    Render and generate receipt with custom business configuration.
    See _render_document_with_config for the full set of supported kwargs
    (return_bytes, invoice_date, customer_address, show_contact_line).
    """
    return _render_document_with_config(receipt, business_config, **kwargs)
