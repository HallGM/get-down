"""Flask web app for Every Angle invoice generation."""

import os
import logging
from flask import Flask, render_template, request, jsonify, send_file
from src.invoice_ev import generate_ev_invoice, generate_receipt, EVInvoiceOptions
from src.generic_invoice import create_generic_invoice, create_generic_receipt
from src.invoice import Line_item
from src.ev_config import EV_CONFIG
from src.services import get_service_by_id, get_all_services_flat
from io import BytesIO

# Configure logging for stdout/stderr (required for Render)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration from environment variables
app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() == 'true'
app.config['SECRET_KEY'] = os.getenv(
    'SECRET_KEY', 'dev-key-change-in-production')
app.config['ENV'] = os.getenv('FLASK_ENV', 'production')

logger.info(f"Flask app initialized in {app.config['ENV']} mode")


@app.route("/", methods=["GET"])
def form():
    """Render the invoice form."""
    logger.info("Form page requested")
    services = get_all_services_flat()
    return render_template("form.html", services=services)


@app.route("/generate", methods=["POST"])
def generate_invoice():
    """Generate an invoice from form data."""
    try:
        data = request.get_json()
        logger.info(
            f"Invoice generation requested for {data.get('customer_name', 'unknown')}")

        # Validate required fields
        if not data.get("customer_name"):
            return jsonify({"error": "Customer name is required"}), 400
        if not data.get("event_date"):
            return jsonify({"error": "Event date is required"}), 400
        if not data.get("venue"):
            return jsonify({"error": "Venue is required"}), 400
        if not data.get("invoice_number"):
            return jsonify({"error": "Invoice number is required"}), 400

        # Build line items from presets and custom items
        line_items = []

        # Add preset items
        if data.get("preset_ids"):
            for preset_id in data["preset_ids"]:
                try:
                    line_items.append(get_service_by_id(preset_id))
                except ValueError as e:
                    return jsonify({"error": str(e)}), 400

        # Add custom items
        if data.get("custom_items"):
            for item in data["custom_items"]:
                if not item.get("description"):
                    return jsonify({"error": "Custom item description is required"}), 400
                try:
                    price = float(item.get("price", 0))
                except (ValueError, TypeError):
                    return jsonify({"error": "Custom item price must be a number"}), 400
                line_items.append(
                    Line_item(description=item["description"], price=price))

        # Must have at least one line item
        if not line_items:
            return jsonify({"error": "At least one service or custom item is required"}), 400

        # Parse optional fields
        discount_percent = None
        if data.get("discount_percent"):
            try:
                discount_percent = float(data["discount_percent"])
            except (ValueError, TypeError):
                return jsonify({"error": "Discount percent must be a number"}), 400

        travel_cost = None
        if data.get("travel_cost"):
            try:
                travel_cost = float(data["travel_cost"])
            except (ValueError, TypeError):
                return jsonify({"error": "Travel cost must be a number"}), 400

        # Parse additional charges
        additional_charges = None
        if data.get("additional_charges"):
            additional_charges = []
            for charge in data["additional_charges"]:
                if not charge.get("description"):
                    return jsonify({"error": "Charge description is required"}), 400
                try:
                    price = float(charge.get("price", 0))
                except (ValueError, TypeError):
                    return jsonify({"error": "Charge amount must be a number"}), 400
                additional_charges.append(Line_item(
                    description=charge["description"],
                    price=price
                ))

        # Parse payments made
        payment_made = None
        if data.get("payment_made"):
            payment_made = []
            for payment in data["payment_made"]:
                if not payment.get("description"):
                    return jsonify({"error": "Payment description is required"}), 400
                try:
                    price = float(payment.get("price", 0))
                except (ValueError, TypeError):
                    return jsonify({"error": "Payment amount must be a number"}), 400
                payment_made.append(Line_item(
                    description=payment["description"],
                    price=price
                ))

        # Create invoice options
        options = EVInvoiceOptions(
            customer_name=data["customer_name"],
            event_date=data["event_date"],
            venue=data["venue"],
            invoice_number=data["invoice_number"],
            line_items=line_items,
            discount_percent=discount_percent,
            travel_cost=travel_cost,
            payment_made=payment_made,
            additional_charges=additional_charges,
        )

        # Generate invoice
        show_deposit = data.get("show_deposit", True)
        deposit_only = data.get("deposit_only", False)
        amount_due_override = data.get("amount_due_override")

        invoice = generate_ev_invoice(
            options,
            show_deposit=show_deposit,
            deposit_only=deposit_only,
            amount_due_override=amount_due_override
        )

        # Generate PDF bytes
        pdf_bytes = create_generic_invoice(
            invoice, EV_CONFIG, return_bytes=True)

        # Return PDF as download
        return send_file(
            BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"invoice-{data['invoice_number']}.pdf"
        )

    except Exception as e:
        logger.error(f"Error generating invoice: {str(e)}", exc_info=True)
        return jsonify({"error": f"Error generating invoice: {str(e)}"}), 500


@app.route("/generate-receipt", methods=["POST"])
def generate_receipt_route():
    """Generate a receipt from form data."""
    try:
        data = request.get_json()
        logger.info(
            f"Receipt generation requested for {data.get('customer_name', 'unknown')}")

        # Validate required fields
        if not data.get("customer_name"):
            return jsonify({"error": "Customer name is required"}), 400
        if not data.get("event_date"):
            return jsonify({"error": "Event date is required"}), 400
        if not data.get("venue"):
            return jsonify({"error": "Venue is required"}), 400
        if not data.get("invoice_number"):
            return jsonify({"error": "Invoice number is required"}), 400

        # Build line items from presets and custom items
        line_items = []

        # Add preset items
        if data.get("preset_ids"):
            for preset_id in data["preset_ids"]:
                try:
                    line_items.append(get_service_by_id(preset_id))
                except ValueError as e:
                    return jsonify({"error": str(e)}), 400

        # Add custom items
        if data.get("custom_items"):
            for item in data["custom_items"]:
                if not item.get("description"):
                    return jsonify({"error": "Custom item description is required"}), 400
                try:
                    price = float(item.get("price", 0))
                except (ValueError, TypeError):
                    return jsonify({"error": "Custom item price must be a number"}), 400
                line_items.append(
                    Line_item(description=item["description"], price=price))

        # Must have at least one line item
        if not line_items:
            return jsonify({"error": "At least one service or custom item is required"}), 400

        # Parse optional fields
        discount_percent = None
        if data.get("discount_percent"):
            try:
                discount_percent = float(data["discount_percent"])
            except (ValueError, TypeError):
                return jsonify({"error": "Discount percent must be a number"}), 400

        travel_cost = None
        if data.get("travel_cost"):
            try:
                travel_cost = float(data["travel_cost"])
            except (ValueError, TypeError):
                return jsonify({"error": "Travel cost must be a number"}), 400

        # Parse additional charges
        additional_charges = None
        if data.get("additional_charges"):
            additional_charges = []
            for charge in data["additional_charges"]:
                if not charge.get("description"):
                    return jsonify({"error": "Charge description is required"}), 400
                try:
                    price = float(charge.get("price", 0))
                except (ValueError, TypeError):
                    return jsonify({"error": "Charge amount must be a number"}), 400
                additional_charges.append(Line_item(
                    description=charge["description"],
                    price=price
                ))

        # Parse payments made
        payment_made = None
        if data.get("payment_made"):
            payment_made = []
            for payment in data["payment_made"]:
                if not payment.get("description"):
                    return jsonify({"error": "Payment description is required"}), 400
                try:
                    price = float(payment.get("price", 0))
                except (ValueError, TypeError):
                    return jsonify({"error": "Payment amount must be a number"}), 400
                payment_made.append(Line_item(
                    description=payment["description"],
                    price=price
                ))

        # Create invoice options
        options = EVInvoiceOptions(
            customer_name=data["customer_name"],
            event_date=data["event_date"],
            venue=data["venue"],
            invoice_number=data["invoice_number"],
            line_items=line_items,
            discount_percent=discount_percent,
            travel_cost=travel_cost,
            payment_made=payment_made,
            additional_charges=additional_charges,
        )

        # Generate receipt
        show_deposit = data.get("show_deposit", True)

        receipt = generate_receipt(
            options,
            show_deposit=show_deposit
        )

        # Generate PDF bytes
        pdf_bytes = create_generic_receipt(
            receipt, EV_CONFIG, return_bytes=True)

        # Return PDF as download
        return send_file(
            BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"receipt-{data['invoice_number']}.pdf"
        )

    except Exception as e:
        logger.error(f"Error generating receipt: {str(e)}", exc_info=True)
        return jsonify({"error": f"Error generating receipt: {str(e)}"}), 500


if __name__ == "__main__":
    # Only run in debug mode if explicitly set, otherwise gunicorn starts it
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('PORT', 5000))
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
