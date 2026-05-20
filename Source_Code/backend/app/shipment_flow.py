"""Door-to-door shipment statuses, transitions, and route legs."""

from __future__ import annotations

from app.delivery_dates import clamp_delivery_date
from app.models import ShipmentRow

ALLOWED_STATUSES = frozenset(
    {
        "Created",
        "Assigned",
        "Picked Up",
        "In Transit",
        "Delivered",
        "Delayed",
        "On Hold",
        "Cancelled",
    }
)

CLIENT_EDITABLE_STATUSES = frozenset({"Created", "Assigned"})
HOLDABLE_STATUSES = frozenset({"Created", "Assigned", "Delayed"})
CANCELLABLE_STATUSES = frozenset({"Created", "Assigned", "On Hold", "Delayed"})

STATUS_PIPELINE = ["Created", "Assigned", "Picked Up", "In Transit", "Delivered"]

TRANSITIONS: dict[str, frozenset[str]] = {
    "Created": frozenset({"Assigned", "Delayed", "On Hold", "Cancelled"}),
    "Assigned": frozenset({"Picked Up", "Delayed", "On Hold", "Cancelled"}),
    "Picked Up": frozenset({"In Transit", "Delayed"}),
    "In Transit": frozenset({"Delivered", "Delayed"}),
    "Delayed": frozenset({"Assigned", "Picked Up", "In Transit", "On Hold", "Cancelled"}),
    "On Hold": frozenset({"Cancelled"}),
    "Delivered": frozenset(),
    "Cancelled": frozenset(),
}


def can_transition(from_status: str, to_status: str) -> bool:
    if to_status not in ALLOWED_STATUSES:
        return False
    allowed = TRANSITIONS.get(from_status)
    if allowed is None:
        return True
    return to_status in allowed


def delivery_phase(status: str) -> str:
    if status in ("Created", "On Hold"):
        return "pending"
    if status == "Assigned":
        return "pickup"
    if status == "Cancelled":
        return "cancelled"
    return "delivery"


def shipment_public(s: ShipmentRow) -> dict:
    phase = delivery_phase(s.status)
    pickup = s.pickup_address or "Pickup"
    delivery = s.destination
    return {
        "shipmentId": s.id,
        "orderId": s.order_id,
        "status": s.status,
        "phase": phase,
        "pickupAddress": pickup,
        "deliveryAddress": delivery,
        "destination": delivery,
        "pickupLat": s.pickup_lat,
        "pickupLng": s.pickup_lng,
        "deliveryLat": s.dest_lat,
        "deliveryLng": s.dest_lng,
        "parcelCount": s.parcel_count,
        "eta": s.eta,
        "driverId": s.driver_id,
        "deliveryDate": clamp_delivery_date(s.delivery_date) if s.delivery_date else None,
        "deliveryOption": s.delivery_option,
        "clientId": s.client_id,
        "holdReason": s.hold_reason,
        "statusBeforeHold": s.status_before_hold,
        "cancelReason": s.cancel_reason,
    }


def active_target_lat_lng(s: ShipmentRow) -> tuple[float, float]:
    if delivery_phase(s.status) in ("pickup", "pending", "cancelled"):
        return s.pickup_lat, s.pickup_lng
    return s.dest_lat, s.dest_lng


def lerp_route(
    a: tuple[float, float], b: tuple[float, float], steps: int = 6
) -> list[tuple[float, float]]:
    if steps < 2:
        return [a, b]
    out: list[tuple[float, float]] = []
    for i in range(steps):
        t = i / (steps - 1)
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out
