"""Every Angle specific configuration and services."""

import os
from .config import BusinessConfig, Address
from .invoice import Line_item

# Every Angle Business Configuration (loaded from environment variables)
EV_CONFIG = BusinessConfig(
    business_name=os.getenv("BUSINESS_NAME", "Every Angle"),
    address=Address(
        line_1=os.getenv("BUSINESS_ADDRESS_LINE1", ""),
        line_2=os.getenv("BUSINESS_ADDRESS_LINE2", ""),
        line_3=os.getenv("BUSINESS_ADDRESS_LINE3", "")
    ),
    phone_number=os.getenv("BUSINESS_PHONE", ""),
    email_address=os.getenv("BUSINESS_EMAIL", ""),
    account_number=os.getenv("BUSINESS_ACCOUNT_NUMBER", ""),
    sort_code=os.getenv("BUSINESS_SORT_CODE", ""),
    logo_path="static/logo.png",
    deposit_percentage=20.0
)

# Service Line Items
SINGING_WAITER_DUET = Line_item(
    description="Singing Waiter - After Dessert (Duet)", price=650.0)
SINGING_WAITER_TRIO = Line_item(
    description="Singing Waiter - After Dessert (Trio)", price=975.0)
ACOUSTIC_1PC = Line_item(
    description="Acoustic - 1 piece - Guitar or Piano - Ceremony and Reception", price=280.0)
SAX_AFTERNOON_SOLO = Line_item(
    description="Sax Afternoon (solo + backing tracks)", price=350.0)
SAX_EVENING_SOLO = Line_item(
    description="Sax evening (solo + backing tracks)", price=400.0)
SAX_WITH_BAND = Line_item(description="Sax w/ band", price=300.0)
ACOUSTIC_DUET = Line_item(
    description="Acoustic - Duet - Guitar and Piano - Ceremony and Reception", price=400.0)
BAGPIPES_ARRIVAL_CEREMONY = Line_item(
    description="Bagpipes - Arrival - Ceremony", price=225.0)
BAGPIPES_ARRIVAL_SPEECHES = Line_item(
    description="Bagpipes - Arrival - Speeches", price=300.0)
BAND_3PC = Line_item(description="Band (3 piece)", price=900.0)
BAND_5PC = Line_item(description="Band (5 piece)", price=1500.0)
BAND_7PC = Line_item(description="Band (7 piece)", price=2100.0)
FILM_HIGHLIGHTS = Line_item(description="Film (Highlights)", price=995.0)
FILM_HIGHLIGHTS_2ND = Line_item(
    description="Film (Highlights) + 2nd shooter", price=1245.0)
FILM_AFTERNOON_2ND = Line_item(
    description="Film (Afternoon) + 2nd shooter", price=1250.0)
FILM_AFTERNOON_DANCE_2ND = Line_item(
    description="Film (Afternoon + Dance) + 2nd shooter", price=1500.0)
FILM_FEATURE_2ND = Line_item(
    description="Film (Feature Length) + 2nd shooter", price=1750.0)
PHOTOS_AISLE_SPEECHES = Line_item(
    description="Photos (aisle to speeches)", price=750.0)
PHOTO_GETTING_READY_DANCING = Line_item(
    description="Photo (getting ready to dancing)", price=995.0)
PHOTO_POSED_GROUP = Line_item(
    description="Photo (posed group shots)", price=0.0)
DJ_ONLY = Line_item(description="DJ only", price=450.0)
SAX_AND_DJ = Line_item(description="Sax & DJ", price=750.0)
BAGPIPES_EVENING_BAND = Line_item(
    description="Bagpipes Evening w/ band", price=250.0)
EXTENDED_CEILIDH = Line_item(description="Extended Ceilidh", price=100.0)
FILM_EXTENDED_HIGHLIGHTS = Line_item(
    description="Film (Extended Highlights)", price=1500.0)
FILM_STILLS = Line_item(description="Film Stills", price=100.0)
LATE_FINISH_1AM = Line_item(description="Late Finish (1am)", price=125.0)
LATE_FINISH_2AM = Line_item(description="Late Finish (2am)", price=250.0)
