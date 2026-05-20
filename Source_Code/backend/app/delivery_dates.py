"""Delivery date window: today through today + MAX_DELIVERY_DAYS_AHEAD."""

from __future__ import annotations

from datetime import date, timedelta

MAX_DELIVERY_DAYS_AHEAD = 30


def today_iso() -> str:
    return date.today().isoformat()


def max_delivery_date_iso() -> str:
    return (date.today() + timedelta(days=MAX_DELIVERY_DAYS_AHEAD)).isoformat()


def clamp_delivery_date(value: str | None) -> str:
    """Clamp to today … today+30 days (inclusive)."""
    today = today_iso()
    ceiling = max_delivery_date_iso()
    if not value or not str(value).strip():
        return today
    v = str(value).strip()[:10]
    if v < today:
        return today
    if v > ceiling:
        return ceiling
    return v


def delivery_date_floor(current: str | None) -> str:
    today = today_iso()
    if not current:
        return today
    booked = clamp_delivery_date(current)
    return booked if booked >= today else today


def assert_delivery_date_forward(current: str | None, new_date: str) -> None:
    floor = delivery_date_floor(current)
    ceiling = max_delivery_date_iso()
    if new_date < floor:
        raise ValueError(
            f"Delivery date cannot be before {floor}. Choose the same date or a later day only."
        )
    if new_date > ceiling:
        raise ValueError(
            f"Delivery date cannot be more than {MAX_DELIVERY_DAYS_AHEAD} days ahead ({ceiling} at latest)."
        )
