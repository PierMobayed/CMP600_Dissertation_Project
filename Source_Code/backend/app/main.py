import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth_deps import verify_bearer
from app.database import Base, engine, get_db
from app.sqlite_migrate import apply_sqlite_migrations
from app.models import (
    ClientRow,
    DriverRow,
    LocationEventRow,
    ShipmentRow,
    StatusEventRow,
)
from app.delivery_options import ALLOWED_DELIVERY_OPTION_IDS, DELIVERY_OPTIONS
from app.address_suggest import suggest_addresses
from app.geocode import geocode_address
from app.getaddress_client import is_configured as getaddress_configured
from app.route_geometry import route_coords_for_shipment, with_altitude_meters
from app.delivery_dates import assert_delivery_date_forward, clamp_delivery_date
from app.shipment_actions import (
    apply_assign_driver,
    apply_cancel,
    apply_hold,
    apply_release_hold,
    apply_unassign_driver,
    shipment_action_flags,
    shipment_to_client_order,
)
from app.shipment_flow import (
    ALLOWED_STATUSES,
    CLIENT_EDITABLE_STATUSES,
    active_target_lat_lng,
    can_transition,
    delivery_phase,
    shipment_public,
)
from app.seed import seed_if_empty
from app.simulator import SimulationCoordinator

API_PREFIX = "/api/v1"

coordinator = SimulationCoordinator()


class LoginBody(BaseModel):
    username: str
    password: str


class RegisterBody(BaseModel):
    username: str
    password: str
    display_name: str = ""


class LocationBody(BaseModel):
    lat: float
    lng: float
    timestamp: str | None = None


class StatusBody(BaseModel):
    status: str
    timestamp: str | None = None


class CreateShipmentBody(BaseModel):
    destination: str
    dest_lat: float | None = None
    dest_lng: float | None = None
    pickup_address: str | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    parcel_count: int = 1
    delivery_option: str = "Standard"
    delivery_date: str | None = None


class UpdateShipmentBody(BaseModel):
    destination: str | None = None
    dest_lat: float | None = None
    dest_lng: float | None = None
    pickup_address: str | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    delivery_option: str | None = None
    delivery_date: str | None = None


class AssignBody(BaseModel):
    driverId: str | None = None


class ReasonBody(BaseModel):
    reason: str


class CancelBody(BaseModel):
    reason: str | None = None


class RescheduleBody(BaseModel):
    delivery_date: str


def create_app() -> FastAPI:
    app = FastAPI(title="CMP600 Logistics API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_timing_header(request: Request, call_next):
        start = time.perf_counter()
        response: Response = await call_next(request)
        ms = (time.perf_counter() - start) * 1000
        response.headers["X-Response-Time-Ms"] = f"{ms:.2f}"
        return response

    @app.on_event("startup")
    def on_startup():
        Base.metadata.create_all(bind=engine)
        apply_sqlite_migrations(engine)
        from app.database import SessionLocal

        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()
        app.state.sim = coordinator

    @app.get("/health")
    def health():
        return {"status": "ok"}

    def _err(status: int, msg: str):
        raise HTTPException(status_code=status, detail={"error": {"code": status, "message": msg}})

    def validate_lat_lng(lat: float, lng: float) -> None:
        if lat < -90 or lat > 90 or lng < -180 or lng > 180:
            _err(400, "Invalid coordinates")

    def apply_shipment_filters(
        q,
        *,
        status: str | None = None,
        driver_id: str | None = None,
        delivery_date: str | None = None,
        delivery_date_from: str | None = None,
        delivery_date_to: str | None = None,
        unassigned: bool | None = None,
        not_delivered: bool | None = None,
    ):
        if status:
            q = q.filter(ShipmentRow.status == status)
        if driver_id:
            q = q.filter(ShipmentRow.driver_id == driver_id)
        if delivery_date:
            q = q.filter(ShipmentRow.delivery_date == delivery_date)
        if delivery_date_from:
            q = q.filter(ShipmentRow.delivery_date.is_not(None)).filter(
                ShipmentRow.delivery_date >= delivery_date_from
            )
        if delivery_date_to:
            q = q.filter(ShipmentRow.delivery_date.is_not(None)).filter(
                ShipmentRow.delivery_date <= delivery_date_to
            )
        if unassigned:
            q = q.filter(ShipmentRow.driver_id.is_(None))
        if not_delivered:
            q = q.filter(ShipmentRow.status != "Delivered")
        return q

    HUB_LAT = 51.5074
    HUB_LNG = -0.1278

    def next_shipment_id(db: Session) -> str:
        best = 1999
        for (sid,) in db.query(ShipmentRow.id).all():
            if sid.startswith("S") and sid[1:].isdigit():
                best = max(best, int(sid[1:]))
        return f"S{best + 1}"

    def next_order_id(db: Session) -> str:
        best = 0
        for (oid,) in db.query(ShipmentRow.order_id).all():
            if oid.startswith("O") and oid[1:].isdigit():
                best = max(best, int(oid[1:]))
        return f"O{best + 1}"

    @app.get(f"{API_PREFIX}/meta/delivery-options")
    def meta_delivery_options():
        return {"options": DELIVERY_OPTIONS}

    @app.get(f"{API_PREFIX}/meta/address-lookup")
    def meta_address_lookup():
        return {
            "preciseUkAddresses": True,
            "provider": (
                "getaddress.io+openstreetmap"
                if getaddress_configured()
                else "openstreetmap+postcodes.io"
            ),
            "hint": None,
        }

    @app.get(f"{API_PREFIX}/geocode")
    async def geocode_lookup(address: Annotated[str, Query(min_length=3, max_length=400)]):
        """Resolve a UK address string to lat/lng (OpenStreetMap Nominatim)."""
        try:
            result = await geocode_address(address)
        except httpx.HTTPError:
            _err(502, "Geocoding service unavailable. Try again or enter coordinates manually.")
        if not result:
            _err(404, "Address not found. Try a fuller UK address or enter coordinates manually.")
        return result

    @app.get(f"{API_PREFIX}/addresses/suggest")
    async def address_suggest(
        postcode: Annotated[str, Query(min_length=5, max_length=16)],
        q: Annotated[str, Query(max_length=120)] = "",
    ):
        """List building/street options for a UK postcode."""
        try:
            return await suggest_addresses(postcode, q)
        except httpx.HTTPError:
            _err(502, "Address lookup service unavailable. Try again shortly.")

    @app.post(f"{API_PREFIX}/auth/login")
    def login(body: LoginBody, db: Session = Depends(get_db)):
        client = db.query(ClientRow).filter(ClientRow.username == body.username).first()
        if client and client.password_plain == body.password:
            return {
                "token": "cmp600-demo-token",
                "role": "client",
                "userId": client.id,
            }
        driver = db.query(DriverRow).filter(DriverRow.username == body.username).first()
        if driver and driver.password_plain == body.password:
            return {
                "token": "cmp600-demo-token",
                "role": "driver",
                "userId": driver.id,
            }
        if body.username == "admin" and body.password == "demo":
            return {"token": "cmp600-demo-token", "role": "admin", "userId": "ADMIN"}
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": 401, "message": "Invalid credentials"}},
        )

    def next_client_id(db: Session) -> str:
        rows = db.query(ClientRow.id).all()
        best = 0
        for (cid,) in rows:
            if len(cid) >= 2 and cid[0] == "C" and cid[1:].isdigit():
                best = max(best, int(cid[1:]))
        return f"C{best + 1:03d}"

    @app.post(f"{API_PREFIX}/auth/register")
    def register(body: RegisterBody, db: Session = Depends(get_db)):
        if len(body.username.strip()) < 2 or len(body.password) < 3:
            _err(400, "Username (min 2 chars) and password (min 3 chars) required")
        uname = body.username.strip()
        if db.query(ClientRow).filter(ClientRow.username == uname).first():
            _err(400, "Username already taken")
        cid = next_client_id(db)
        db.add(
            ClientRow(
                id=cid,
                username=uname,
                password_plain=body.password,
                display_name=(body.display_name.strip() or uname),
            )
        )
        db.commit()
        return {
            "token": "cmp600-demo-token",
            "role": "client",
            "userId": cid,
        }

    @app.get(f"{API_PREFIX}/clients/{{client_id}}/orders")
    def client_orders(
        client_id: str,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        client = db.query(ClientRow).filter(ClientRow.id == client_id).first()
        if not client:
            _err(404, "Client not found")
        shipments = db.query(ShipmentRow).filter(ShipmentRow.client_id == client_id).all()
        orders = [shipment_to_client_order(s) for s in shipments]
        return {"clientId": client_id, "orders": orders}

    def _log_status(db: Session, shipment_id: str, status: str, note: str) -> None:
        db.add(
            StatusEventRow(
                shipment_id=shipment_id,
                status=status,
                ts=datetime.now(timezone.utc),
                note=note,
            )
        )

    async def _resolve_coords(
        address: str,
        lat: float | None,
        lng: float | None,
        *,
        fallback_lat: float | None = None,
        fallback_lng: float | None = None,
    ) -> tuple[float, float]:
        if lat is not None and lng is not None:
            validate_lat_lng(lat, lng)
            return lat, lng
        try:
            hit = await geocode_address(address.strip())
            if hit:
                return float(hit["lat"]), float(hit["lng"])
        except httpx.HTTPError:
            _err(502, "Address lookup unavailable. Try again shortly.")
        if fallback_lat is not None and fallback_lng is not None:
            validate_lat_lng(fallback_lat, fallback_lng)
            return fallback_lat, fallback_lng
        _err(400, f"Could not locate address: {address[:120]}")
        raise AssertionError("unreachable")

    @app.patch(f"{API_PREFIX}/clients/{{client_id}}/shipments/{{shipment_id}}")
    async def update_client_shipment(
        client_id: str,
        shipment_id: str,
        body: UpdateShipmentBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        """Client updates an order before collection (Created / Assigned only)."""
        client = db.query(ClientRow).filter(ClientRow.id == client_id).first()
        if not client:
            _err(404, "Client not found")
        s = db.query(ShipmentRow).filter(ShipmentRow.id == shipment_id).first()
        if not s:
            _err(404, "Shipment not found")
        if s.client_id != client_id:
            _err(403, "Not your order")
        if s.status not in CLIENT_EDITABLE_STATUSES:
            _err(
                400,
                "This order can no longer be changed online — it is already in progress. Contact the office.",
            )

        changed = False
        try:
            if body.pickup_address is not None:
                pickup = body.pickup_address.strip()
                if len(pickup) < 3:
                    _err(400, "Collection address too short")
                plat, plng = await _resolve_coords(
                    pickup,
                    body.pickup_lat,
                    body.pickup_lng,
                    fallback_lat=s.pickup_lat,
                    fallback_lng=s.pickup_lng,
                )
                s.pickup_address = pickup[:256]
                s.pickup_lat = plat
                s.pickup_lng = plng
                s.current_lat = plat
                s.current_lng = plng
                changed = True

            if body.destination is not None:
                dest = body.destination.strip()
                if len(dest) < 3:
                    _err(400, "Delivery address too short")
                dlat, dlng = await _resolve_coords(
                    dest,
                    body.dest_lat,
                    body.dest_lng,
                    fallback_lat=s.dest_lat,
                    fallback_lng=s.dest_lng,
                )
                s.destination = dest[:256]
                s.dest_lat = dlat
                s.dest_lng = dlng
                changed = True

            if body.delivery_option is not None and body.delivery_option != s.delivery_option:
                _err(400, "Service level cannot be changed after payment.")

            if body.delivery_date is not None:
                new_date = body.delivery_date.strip()
                try:
                    assert_delivery_date_forward(s.delivery_date, new_date)
                except ValueError as ex:
                    _err(400, str(ex))
                s.delivery_date = clamp_delivery_date(new_date)
                changed = True
        except httpx.HTTPError:
            _err(502, "Address lookup unavailable. Try again shortly.")

        if not changed:
            _err(400, "No changes provided")

        _log_status(db, s.id, s.status, "client_updated")
        db.commit()
        db.refresh(s)
        return shipment_to_client_order(s)

    def _client_shipment_row(
        db: Session, client_id: str, shipment_id: str
    ) -> ShipmentRow:
        s = db.query(ShipmentRow).filter(ShipmentRow.id == shipment_id).first()
        if not s:
            _err(404, "Shipment not found")
        if s.client_id != client_id:
            _err(403, "Not your order")
        return s

    @app.post(f"{API_PREFIX}/clients/{{client_id}}/shipments/{{shipment_id}}/hold")
    def client_hold_shipment(
        client_id: str,
        shipment_id: str,
        body: ReasonBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = _client_shipment_row(db, client_id, shipment_id)
        try:
            apply_hold(s, body.reason)
        except ValueError as ex:
            _err(400, str(ex))
        _log_status(db, s.id, "On Hold", f"client_hold:{body.reason[:80]}")
        db.commit()
        db.refresh(s)
        return shipment_to_client_order(s)

    @app.post(f"{API_PREFIX}/clients/{{client_id}}/shipments/{{shipment_id}}/release-hold")
    def client_release_hold(
        client_id: str,
        shipment_id: str,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = _client_shipment_row(db, client_id, shipment_id)
        try:
            apply_release_hold(s)
        except ValueError as ex:
            _err(400, str(ex))
        _log_status(db, s.id, s.status, "client_release_hold")
        db.commit()
        db.refresh(s)
        return shipment_to_client_order(s)

    @app.post(f"{API_PREFIX}/clients/{{client_id}}/shipments/{{shipment_id}}/cancel")
    def client_cancel_shipment(
        client_id: str,
        shipment_id: str,
        body: CancelBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = _client_shipment_row(db, client_id, shipment_id)
        try:
            apply_cancel(s, body.reason)
        except ValueError as ex:
            _err(400, str(ex))
        _log_status(db, s.id, "Cancelled", "client_cancel")
        db.commit()
        db.refresh(s)
        return shipment_to_client_order(s)

    @app.post(f"{API_PREFIX}/clients/{{client_id}}/shipments")
    def create_client_shipment(
        client_id: str,
        body: CreateShipmentBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        client = db.query(ClientRow).filter(ClientRow.id == client_id).first()
        if not client:
            _err(404, "Client not found")
        dest = body.destination.strip()
        if len(dest) < 3:
            _err(400, "Delivery address too short")
        pickup = (body.pickup_address or "").strip() or "Sender address (office will confirm)"
        if len(pickup) < 3:
            _err(400, "Pickup address too short")
        if body.delivery_option not in ALLOWED_DELIVERY_OPTION_IDS:
            _err(400, f"Invalid delivery_option; allowed: {sorted(ALLOWED_DELIVERY_OPTION_IDS)}")
        dlat = 51.515 if body.dest_lat is None else body.dest_lat
        dlng = -0.112 if body.dest_lng is None else body.dest_lng
        plat = HUB_LAT if body.pickup_lat is None else body.pickup_lat
        plng = HUB_LNG if body.pickup_lng is None else body.pickup_lng
        validate_lat_lng(dlat, dlng)
        validate_lat_lng(plat, plng)
        parcels = max(1, min(body.parcel_count, 20))
        sid = next_shipment_id(db)
        oid = next_order_id(db)
        deliv_date = body.delivery_date or (date.today() + timedelta(days=3)).isoformat()
        try:
            assert_delivery_date_forward(None, deliv_date)
        except ValueError as ex:
            _err(400, str(ex))
        row = ShipmentRow(
            id=sid,
            order_id=oid,
            client_id=client_id,
            driver_id=None,
            status="Created",
            pickup_address=pickup[:256],
            pickup_lat=plat,
            pickup_lng=plng,
            destination=dest[:256],
            parcel_count=parcels,
            eta=None,
            dest_lat=dlat,
            dest_lng=dlng,
            current_lat=plat,
            current_lng=plng,
            delivery_date=clamp_delivery_date(deliv_date),
            delivery_option=body.delivery_option,
        )
        db.add(row)
        db.add(
            StatusEventRow(
                shipment_id=sid,
                status="Created",
                ts=datetime.now(timezone.utc),
                note="client_order",
            )
        )
        db.commit()
        pub = shipment_public(row)
        return {
            "orderId": oid,
            "shipmentId": sid,
            "status": row.status,
            "phase": pub["phase"],
            "pickupAddress": pub["pickupAddress"],
            "deliveryAddress": pub["deliveryAddress"],
            "destination": row.destination,
            "parcelCount": row.parcel_count,
            "deliveryOption": row.delivery_option,
            "deliveryDate": row.delivery_date,
        }

    @app.get(f"{API_PREFIX}/shipments/{{shipment_id}}/tracking")
    def track_shipment(
        shipment_id: str,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = db.query(ShipmentRow).filter(ShipmentRow.id == shipment_id).first()
        if not s:
            _err(404, "Shipment not found")
        tlat, tlng = active_target_lat_lng(s)
        return {
            "shipmentId": s.id,
            "status": s.status,
            "phase": delivery_phase(s.status),
            "pickupAddress": s.pickup_address,
            "deliveryAddress": s.destination,
            "pickupLocation": {"lat": s.pickup_lat, "lng": s.pickup_lng},
            "deliveryLocation": {"lat": s.dest_lat, "lng": s.dest_lng},
            "targetLocation": {"lat": tlat, "lng": tlng},
            "currentLocation": {"lat": s.current_lat, "lng": s.current_lng},
            "eta": s.eta,
        }

    @app.get(f"{API_PREFIX}/drivers/{{driver_id}}/jobs")
    def driver_jobs(
        driver_id: str,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        drv = db.query(DriverRow).filter(DriverRow.id == driver_id).first()
        if not drv:
            _err(404, "Driver not found")
        rows = db.query(ShipmentRow).filter(ShipmentRow.driver_id == driver_id).all()
        jobs = [
            {
                "shipmentId": r.id,
                "destination": r.destination,
                "status": r.status,
            }
            for r in rows
        ]
        return {"driverId": driver_id, "jobs": jobs}

    @app.get(f"{API_PREFIX}/drivers/{{driver_id}}/delivery-queue")
    def driver_delivery_queue(
        driver_id: str,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        drv = db.query(DriverRow).filter(DriverRow.id == driver_id).first()
        if not drv:
            _err(404, "Driver not found")
        open_rows = [
            s
            for s in db.query(ShipmentRow).filter(ShipmentRow.driver_id == driver_id).all()
            if s.status not in ("Delivered", "Cancelled", "On Hold")
        ]
        rank = {"In Transit": 0, "Delayed": 1, "Picked Up": 2, "Assigned": 3, "Created": 4}

        open_rows.sort(
            key=lambda s: (
                rank.get(s.status, 99),
                s.delivery_date or "9999-12-31",
                s.id,
            )
        )
        next_id = open_rows[0].id if open_rows else None
        return {
            "driverId": driver_id,
            "nextShipmentId": next_id,
            "queue": [
                {
                    **shipment_public(s),
                    "deliveryDate": s.delivery_date,
                }
                for s in open_rows
            ],
        }

    @app.get(f"{API_PREFIX}/drivers/{{driver_id}}/shipments-map-context")
    def driver_shipments_map_context(
        driver_id: str,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        drv = db.query(DriverRow).filter(DriverRow.id == driver_id).first()
        if not drv:
            _err(404, "Driver not found")
        rows = db.query(ShipmentRow).order_by(ShipmentRow.id).all()
        shipments = []
        for s in rows:
            pub = shipment_public(s)
            tlat, tlng = active_target_lat_lng(s)
            shipments.append(
                {
                    **pub,
                    "lat": tlat,
                    "lng": tlng,
                    "assignedToViewer": s.driver_id == driver_id,
                }
            )
        return {"viewerDriverId": driver_id, "shipments": shipments}

    @app.get(f"{API_PREFIX}/shipments/{{shipment_id}}/route")
    def shipment_route(
        shipment_id: str,
        dimensions: Annotated[str, Query()] = "2",
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = db.query(ShipmentRow).filter(ShipmentRow.id == shipment_id).first()
        if not s:
            _err(404, "Shipment not found")
        coords = route_coords_for_shipment(s)
        if not coords:
            coords = [(s.current_lat, s.current_lng), (s.dest_lat, s.dest_lng)]
        base = {
            "shipmentId": shipment_id,
            "coordinates": [{"lat": lat, "lng": lng} for lat, lng in coords],
        }
        if dimensions == "3":
            triples = with_altitude_meters(coords)
            return {
                **base,
                "routeType": "3D",
                "coordinates3D": [
                    {"lat": a, "lng": b, "altMeters": c} for a, b, c in triples
                ],
            }
        return {**base, "routeType": "2D"}

    @app.post(f"{API_PREFIX}/drivers/{{driver_id}}/location")
    def post_location(
        driver_id: str,
        body: LocationBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        validate_lat_lng(body.lat, body.lng)
        drv = db.query(DriverRow).filter(DriverRow.id == driver_id).first()
        if not drv:
            _err(404, "Driver not found")
        db.add(
            LocationEventRow(
                driver_id=driver_id,
                lat=body.lat,
                lng=body.lng,
                ts=datetime.now(timezone.utc),
            )
        )
        for s in db.query(ShipmentRow).filter(ShipmentRow.driver_id == driver_id).all():
            s.current_lat = body.lat
            s.current_lng = body.lng
        db.commit()
        return {"message": "Location update received"}

    @app.post(f"{API_PREFIX}/shipments/{{shipment_id}}/status")
    def post_status(
        shipment_id: str,
        body: StatusBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        if body.status not in ALLOWED_STATUSES:
            _err(400, f"Invalid status; allowed: {sorted(ALLOWED_STATUSES)}")
        s = db.query(ShipmentRow).filter(ShipmentRow.id == shipment_id).first()
        if not s:
            _err(404, "Shipment not found")
        if not can_transition(s.status, body.status):
            _err(
                400,
                f"Cannot change status from {s.status!r} to {body.status!r}",
            )
        s.status = body.status
        if body.status == "Picked Up":
            s.current_lat = s.pickup_lat
            s.current_lng = s.pickup_lng
        elif body.status == "In Transit":
            s.current_lat = s.pickup_lat
            s.current_lng = s.pickup_lng
        db.add(
            StatusEventRow(
                shipment_id=shipment_id,
                status=body.status,
                ts=datetime.now(timezone.utc),
                note="manual",
            )
        )
        db.commit()
        return {"message": "Status updated"}

    @app.post(f"{API_PREFIX}/dashboard/shipments/{{shipment_id}}/assign")
    def dashboard_assign_shipment(
        shipment_id: str,
        body: AssignBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = db.query(ShipmentRow).filter(ShipmentRow.id == shipment_id).first()
        if not s:
            _err(404, "Shipment not found")
        prev = s.driver_id
        driver_id = (body.driverId or "").strip()
        try:
            if not driver_id:
                apply_unassign_driver(s)
                note = "office_unassign"
            else:
                drv = db.query(DriverRow).filter(DriverRow.id == driver_id).first()
                if not drv:
                    _err(404, "Driver not found")
                apply_assign_driver(s, driver_id)
                note = f"office_assign:{driver_id}"
        except ValueError as ex:
            _err(400, str(ex))
        db.add(
            StatusEventRow(
                shipment_id=shipment_id,
                status=s.status,
                ts=datetime.now(timezone.utc),
                note=note,
            )
        )
        db.commit()
        return {
            "message": "Driver unassigned" if not driver_id else "Shipment assigned",
            "shipmentId": shipment_id,
            "driverId": s.driver_id,
            "status": s.status,
            "previousDriverId": prev,
        }

    def _office_shipment_row(db: Session, shipment_id: str) -> ShipmentRow:
        s = db.query(ShipmentRow).filter(ShipmentRow.id == shipment_id).first()
        if not s:
            _err(404, "Shipment not found")
        return s

    @app.post(f"{API_PREFIX}/dashboard/shipments/{{shipment_id}}/hold")
    def office_hold_shipment(
        shipment_id: str,
        body: ReasonBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = _office_shipment_row(db, shipment_id)
        try:
            apply_hold(s, body.reason)
        except ValueError as ex:
            _err(400, str(ex))
        _log_status(db, s.id, "On Hold", f"office_hold:{body.reason[:80]}")
        db.commit()
        db.refresh(s)
        return {**shipment_public(s), **shipment_action_flags(s)}

    @app.post(f"{API_PREFIX}/dashboard/shipments/{{shipment_id}}/release-hold")
    def office_release_hold(
        shipment_id: str,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = _office_shipment_row(db, shipment_id)
        try:
            apply_release_hold(s)
        except ValueError as ex:
            _err(400, str(ex))
        _log_status(db, s.id, s.status, "office_release_hold")
        db.commit()
        db.refresh(s)
        return {**shipment_public(s), **shipment_action_flags(s)}

    @app.post(f"{API_PREFIX}/dashboard/shipments/{{shipment_id}}/cancel")
    def office_cancel_shipment(
        shipment_id: str,
        body: CancelBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = _office_shipment_row(db, shipment_id)
        try:
            apply_cancel(s, body.reason)
        except ValueError as ex:
            _err(400, str(ex))
        _log_status(db, s.id, "Cancelled", "office_cancel")
        db.commit()
        db.refresh(s)
        return {**shipment_public(s), **shipment_action_flags(s)}

    @app.patch(f"{API_PREFIX}/dashboard/shipments/{{shipment_id}}/delivery-date")
    def office_reschedule_delivery(
        shipment_id: str,
        body: RescheduleBody,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        s = _office_shipment_row(db, shipment_id)
        if s.status in ("Delivered", "Cancelled"):
            _err(400, f"Cannot reschedule — status is {s.status}")
        new_date = body.delivery_date.strip()
        try:
            assert_delivery_date_forward(s.delivery_date, new_date)
        except ValueError as ex:
            _err(400, str(ex))
        s.delivery_date = clamp_delivery_date(new_date)
        _log_status(db, s.id, s.status, f"office_reschedule:{s.delivery_date}")
        db.commit()
        db.refresh(s)
        return {**shipment_public(s), **shipment_action_flags(s)}

    @app.get(f"{API_PREFIX}/dashboard/overview")
    def dashboard_overview(
        status: Annotated[str | None, Query()] = None,
        driverId: Annotated[str | None, Query()] = None,
        deliveryDate: Annotated[str | None, Query()] = None,
        deliveryDateFrom: Annotated[str | None, Query()] = None,
        deliveryDateTo: Annotated[str | None, Query()] = None,
        unassigned: Annotated[bool | None, Query()] = None,
        notDelivered: Annotated[bool | None, Query()] = None,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        q = db.query(ShipmentRow)
        q = apply_shipment_filters(
            q,
            status=status,
            driver_id=driverId,
            delivery_date=deliveryDate,
            delivery_date_from=deliveryDateFrom,
            delivery_date_to=deliveryDateTo,
            unassigned=unassigned,
            not_delivered=notDelivered,
        )
        shipments = q.all()
        total = len(shipments)
        delivered = sum(1 for s in shipments if s.status == "Delivered")
        delayed = sum(1 for s in shipments if s.status == "Delayed")
        in_transit = sum(1 for s in shipments if s.status in ("In Transit", "Picked Up"))
        return {
            "kpis": {
                "totalShipments": total,
                "inTransit": in_transit,
                "delivered": delivered,
                "delayed": delayed,
            }
        }

    @app.get(f"{API_PREFIX}/dashboard/map")
    def dashboard_map(
        status: Annotated[str | None, Query()] = None,
        driverId: Annotated[str | None, Query()] = None,
        deliveryDate: Annotated[str | None, Query()] = None,
        deliveryDateFrom: Annotated[str | None, Query()] = None,
        deliveryDateTo: Annotated[str | None, Query()] = None,
        unassigned: Annotated[bool | None, Query()] = None,
        notDelivered: Annotated[bool | None, Query()] = None,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        drivers_out = []
        for d in db.query(DriverRow).all():
            last = (
                db.query(LocationEventRow)
                .filter(LocationEventRow.driver_id == d.id)
                .order_by(LocationEventRow.id.desc())
                .first()
            )
            ship = db.query(ShipmentRow).filter(ShipmentRow.driver_id == d.id).first()
            lat = last.lat if last else (ship.current_lat if ship else 51.5)
            lng = last.lng if last else (ship.current_lng if ship else -0.12)
            drivers_out.append({"driverId": d.id, "lat": lat, "lng": lng})
        qs = db.query(ShipmentRow)
        qs = apply_shipment_filters(
            qs,
            status=status,
            driver_id=driverId,
            delivery_date=deliveryDate,
            delivery_date_from=deliveryDateFrom,
            delivery_date_to=deliveryDateTo,
            unassigned=unassigned,
            not_delivered=notDelivered,
        )
        shipments_out = []
        for s in qs.order_by(ShipmentRow.id).all():
            pub = shipment_public(s)
            shipments_out.append(
                {
                    "shipmentId": s.id,
                    "status": s.status,
                    "phase": pub["phase"],
                    "lat": s.dest_lat,
                    "lng": s.dest_lng,
                    "pickupLat": s.pickup_lat,
                    "pickupLng": s.pickup_lng,
                    "deliveryLat": s.dest_lat,
                    "deliveryLng": s.dest_lng,
                    "pickupAddress": pub["pickupAddress"],
                    "deliveryAddress": pub["deliveryAddress"],
                    "destination": s.destination,
                    "driverId": s.driver_id,
                    "deliveryDate": s.delivery_date,
                }
            )
        return {"drivers": drivers_out, "shipments": shipments_out}

    @app.get(f"{API_PREFIX}/dashboard/drivers")
    def dashboard_drivers_list(db: Session = Depends(get_db), _: str = Depends(verify_bearer)):
        rows = db.query(DriverRow).order_by(DriverRow.id).all()
        return {
            "drivers": [{"driverId": d.id, "displayName": d.display_name} for d in rows],
        }

    @app.get(f"{API_PREFIX}/dashboard/alerts/delayed")
    def dashboard_delayed_alerts(db: Session = Depends(get_db), _: str = Depends(verify_bearer)):
        rows = (
            db.query(ShipmentRow)
            .filter(ShipmentRow.status == "Delayed")
            .order_by(ShipmentRow.id)
            .all()
        )
        return {
            "alerts": [
                {
                    **shipment_public(s),
                    "orderId": s.order_id,
                    "eta": s.eta,
                }
                for s in rows
            ]
        }

    @app.get(f"{API_PREFIX}/dashboard/shipments")
    def dashboard_shipments_filter(
        status: Annotated[str | None, Query()] = None,
        driverId: Annotated[str | None, Query()] = None,
        deliveryDate: Annotated[str | None, Query()] = None,
        deliveryDateFrom: Annotated[str | None, Query()] = None,
        deliveryDateTo: Annotated[str | None, Query()] = None,
        unassigned: Annotated[bool | None, Query()] = None,
        notDelivered: Annotated[bool | None, Query()] = None,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        q = db.query(ShipmentRow)
        q = apply_shipment_filters(
            q,
            status=status,
            driver_id=driverId,
            delivery_date=deliveryDate,
            delivery_date_from=deliveryDateFrom,
            delivery_date_to=deliveryDateTo,
            unassigned=unassigned,
            not_delivered=notDelivered,
        )
        rows = q.order_by(ShipmentRow.id).all()
        return {
            "shipments": [
                {**shipment_public(s), "orderId": s.order_id, "eta": s.eta, **shipment_action_flags(s)}
                for s in rows
            ]
        }

    @app.get(f"{API_PREFIX}/dashboard/recent-events")
    def recent_events(
        limit: int = 20,
        db: Session = Depends(get_db),
        _: str = Depends(verify_bearer),
    ):
        ev = (
            db.query(StatusEventRow)
            .order_by(StatusEventRow.id.desc())
            .limit(limit)
            .all()
        )
        return {
            "events": [
                {
                    "shipmentId": e.shipment_id,
                    "status": e.status,
                    "ts": e.ts.isoformat() if e.ts else None,
                    "note": e.note,
                }
                for e in ev
            ]
        }

    @app.post(f"{API_PREFIX}/simulation/gps/start")
    def sim_gps_start(request: Request, driverId: str | None = Query(None)):
        sim: SimulationCoordinator = request.app.state.sim
        did = driverId or "D101"
        sim.start_gps(did)
        return {"message": "GPS simulation started", "driverId": did}

    @app.post(f"{API_PREFIX}/simulation/status/start")
    def sim_status_start(request: Request):
        sim: SimulationCoordinator = request.app.state.sim
        sim.start_status_simulation()
        return {"message": "Shipment status simulation started"}

    return app


app = create_app()
