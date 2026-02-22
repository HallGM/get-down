"""Service presets for Every Angle invoice generation."""

from .invoice import Line_item

# Service categories with preset line items
SERVICES = {
    "singing": [
        {"id": "singing_waiter_duet", "name": "Singing Waiter - After Dessert (Duet)", "item": Line_item(
            description="Singing Waiter - After Dessert (Duet)", price=650.0)},
        {"id": "singing_waiter_trio", "name": "Singing Waiter - After Dessert (Trio)", "item": Line_item(
            description="Singing Waiter - After Dessert (Trio)", price=975.0)},
    ],
    "acoustic": [
        {"id": "acoustic_1pc", "name": "Acoustic - 1 piece - Guitar or Piano - Ceremony and Reception",
            "item": Line_item(description="Acoustic - 1 piece - Guitar or Piano - Ceremony and Reception", price=280.0)},
        {"id": "acoustic_duet", "name": "Acoustic - Duet - Guitar and Piano - Ceremony and Reception",
            "item": Line_item(description="Acoustic - Duet - Guitar and Piano - Ceremony and Reception", price=400.0)},
    ],
    "sax": [
        {"id": "sax_afternoon_solo", "name": "Sax Afternoon (solo + backing tracks)", "item": Line_item(
            description="Sax Afternoon (solo + backing tracks)", price=350.0)},
        {"id": "sax_evening_solo", "name": "Sax evening (solo + backing tracks)", "item": Line_item(
            description="Sax evening (solo + backing tracks)", price=400.0)},
        {"id": "sax_with_band", "name": "Sax w/ band",
            "item": Line_item(description="Sax w/ band", price=300.0)},
        {"id": "sax_and_dj", "name": "Sax & DJ", "item": Line_item(
            description="Sax & DJ", price=750.0)},
    ],
    "bagpipes": [
        {"id": "bagpipes_arrival_ceremony", "name": "Bagpipes - Arrival - Ceremony",
            "item": Line_item(description="Bagpipes - Arrival - Ceremony", price=225.0)},
        {"id": "bagpipes_arrival_speeches", "name": "Bagpipes - Arrival - Speeches",
            "item": Line_item(description="Bagpipes - Arrival - Speeches", price=300.0)},
        {"id": "bagpipes_evening_band", "name": "Bagpipes Evening w/ band",
            "item": Line_item(description="Bagpipes Evening w/ band", price=250.0)},
    ],
    "band": [
        {"id": "band_3pc", "name": "Band (3 piece)", "item": Line_item(
            description="Band (3 piece)", price=900.0)},
        {"id": "band_5pc", "name": "Band (5 piece)", "item": Line_item(
            description="Band (5 piece)", price=1500.0)},
        {"id": "band_7pc", "name": "Band (7 piece)", "item": Line_item(
            description="Band (7 piece)", price=2100.0)},
    ],
    "film": [
        {"id": "film_highlights", "name": "Film (Highlights)", "item": Line_item(
            description="Film (Highlights)", price=995.0)},
        {"id": "film_highlights_2nd", "name": "Film (Highlights) + 2nd shooter", "item": Line_item(
            description="Film (Highlights) + 2nd shooter", price=1245.0)},
        {"id": "film_afternoon_2nd", "name": "Film (Afternoon) + 2nd shooter", "item": Line_item(
            description="Film (Afternoon) + 2nd shooter", price=1250.0)},
        {"id": "film_afternoon_dance_2nd", "name": "Film (Afternoon + Dance) + 2nd shooter", "item": Line_item(
            description="Film (Afternoon + Dance) + 2nd shooter", price=1500.0)},
        {"id": "film_feature_2nd", "name": "Film (Feature Length) + 2nd shooter", "item": Line_item(
            description="Film (Feature Length) + 2nd shooter", price=1750.0)},
        {"id": "film_extended_highlights", "name": "Film (Extended Highlights)", "item": Line_item(
            description="Film (Extended Highlights)", price=1500.0)},
        {"id": "film_stills", "name": "Film Stills", "item": Line_item(
            description="Film Stills", price=100.0)},
    ],
    "photo": [
        {"id": "photos_aisle_speeches", "name": "Photos (aisle to speeches)", "item": Line_item(
            description="Photos (aisle to speeches)", price=750.0)},
        {"id": "photo_getting_ready_dancing", "name": "Photo (getting ready to dancing)", "item": Line_item(
            description="Photo (getting ready to dancing)", price=995.0)},
        {"id": "photo_posed_group", "name": "Photo (posed group shots)", "item": Line_item(
            description="Photo (posed group shots)", price=0.0)},
    ],
    "dj": [
        {"id": "dj_only", "name": "DJ only", "item": Line_item(
            description="DJ only", price=450.0)},
    ],
    "other": [
        {"id": "extended_ceilidh", "name": "Extended Ceilidh",
            "item": Line_item(description="Extended Ceilidh", price=100.0)},
        {"id": "late_finish_1am", "name": "Late Finish (1am)", "item": Line_item(
            description="Late Finish (1am)", price=125.0)},
        {"id": "late_finish_2am", "name": "Late Finish (2am)", "item": Line_item(
            description="Late Finish (2am)", price=250.0)},
    ],
}


def get_service_by_id(service_id: str) -> Line_item:
    """Get a Line_item by service ID. Raises ValueError if not found."""
    for category in SERVICES.values():
        for service in category:
            if service["id"] == service_id:
                return service["item"]
    raise ValueError(f"Service ID '{service_id}' not found")


def get_all_services_flat() -> list[dict]:
    """Return all services as a flat list with category info for frontend."""
    result = []
    for category, services in SERVICES.items():
        for service in services:
            result.append({
                "id": service["id"],
                "name": service["name"],
                "category": category,
                "price": service["item"].price,
            })
    return result
