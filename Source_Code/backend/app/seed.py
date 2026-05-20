"""Demo clients, drivers, and test shipments."""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import ClientRow, DriverRow, ShipmentRow, StatusEventRow

# (pickup label, plat, plng, delivery label, dlat, dlng)
LONDON_TEST_ROUTES: list[tuple[str, float, float, str, float, float]] = [
    ("Hackney sender flat", 51.545, -0.055, "Shoreditch office", 51.525, -0.078),
    ("City sender office", 51.512, -0.098, "Canary Wharf Hub", 51.505, -0.020),
    ("Camden market stall", 51.539, -0.143, "Kings Cross depot", 51.530, -0.124),
    ("Islington home", 51.542, -0.103, "Angel business park", 51.532, -0.106),
    ("Stratford warehouse", 51.541, -0.003, "Westfield collect point", 51.543, 0.007),
    ("Greenwich pier", 51.482, -0.009, "Deptford industrial", 51.474, -0.026),
    ("Wimbledon sender", 51.421, -0.206, "Clapham delivery", 51.462, -0.138),
    ("Richmond sender", 51.461, -0.303, "Putney high street", 51.468, -0.215),
    ("Brixton flat", 51.462, -0.114, "Elephant & Castle hub", 51.494, -0.099),
    ("Bethnal Green shop", 51.527, -0.055, "Whitechapel office", 51.517, -0.070),
    ("Hammersmith sender", 51.492, -0.224, "Shepherds Bush depot", 51.504, -0.219),
    ("Ealing sender", 51.513, -0.308, "Acton delivery unit", 51.507, -0.272),
    ("Croydon sender", 51.372, -0.100, "Bromley hub", 51.406, 0.014),
    ("Enfield sender", 51.652, -0.081, "Tottenham warehouse", 51.588, -0.072),
    ("Walthamstow flat", 51.583, -0.020, "Leyton depot", 51.568, -0.008),
    ("Fulham sender", 51.475, -0.206, "Chelsea office", 51.487, -0.168),
    ("Paddington sender", 51.515, -0.176, "Marylebone delivery", 51.522, -0.157),
    ("Battersea sender", 51.478, -0.149, "Vauxhall hub", 51.486, -0.123),
    ("Dalston sender", 51.546, -0.075, "Hoxton office", 51.530, -0.080),
    ("Peckham sender", 51.474, -0.069, "Bermondsey depot", 51.498, -0.063),
]

DELIVERY_OPTIONS = ["Standard", "Express", "SameDay", "PickupPoint", "ScheduledWindow"]
STATUSES_ASSIGNED = ["Assigned", "Assigned", "Assigned", "Picked Up", "In Transit", "Delayed"]


def _ensure_users(db: Session) -> None:
    clients = [
        ClientRow(id="C001", username="client1", password_plain="demo", display_name="Demo Client"),
        ClientRow(id="C002", username="client2", password_plain="demo", display_name="Second Client"),
    ]
    drivers = [
        DriverRow(id="D101", username="driver1", password_plain="demo", display_name="Alex Driver"),
        DriverRow(id="D102", username="driver2", password_plain="demo", display_name="Sam Driver"),
    ]
    for c in clients:
        db.merge(c)
    for d in drivers:
        db.merge(d)
    db.commit()


def seed_if_empty(db: Session) -> None:
    if db.query(ClientRow).first():
        return
    reset_test_shipments(db, count=20)


def reset_test_shipments(db: Session, count: int = 20, start_id: int = 2001) -> list[str]:
    """Delete all shipments and status events, then load fresh test data."""
    _ensure_users(db)
    db.query(StatusEventRow).delete(synchronize_session=False)
    db.query(ShipmentRow).delete(synchronize_session=False)
    db.commit()

    now = datetime.now(timezone.utc)
    today = date.today()
    created_ids: list[str] = []

    for i in range(count):
        route = LONDON_TEST_ROUTES[i % len(LONDON_TEST_ROUTES)]
        pickup_label, plat, plng, dest_label, dlat, dlng = route
        sid = f"S{start_id + i}"
        oid = f"O{1001 + i}"
        client_id = "C001" if i % 2 == 0 else "C002"

        # Last 3 shipments stay unassigned for dashboard testing
        if i >= count - 3:
            driver_id = None
            status = "Created"
        else:
            driver_id = "D101" if i % 2 == 0 else "D102"
            status = STATUSES_ASSIGNED[i % len(STATUSES_ASSIGNED)]

        deliv_day = today + timedelta(days=(i % 5))
        eta = (now + timedelta(hours=4 + (i % 8))).strftime("%Y-%m-%dT%H:%M:%SZ")
        parcels = 1 + (i % 3)

        row = ShipmentRow(
            id=sid,
            order_id=oid,
            client_id=client_id,
            driver_id=driver_id,
            status=status,
            pickup_address=pickup_label,
            pickup_lat=plat,
            pickup_lng=plng,
            destination=dest_label,
            parcel_count=parcels,
            eta=eta,
            dest_lat=dlat,
            dest_lng=dlng,
            current_lat=plat if status in ("Assigned", "Created", "Picked Up") else (plat + dlat) / 2,
            current_lng=plng if status in ("Assigned", "Created", "Picked Up") else (plng + dlng) / 2,
            delivery_date=deliv_day.isoformat(),
            delivery_option=DELIVERY_OPTIONS[i % len(DELIVERY_OPTIONS)],
        )
        db.add(row)
        db.add(StatusEventRow(shipment_id=sid, status="Created", ts=now, note="seed_reset"))
        if status != "Created":
            db.add(StatusEventRow(shipment_id=sid, status="Assigned", ts=now, note="seed_reset"))
        if status in ("Picked Up", "In Transit", "Delayed"):
            db.add(StatusEventRow(shipment_id=sid, status="Picked Up", ts=now, note="seed_reset"))
        if status in ("In Transit", "Delayed"):
            db.add(StatusEventRow(shipment_id=sid, status="In Transit", ts=now, note="seed_reset"))
        if status == "Delayed":
            db.add(StatusEventRow(shipment_id=sid, status="Delayed", ts=now, note="seed_reset"))
        created_ids.append(sid)

    db.commit()
    return created_ids


if __name__ == "__main__":
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        ids = reset_test_shipments(db, count=20)
        print(f"Reset complete: {len(ids)} shipments ({ids[0]} … {ids[-1]})")
    finally:
        db.close()
