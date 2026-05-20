import os
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("API_BEARER_TOKEN", "cmp600-demo-token")

from app.main import app  # noqa: E402

HDR = {"Authorization": "Bearer cmp600-demo-token"}


def _valid_delivery_date(days_ahead: int = 7) -> str:
    return (date.today() + timedelta(days=days_ahead)).isoformat()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_dashboard_overview_has_kpis(client: TestClient):
    r = client.get("/api/v1/dashboard/overview", headers=HDR)
    assert r.status_code == 200
    body = r.json()
    assert "kpis" in body
    assert "totalShipments" in body["kpis"]


def test_client_orders(client: TestClient):
    r = client.get("/api/v1/clients/C001/orders", headers=HDR)
    assert r.status_code == 200
    data = r.json()
    assert data["clientId"] == "C001"
    assert len(data["orders"]) >= 1


def test_unauthorized_without_token(client: TestClient):
    r = client.get("/api/v1/dashboard/overview")
    assert r.status_code == 401


def test_driver_delivery_queue(client: TestClient):
    r = client.get("/api/v1/drivers/D101/delivery-queue", headers=HDR)
    assert r.status_code == 200
    body = r.json()
    assert body["driverId"] == "D101"
    assert "nextShipmentId" in body
    assert isinstance(body["queue"], list)


def test_driver_shipments_map_context(client: TestClient):
    r = client.get("/api/v1/drivers/D101/shipments-map-context", headers=HDR)
    assert r.status_code == 200
    body = r.json()
    assert body["viewerDriverId"] == "D101"
    assert len(body["shipments"]) >= 1


def test_create_shipment_with_pickup(client: TestClient):
    r = client.post(
        "/api/v1/clients/C001/shipments",
        headers=HDR,
        json={
            "pickup_address": "10 Sender Road",
            "destination": "20 Receiver Lane",
            "pickup_lat": 51.52,
            "pickup_lng": -0.10,
            "dest_lat": 51.51,
            "dest_lng": -0.11,
            "parcel_count": 2,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["pickupAddress"] == "10 Sender Road"
    assert body["deliveryAddress"] == "20 Receiver Lane"
    assert body["parcelCount"] == 2


def test_picked_up_status_transition(client: TestClient):
    created = client.post(
        "/api/v1/clients/C001/shipments",
        headers=HDR,
        json={
            "pickup_address": "1 Test Road, LS10 4HJ",
            "destination": "2 Test Lane, LS10 4HH",
            "pickup_lat": 53.74,
            "pickup_lng": -1.54,
            "dest_lat": 53.75,
            "dest_lng": -1.55,
            "delivery_option": "Standard",
            "delivery_date": _valid_delivery_date(7),
        },
    )
    assert created.status_code == 200
    sid = created.json()["shipmentId"]
    assigned = client.post(
        f"/api/v1/dashboard/shipments/{sid}/assign",
        headers=HDR,
        json={"driverId": "D101"},
    )
    assert assigned.status_code == 200
    r = client.post(
        f"/api/v1/shipments/{sid}/status",
        headers=HDR,
        json={"status": "Picked Up"},
    )
    assert r.status_code == 200


def test_client_update_created_shipment(client: TestClient):
    created = client.post(
        "/api/v1/clients/C001/shipments",
        headers=HDR,
        json={
            "pickup_address": "1 Old Street, LS10 4HJ",
            "destination": "2 Old Lane, LS10 4HH",
            "pickup_lat": 53.74,
            "pickup_lng": -1.54,
            "dest_lat": 53.75,
            "dest_lng": -1.55,
            "delivery_option": "Standard",
            "delivery_date": _valid_delivery_date(5),
        },
    )
    assert created.status_code == 200
    sid = created.json()["shipmentId"]
    new_date = _valid_delivery_date(10)
    updated = client.patch(
        f"/api/v1/clients/C001/shipments/{sid}",
        headers=HDR,
        json={
            "pickup_address": "109, LS10 4HJ",
            "pickup_lat": 53.741,
            "pickup_lng": -1.539,
            "destination": "121, LS10 4HH",
            "dest_lat": 53.742,
            "dest_lng": -1.538,
            "delivery_date": new_date,
        },
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["pickupAddress"] == "109, LS10 4HJ"
    assert body["deliveryAddress"] == "121, LS10 4HH"
    assert body["deliveryOption"] == "Standard"
    assert body["deliveryDate"] == new_date

    blocked = client.patch(
        f"/api/v1/clients/C001/shipments/{sid}",
        headers=HDR,
        json={"delivery_option": "Express"},
    )
    assert blocked.status_code == 400


def test_delivery_date_rejects_far_future(client: TestClient):
    r = client.post(
        "/api/v1/clients/C001/shipments",
        headers=HDR,
        json={
            "pickup_address": "1 Future St, LS10 4HJ",
            "destination": "2 Future Ln, LS10 4HH",
            "pickup_lat": 53.74,
            "pickup_lng": -1.54,
            "dest_lat": 53.75,
            "dest_lng": -1.55,
            "delivery_option": "Standard",
            "delivery_date": "2099-12-31",
        },
    )
    assert r.status_code == 400


def test_dashboard_map_accepts_date_range(client: TestClient):
    r = client.get(
        "/api/v1/dashboard/map?deliveryDateFrom=2000-01-01&deliveryDateTo=2099-12-31",
        headers=HDR,
    )
    assert r.status_code == 200
    body = r.json()
    assert "drivers" in body and "shipments" in body


def test_dashboard_overview_respects_delivery_date_range(client: TestClient):
    today = date.today().isoformat()
    r = client.get(f"/api/v1/dashboard/overview?deliveryDateFrom={today}&deliveryDateTo={today}", headers=HDR)
    assert r.status_code == 200
    kpis = r.json()["kpis"]
    list_r = client.get(
        f"/api/v1/dashboard/shipments?deliveryDateFrom={today}&deliveryDateTo={today}",
        headers=HDR,
    )
    assert list_r.status_code == 200
    rows = list_r.json()["shipments"]
    assert kpis["totalShipments"] == len(rows)
    assert kpis["delivered"] == sum(1 for s in rows if s["status"] == "Delivered")


def test_dashboard_shipments_not_delivered_filter(client: TestClient):
    all_r = client.get("/api/v1/dashboard/shipments", headers=HDR)
    assert all_r.status_code == 200
    all_rows = all_r.json()["shipments"]
    delivered_ids = {s["shipmentId"] for s in all_rows if s["status"] == "Delivered"}
    assert delivered_ids, "seed should include Delivered rows"

    filtered_r = client.get("/api/v1/dashboard/shipments?notDelivered=true", headers=HDR)
    assert filtered_r.status_code == 200
    filtered = filtered_r.json()["shipments"]
    assert not any(s["status"] == "Delivered" for s in filtered)
    assert {s["shipmentId"] for s in filtered} == {s["shipmentId"] for s in all_rows if s["status"] != "Delivered"}
