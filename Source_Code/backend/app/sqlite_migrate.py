"""Lightweight SQLite migrations without Alembic."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

HUB_LAT = 51.5074
HUB_LNG = -0.1278


def apply_sqlite_migrations(engine: Engine) -> None:
    if "sqlite" not in str(engine.url):
        return
    insp = inspect(engine)
    if not insp.has_table("shipments"):
        return
    cols = {c["name"] for c in insp.get_columns("shipments")}
    with engine.begin() as conn:
        if "delivery_date" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN delivery_date VARCHAR(16)"))
        conn.execute(
            text(
                "UPDATE shipments SET delivery_date = '2026-05-10' "
                "WHERE id = 'S2001' AND (delivery_date IS NULL OR delivery_date = '')"
            )
        )
        conn.execute(
            text(
                "UPDATE shipments SET delivery_date = '2026-05-11' "
                "WHERE id = 'S2002' AND (delivery_date IS NULL OR delivery_date = '')"
            )
        )
        conn.execute(
            text(
                "UPDATE shipments SET delivery_date = '2026-05-15' "
                "WHERE id = 'S2003' AND (delivery_date IS NULL OR delivery_date = '')"
            )
        )
        if "delivery_option" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN delivery_option VARCHAR(48)"))
        conn.execute(
            text(
                "UPDATE shipments SET delivery_option = 'Standard' "
                "WHERE delivery_option IS NULL OR delivery_option = ''"
            )
        )
        if "pickup_address" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN pickup_address VARCHAR(256)"))
        if "pickup_lat" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN pickup_lat FLOAT"))
        if "pickup_lng" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN pickup_lng FLOAT"))
        if "parcel_count" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN parcel_count INTEGER DEFAULT 1"))
        conn.execute(
            text(
                f"UPDATE shipments SET pickup_lat = {HUB_LAT}, pickup_lng = {HUB_LNG} "
                "WHERE pickup_lat IS NULL"
            )
        )
        conn.execute(
            text(
                "UPDATE shipments SET pickup_address = 'CMP600 Hub' "
                "WHERE pickup_address IS NULL OR pickup_address = ''"
            )
        )
        conn.execute(
            text("UPDATE shipments SET parcel_count = 1 WHERE parcel_count IS NULL")
        )
        # Door-to-door demo labels for seed ids
        conn.execute(
            text(
                "UPDATE shipments SET pickup_address = 'Hackney sender flat', "
                f"pickup_lat = 51.545, pickup_lng = -0.055, parcel_count = 1 "
                "WHERE id = 'S2001'"
            )
        )
        conn.execute(
            text(
                "UPDATE shipments SET pickup_address = 'City sender office', "
                "pickup_lat = 51.512, pickup_lng = -0.098, parcel_count = 2 "
                "WHERE id = 'S2002'"
            )
        )
        conn.execute(
            text(
                "UPDATE shipments SET pickup_address = 'Birmingham client', "
                "pickup_lat = 52.486, pickup_lng = -1.890, parcel_count = 1 "
                "WHERE id = 'S2003'"
            )
        )
        # Normalise legacy status strings if any
        conn.execute(
            text("UPDATE shipments SET status = 'Picked Up' WHERE status = 'PickedUp'")
        )
        if "hold_reason" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN hold_reason TEXT"))
        if "cancel_reason" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN cancel_reason TEXT"))
        if "status_before_hold" not in cols:
            conn.execute(text("ALTER TABLE shipments ADD COLUMN status_before_hold VARCHAR(32)"))

        # Clamp delivery dates into today … today+30 (fixes test bookings at 2099 etc.)
        from app.delivery_dates import clamp_delivery_date

        rows = conn.execute(text("SELECT id, delivery_date FROM shipments")).fetchall()
        for sid, dd in rows:
            if not dd:
                continue
            fixed = clamp_delivery_date(dd)
            if fixed != dd:
                conn.execute(
                    text("UPDATE shipments SET delivery_date = :d WHERE id = :id"),
                    {"d": fixed, "id": sid},
                )
