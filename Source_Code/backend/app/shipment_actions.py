"""Hold, cancel, and delivery-date rules for shipments."""

from __future__ import annotations

from app.delivery_dates import assert_delivery_date_forward, clamp_delivery_date
from app.models import ShipmentRow
from app.shipment_flow import (
    CANCELLABLE_STATUSES,
    CLIENT_EDITABLE_STATUSES,
    HOLDABLE_STATUSES,
    shipment_public,
)


def shipment_action_flags(s: ShipmentRow) -> dict[str, bool]:
    return {
        "canEdit": s.status in CLIENT_EDITABLE_STATUSES,
        "canHold": s.status in HOLDABLE_STATUSES,
        "canCancel": s.status in CANCELLABLE_STATUSES,
        "canReleaseHold": s.status == "On Hold",
    }


def shipment_to_client_order(s: ShipmentRow) -> dict:
    pub = shipment_public(s)
    flags = shipment_action_flags(s)
    return {
        "orderId": s.order_id,
        "shipmentId": s.id,
        "status": s.status,
        "phase": pub["phase"],
        "eta": s.eta,
        "destination": s.destination,
        "pickupAddress": pub["pickupAddress"],
        "deliveryAddress": pub["deliveryAddress"],
        "pickupLat": s.pickup_lat,
        "pickupLng": s.pickup_lng,
        "deliveryLat": s.dest_lat,
        "deliveryLng": s.dest_lng,
        "deliveryOption": s.delivery_option,
        "driverId": s.driver_id,
        "deliveryDate": clamp_delivery_date(s.delivery_date) if s.delivery_date else None,
        "parcelCount": s.parcel_count,
        "holdReason": s.hold_reason,
        "cancelReason": s.cancel_reason,
        **flags,
    }


OFFICE_ASSIGNABLE_STATUSES = frozenset(
    {"Created", "Assigned", "Picked Up", "In Transit", "Delayed"}
)


def apply_assign_driver(s: ShipmentRow, driver_id: str) -> None:
    if s.status not in OFFICE_ASSIGNABLE_STATUSES:
        raise ValueError(f"Cannot assign shipment in status {s.status}")
    did = driver_id.strip()
    if not did:
        raise ValueError("Driver id is required")
    s.driver_id = did
    if s.status == "Created":
        s.status = "Assigned"


def apply_unassign_driver(s: ShipmentRow) -> None:
    if s.status not in OFFICE_ASSIGNABLE_STATUSES:
        raise ValueError(f"Cannot unassign shipment in status {s.status}")
    if not s.driver_id:
        raise ValueError("Shipment has no driver assigned")
    s.driver_id = None
    if s.status in ("Assigned", "Picked Up", "In Transit", "Delayed"):
        s.status = "Created"


def apply_hold(s: ShipmentRow, reason: str) -> None:
    if s.status not in HOLDABLE_STATUSES:
        raise ValueError(f"Cannot hold shipment in status {s.status}")
    text = reason.strip()
    if len(text) < 3:
        raise ValueError("Please provide a short reason for the hold")
    s.status_before_hold = s.status
    s.status = "On Hold"
    s.hold_reason = text[:500]
    s.cancel_reason = None


def apply_release_hold(s: ShipmentRow) -> None:
    if s.status != "On Hold":
        raise ValueError("Shipment is not on hold")
    restore = s.status_before_hold or ("Assigned" if s.driver_id else "Created")
    if restore not in CLIENT_EDITABLE_STATUSES and restore != "Delayed":
        restore = "Assigned" if s.driver_id else "Created"
    s.status = restore
    s.status_before_hold = None
    s.hold_reason = None


def apply_cancel(s: ShipmentRow, reason: str | None) -> None:
    if s.status not in CANCELLABLE_STATUSES:
        raise ValueError(f"Cannot cancel shipment in status {s.status}")
    s.status = "Cancelled"
    s.cancel_reason = (reason or "Cancelled by user").strip()[:500]
    s.hold_reason = None
    s.status_before_hold = None
    s.driver_id = None
