"""2D route polylines per shipment (simulated). Coordinates near London."""

from app.models import ShipmentRow
from app.shipment_flow import delivery_phase, lerp_route

HUB = (51.5074, -0.1278)

# Delivery leg polylines (pickup area → delivery)
ROUTE_BY_SHIPMENT: dict[str, list[tuple[float, float]]] = {
    "S2001": [
        (51.545, -0.055),
        (51.538, -0.070),
        (51.528, -0.090),
        (51.520, -0.102),
        (51.515, -0.112),
    ],
    "S2002": [
        (51.512, -0.098),
        (51.518, -0.095),
        (51.516, -0.088),
        (51.514, -0.082),
        (51.505, -0.02),
    ],
    "S2003": [
        (52.486, -1.890),
        (52.400, -1.500),
        (52.200, -1.200),
        (52.480, -1.900),
    ],
}


def route_coords_for_shipment(s: ShipmentRow) -> list[tuple[float, float]]:
    """Active leg: hub→pickup when collecting; pickup→delivery when delivering."""
    pickup = (s.pickup_lat, s.pickup_lng)
    delivery = (s.dest_lat, s.dest_lng)
    if delivery_phase(s.status) == "pickup":
        custom = ROUTE_BY_SHIPMENT.get(s.id)
        if custom:
            return lerp_route(pickup, custom[-1], len(custom))
        return lerp_route(HUB, pickup, 6)
    custom = ROUTE_BY_SHIPMENT.get(s.id)
    if custom:
        return list(custom)
    return lerp_route(pickup, delivery, 6)


def with_altitude_meters(latlngs: list[tuple[float, float]]) -> list[tuple[float, float, float]]:
    """Simulated elevation per point (meters) for optional 3D UX / stretch goal."""
    n = len(latlngs)
    out: list[tuple[float, float, float]] = []
    for i, (lat, lng) in enumerate(latlngs):
        t = i / max(n - 1, 1)
        alt = 20.0 + t * 95.0
        out.append((lat, lng, alt))
    return out
