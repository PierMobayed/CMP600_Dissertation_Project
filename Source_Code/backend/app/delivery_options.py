"""Catalogue of delivery service options (MVP — simulated). British English copy."""

DELIVERY_OPTIONS: list[dict[str, str]] = [
    {
        "id": "Standard",
        "label": "Standard road freight",
        "description": "Economy routing; typical lead time 2–5 days in this simulation.",
    },
    {
        "id": "Express",
        "label": "Express (next day)",
        "description": "Higher planning priority and a tighter delivery window.",
    },
    {
        "id": "SameDay",
        "label": "Same-day urban",
        "description": "Courier within the same working day in an urban radius (simulated).",
    },
    {
        "id": "PickupPoint",
        "label": "Parcel shop / locker",
        "description": "Delivery to a pickup point; customer collects with a code (no real partner API).",
    },
    {
        "id": "ScheduledWindow",
        "label": "Time-window delivery",
        "description": "Agreed slot; represented here by delivery_date only (see dissertation notes).",
    },
    {
        "id": "TemperatureControlled",
        "label": "Temperature-controlled",
        "description": "Cold chain flag in the prototype — no live IoT telemetry.",
    },
    {
        "id": "WhiteGlove",
        "label": "White-glove (room-of-choice)",
        "description": "Carry-in and light unpack as a premium tier in the prototype.",
    },
]

ALLOWED_DELIVERY_OPTION_IDS = {o["id"] for o in DELIVERY_OPTIONS}
