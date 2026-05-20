# Implementation notes (developer → dissertation)

Use this file to paste bullets for **Chapter 5 — Implementation** (`Dissertation_Main_Document.docx`).

## Backend (`Source_Code/backend`)

- **Stack:** FastAPI, SQLAlchemy 2, SQLite (`backend/data/logistics.db`).
- **API:** All routes under `/api/v1` per `API_Contract_v1.docx`. Prototype auth: `Authorization: Bearer cmp600-demo-token` (env `API_BEARER_TOKEN`).
- **Simulation:** `SimulationCoordinator` — optional GPS loop per driver (1 Hz); status pipeline `Created → Assigned → Picked Up → In Transit → Delivered`. Route legs: hub→pickup while **Assigned**, pickup→delivery after collection.
- **Door-to-door model:** `pickup_address` / `pickup_lat` / `pickup_lng` + delivery `destination` / `dest_lat` / `dest_lng`; `parcel_count` on shipment. See `Documentation/Door_to_Door_Parcel_Flow_Plan.md`.
- **Evaluation hook:** Response header `X-Response-Time-Ms` on every request; extra endpoints: `POST /auth/register`, `GET /dashboard/drivers`, `GET /dashboard/alerts/delayed`, `GET /dashboard/shipments` filters (`driverId`, `deliveryDate`), `GET /shipments/{id}/route?dimensions=3` (3D coords). SQLite migration adds `delivery_date` on shipments.

## Office dashboard (`Source_Code/dashboard`)

- React (Vite), Leaflet map: drivers vs shipments, KPI panel, **filters** (status, **driver**, **delivery date**), **Delayed alerts** panel, timeline, simulation controls, **refresh time in ms** (NFR evidence).

## Driver app (`Source_Code/driver_app`)

- Job list, **2D** Leaflet route + optional **3D-style** MapLibre view (`GET .../route?dimensions=3`, simulated **`altMeters`** strip), 1 Hz POST `/drivers/{id}/location` on 2D polyline, manual status updates.
- **Door-to-door workflow:** Collect → Collected (`Picked Up`) → Start delivery (`In Transit`) → Delivered; Edit stop + List Actions panels; map float card status-aware buttons.
- **Route order (device-local):** `manualOrder` / `manualStopOrder` after **Optimise**; default list/polyline order from `buildDoorToDoorPlan` in `doorToDoorRoute.ts`. Completed stops stay in list position. Policy: depot → pending deliveries → nearest pickup → deliver → repeat. See `Documentation/Door_to_Door_Routing_Strategy.md`.

## Client app (`Source_Code/client_app`)

- **Register** (`POST /auth/register`) + login, orders table, live tracking + mini-map from `/shipments/{id}/tracking` (poll ~3s).

## Runbook

See `Source_Code/README.md` for ports: API `8000`, dashboard `5173`, client `5174`, driver `5175`.
