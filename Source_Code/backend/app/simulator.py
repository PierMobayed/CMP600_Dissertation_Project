import asyncio
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import LocationEventRow, ShipmentRow, StatusEventRow
from app.route_geometry import route_coords_for_shipment
from app.shipment_flow import STATUS_PIPELINE


class SimulationCoordinator:
    def __init__(self) -> None:
        self._gps_tasks: dict[str, asyncio.Task] = {}
        self._status_task: asyncio.Task | None = None
        self._gps_index: dict[str, int] = {}

    def start_gps(self, driver_id: str) -> None:
        if driver_id in self._gps_tasks and not self._gps_tasks[driver_id].done():
            return
        self._gps_tasks[driver_id] = asyncio.create_task(self._gps_loop(driver_id))

    def stop_gps(self, driver_id: str) -> None:
        t = self._gps_tasks.pop(driver_id, None)
        if t and not t.done():
            t.cancel()

    async def _gps_loop(self, driver_id: str) -> None:
        try:
            while True:
                db = SessionLocal()
                try:
                    ship = (
                        db.query(ShipmentRow)
                        .filter(
                            ShipmentRow.driver_id == driver_id,
                            ShipmentRow.status == "In Transit",
                        )
                        .order_by(ShipmentRow.id)
                        .first()
                    )
                    if not ship:
                        ship = (
                            db.query(ShipmentRow)
                            .filter(
                                ShipmentRow.driver_id == driver_id,
                                ShipmentRow.status.in_(["Assigned", "Delayed"]),
                            )
                            .order_by(ShipmentRow.id)
                            .first()
                        )
                    if not ship:
                        await asyncio.sleep(1)
                        continue
                    route = route_coords_for_shipment(ship)
                    if not route:
                        route = [(ship.current_lat, ship.current_lng)]
                    idx = self._gps_index.get(driver_id, 0)
                    if idx >= len(route):
                        idx = 0
                    lat, lng = route[idx]
                    self._gps_index[driver_id] = (idx + 1) % max(len(route), 1)
                    ship.current_lat = lat
                    ship.current_lng = lng
                    db.add(
                        LocationEventRow(
                            driver_id=driver_id,
                            lat=lat,
                            lng=lng,
                            ts=datetime.now(timezone.utc),
                        )
                    )
                    db.commit()
                finally:
                    db.close()
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            return

    def start_status_simulation(self) -> None:
        if self._status_task and not self._status_task.done():
            return
        self._status_task = asyncio.create_task(self._status_loop())

    async def _status_loop(self) -> None:
        try:
            while True:
                await asyncio.sleep(8)
                db = SessionLocal()
                try:
                    shipments = db.query(ShipmentRow).all()
                    if not shipments:
                        continue
                    for s in shipments:
                        if s.status == "Delivered" or s.status == "Delayed":
                            continue
                        try:
                            i = STATUS_PIPELINE.index(s.status)
                            if i + 1 >= len(STATUS_PIPELINE):
                                continue
                            nxt = STATUS_PIPELINE[i + 1]
                        except ValueError:
                            nxt = "In Transit"
                        s.status = nxt
                        db.add(
                            StatusEventRow(
                                shipment_id=s.id,
                                status=nxt,
                                ts=datetime.now(timezone.utc),
                                note="simulation",
                            )
                        )
                    db.commit()
                finally:
                    db.close()
        except asyncio.CancelledError:
            return
