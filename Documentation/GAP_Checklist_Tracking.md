# CMP600 — Gap checklist (tracking)

**Purpose:** Track coverage against `Developer Checklist,Code Review Criteria.docx` and `Developer Implementation Plan.docx`.  
**Last reviewed:** 2026-05-15 (codebase snapshot)  
**How to use:** Update the **Status** column as you complete work. Legend below.

| Status | Meaning |
|--------|---------|
| ✅ | Done — meets requirement |
| ⚠️ | Partial — started or documented only; needs verification or polish |
| ❌ | Not done — gap remains |
| ➕ | Exceeds minimum (stretch / bonus; note in dissertation) |

**Evidence paths** are relative to `CMP600_Dissertation_Project/`.

---

## Summary (quick view)

| Area | Coverage | Blocker for Viva? |
|------|----------|-------------------|
| Phase 1 — Backend (code) | ~95% | No (local demo OK) |
| Phase 2 — Office dashboard | ~95% | No |
| Phase 3 — Driver app | ~100% | No |
| Phase 4 — Client app | ~95% | No |
| Phase 5 — Evaluation artefacts | ~75% | **Yes** — run latency + usability notes |
| Phase 6 — Viva folder | ~45% | **Yes** — screenshots + demo video |
| Repository structure (plan §2) | ~85% | Minor — root README, `Tests/usability/` |
| Dissertation chapters 5–6 | ⚠️ | **Yes** — text + figures not filed in main doc |
| Code review (critical criteria) | ~90% PASS | Documentation evidence gaps |

**Overall “Definition of DONE” (Implementation Plan §7):** ~**85%** — core system demonstrable; Viva/dissertation artefacts incomplete.

---

## A. Daily developer checklist

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| D-01 | Code builds without errors | ✅ | `Source_Code/backend` → `pytest`; each app → `npm run build` |
| D-02 | No hardcoded real credentials / personal data | ✅ | Demo users in `Source_Code/backend/app/seed.py`; token via `API_BEARER_TOKEN` |
| D-03 | Simulated data only | ✅ | `SimulationCoordinator`, seeded routes in `route_geometry.py` |
| D-04 | Application starts from clean state | ✅ | SQLite created + `seed_if_empty` on startup |
| D-05 | Backend reachable (local or cloud) | ⚠️ | Local: `server-control.bat`, port 8000. **Cloud URL not recorded in this file** |
| D-06 | Meaningful commit messages | ⚠️ | Process — verify in git history |
| D-07 | Code in correct folders | ✅ | `Source_Code/backend`, `dashboard`, `client_app`, `driver_app` |
| D-08 | No temp/debug files committed | ⚠️ | Check `.gitignore`; avoid committing `dist/`, large `node_modules` |
| D-09 | README updated if behaviour changes | ⚠️ | `Source_Code/README.md` exists; **root `README.md` missing** |
| D-10 | No crashes on basic flows | ✅ | Manual smoke: login → map → driver GPS → client track |
| D-11 | Errors handled gracefully | ✅ | HTTP 4xx API; UI error strings in each `App.tsx` |
| D-12 | Minimal meaningful console logs | ✅ | No noisy debug loops in production paths |

---

## B. Phase 1 — Backend

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| P1-01 | Backend deploys to cloud (Render / Railway / Azure) | ⚠️ | Guide: `Documentation/Cloud_Deploy_Railway_Render.md`; `Source_Code/backend/Dockerfile`. **Confirm live URL** |
| P1-02 | API responds 200 OK | ✅ | `GET /health`; `tests/test_smoke.py` |
| P1-03 | Simulated shipments generated | ✅ | `app/seed.py`, `ShipmentRow` |
| P1-04 | Simulated driver GPS updates | ✅ | `POST /api/v1/simulation/gps/start`; driver 1 Hz POST location |
| P1-05 | Dashboard endpoints return aggregated data | ✅ | `GET /dashboard/overview`, `/dashboard/map`, … |
| P1-06 | API matches `API_Contract_v1.docx` exactly | ⚠️ | Minimum endpoints present; **extra** endpoints exist — complete matrix (section H) |
| P1-07 | REST API under `/api/v1` | ✅ | `app/main.py` |
| P1-08 | SQL database (SQLite) | ✅ | `backend/data/logistics.db` |
| P1-09 | `GET /dashboard/overview` | ✅ | |
| P1-10 | `GET /dashboard/map` | ✅ | Filters: status, driverId, deliveryDateFrom/To, unassigned |
| P1-11 | `GET /shipments/{id}/tracking` | ✅ | |
| P1-12 | `POST /drivers/{id}/location` | ✅ | |
| P1-13 | `POST /simulation/gps/start` | ✅ | |
| P1-14 | `POST /simulation/status/start` | ✅ | |
| P1-15 | Response time logging (evaluation) | ✅ | Header `X-Response-Time-Ms` on all requests |
| P1-16 | Chapter 5.1 Backend — technical notes | ⚠️ | Draft: `Documentation/Implementation_Notes_DEV.md` → paste into `Dissertation_Main_Document.docx` |

**Stretch (document as bonus):** `POST /auth/register`, client create shipment, office assign, delivery queue, 3D route (`?dimensions=3`), delayed alerts, `delivery_options` catalogue.

---

## C. Phase 2 — Office dashboard

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| P2-01 | 2D interactive map loads | ✅ | Leaflet — `dashboard/src/App.tsx` |
| P2-02 | Drivers on map | ✅ | Blue markers; last GPS / fallback position |
| P2-03 | Shipments on map | ✅ | Drop-off coords (`dest_lat/lng` on map endpoint) |
| P2-04 | KPI panel (total, in transit, delivered, delayed) | ✅ | `GET /dashboard/overview` |
| P2-05 | Filtering (at least by status) | ✅ | Status, driver, date range, unassigned |
| P2-06 | Dashboard updates when backend data changes | ✅ | ~4 s poll; refresh ms shown in UI |
| P2-07 | Consumes real backend data | ✅ | `dashboard/src/api.ts` |
| P2-08 | Screenshot `Viva/screenshots/dashboard.png` | ❌ | Create after UI freeze |
| P2-09 | Chapter 5.4 Office dashboard | ⚠️ | Not yet in main dissertation |
| P2-10 | Light / dark theme | ➕ | `ThemeToggle.tsx`, CSS variables |

**Stretch:** Dispatch table, assign driver, delayed alerts panel, simulation buttons, shared filter query for map + list.

---

## D. Phase 3 — Driver application

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| P3-01 | Job list | ✅ | “Your run” queue + jobs from API |
| P3-02 | 2D route visible | ✅ | Leaflet polyline on fleet map |
| P3-03 | GPS updates sent periodically | ✅ | 1 Hz when enabled |
| P3-04 | Backend receives GPS | ✅ | `POST /drivers/{id}/location` |
| P3-05 | Dashboard reflects driver movement | ✅ | `LocationEventRow` → dashboard map drivers |
| P3-06 | 3D route (optional bonus) | ➕ | `RouteMap3D.tsx`, `GET .../route?dimensions=3` |
| P3-07 | Chapter 5.3 Driver application | ⚠️ | Not yet in main dissertation |
| P3-08 | Screenshot for Viva (driver) | ❌ | Suggest: `Viva/screenshots/driver.png` |
| P3-09 | Delm8-style UX (map + ordered stops) | ➕ | `driver_app/src/App.tsx` workspace layout |
| P3-10 | Google Maps / Waze deep links | ➕ | `mapsLinks.ts` — external navigation |

---

## E. Phase 4 — Client application

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| P4-01 | Orders list loads | ✅ | `GET /clients/{id}/orders` |
| P4-02 | Shipment tracking — status | ✅ | `GET /shipments/{id}/tracking` (+ pickup/delivery phase) |
| P4-02b | Door-to-door pickup + delivery addresses | ✅ | Client create; driver Collect/Deliver; status `Picked Up` |
| P4-03 | ETA visible | ✅ | Tracking panel |
| P4-04 | Location updates on map | ✅ | Mini-map ~3 s poll |
| P4-05 | Chapter 5.2 Client application | ⚠️ | Not yet in main dissertation |
| P4-06 | Screenshot for Viva (client) | ❌ | Suggest: `Viva/screenshots/client.png` |
| P4-07 | Demo accounts (login) | ✅ | `client1` / `demo` in README |
| P4-08 | Light / dark theme | ➕ | `ThemeToggle.tsx` |

**Stretch:** Registration, create shipment, delivery options, British English copy.

---

## F. Phase 5 — Evaluation support

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| P5-01 | API response time logging | ✅ | `X-Response-Time-Ms`; `Tests/performance/latency_check.py` |
| P5-02 | Dashboard load / refresh timing | ✅ | UI shows API round-trip ms |
| P5-03 | No critical usability issues | ⚠️ | Subjective — run heuristic pass |
| P5-04 | Screenshots for evaluation chapter | ❌ | `Viva/screenshots/` |
| P5-05 | Chapter 6 Evaluation & results | ⚠️ | Template: `Evaluation_Heuristics_SUS_Ethics.md` |
| P5-06 | `Tests/usability/` folder | ❌ | Plan requires folder; **create** checklist + results |
| P5-07 | Record latency results (p50/p95 vs 300 ms NFR) | ❌ | Run `latency_check.py`, paste table into Ch.6 |

---

## G. Phase 6 — Viva readiness

| ID | Requirement | Status | Evidence / notes |
|----|-------------|--------|------------------|
| P6-01 | System runs live without setup issues | ✅ | `server-control.bat` [1] Start ALL |
| P6-02 | Demo completes in &lt; 15 minutes | ⚠️ | Rehearse once; script optional |
| P6-03 | `Viva/demo_video.mp4` | ❌ | Record screen + narration |
| P6-04 | `Viva/screenshots/*.png` | ❌ | Minimum: dashboard, driver, client |
| P6-05 | README explains how to run | ⚠️ | `Source_Code/README.md` — add **root** README pointer |
| P6-06 | Fake data only / no real customers | ✅ | Seed + simulation |
| P6-07 | Presentation files | ⚠️ | `Viva/Viva_Presentation.docx` / `.pptx` exist — align with live demo |

---

## H. Repository structure (Implementation Plan §2)

| Path (required) | Status | Actual location |
|-----------------|--------|-----------------|
| `Source_Code/backend/` | ✅ | |
| `Source_Code/dashboard/` | ✅ | |
| `Source_Code/client_app/` | ✅ | |
| `Source_Code/driver_app/` | ✅ | |
| `Documentation/Requirements` | ✅ | `Requirements Document.docx` |
| `Documentation/Architecture` | ✅ | `Architecture Document.docx` |
| `Documentation/API_Contract_v1.docx` | ✅ | |
| `Documentation/Evaluation_Plan_v1.docx` | ✅ | |
| `Documentation/Dissertation_Main_Document.docx` | ✅ | |
| `Tests/performance/` | ✅ | `latency_check.py` |
| `Tests/usability/` | ❌ | **Create** |
| `Viva/screenshots/` | ❌ | **Create** |
| `Viva/demo_video.mp4` | ❌ | **Record** |
| Root `README.md` | ❌ | Only `Source_Code/README.md` today |

---

## I. Code review criteria (accept / reject)

| # | Criterion | Priority | Status | Action if ⚠️/❌ |
|---|-----------|----------|--------|----------------|
| CR-1 | Functional correctness — requirements + API contract | CRITICAL | ⚠️ | Finish API matrix (section J); no placeholder endpoints |
| CR-2 | Stability — no crashes on basic flows | CRITICAL | ✅ | Keep `pytest` green before commits |
| CR-3 | Simplicity — explainable at Viva | CRITICAL | ✅ | Avoid new frameworks without one-sentence justification |
| CR-4 | Ethics — simulated data only | CRITICAL | ✅ | State `password_plain` is prototype-only in Ch.5 |
| CR-5 | UI clear, not cluttered | HIGH | ✅ | Driver redesign reviewed; office/client OK |
| CR-6 | Performance — typical API &lt; 300 ms | HIGH | ⚠️ | Run `latency_check.py`; document percentiles |
| CR-7 | Maintainability — structure, naming | MEDIUM | ✅ | |
| CR-8 | Documentation + screenshots for dissertation | MANDATORY | ❌ | Viva folder + Ch.5–6 population |

**Reject rule:** Impressive but unstable features — prefer clarity over complexity.

---

## J. API contract matrix (fill in vs `API_Contract_v1.docx`)

Mark each row after reading the contract document. **Implemented in code** column is pre-filled from `main.py` (extras included).

| Endpoint (contract) | In contract? | Implemented? | Notes |
|---------------------|--------------|--------------|-------|
| `POST /auth/login` | ☐ verify | ✅ | |
| `GET /clients/{id}/orders` | ☐ verify | ✅ | |
| `GET /shipments/{id}/tracking` | ☐ verify | ✅ | |
| `GET /drivers/{id}/jobs` | ☐ verify | ✅ | |
| `POST /drivers/{id}/location` | ☐ verify | ✅ | |
| `POST /shipments/{id}/status` | ☐ verify | ✅ | |
| `GET /dashboard/overview` | ☐ verify | ✅ | |
| `GET /dashboard/map` | ☐ verify | ✅ | + filter query params |
| `POST /simulation/gps/start` | ☐ verify | ✅ | |
| `POST /simulation/status/start` | ☐ verify | ✅ | |
| *(extras not in contract)* | — | ➕ | `register`, `assign`, `delivery-queue`, `shipments-map-context`, `route?dimensions=3`, `delayed` alerts, `delivery-options`, … |

**Action:** Open `Documentation/API_Contract_v1.docx`, tick “In contract?” column, resolve any ❌ mismatches (path, method, JSON field names).

---

## K. Planned work queue (full backlog)

**Agreed execution order (2026-05-15):**

1. **Sprint A — App improvements** (N-16 … N-21, plus any new rows from dissertation-aligned requirements you provide).
2. **Sprint B — Repo, evaluation, Viva prep** (N-06, N-11 … N-15).
3. **Sprint C — Manual / your side** (N-07, N-08, N-09, N-10, optional N-22).

When a row is finished, set **Status** to ✅ and move evidence to the matching phase section (B–G) above.

**Status key:** ☐ not started · 🔄 in progress · ✅ done · ⏸ deferred · ❌ cancelled

---

### Sprint A — App improvements (FIRST)

**Reference:** Delm8 screenshots (May 2026) — goal: **match courier UX, exceed via CMP600 integration** (office + client + live dashboard).  
Full gap analysis: `Documentation/Delm8_vs_CMP600_Driver_Analysis.md`

| ID | Planned item | Target | Status | P | Delm8 ref |
|----|--------------|--------|--------|---|-----------|
| **D-01** | **Map ↔ List** toggle; list shows Dist/ETA per stop, depot row | driver | ✅ | P0 | List + Map buttons |
| **D-02** | **Numbered pins** on map (1…n) for queue order; next=gold, active=green | driver | ✅ | P0 | Red numbered pins |
| **D-03** | **Route summary** card: stops count, simulated total miles, projected finish time | driver | ✅ | P0 | Route Summary modal |
| **D-04** | **Active stop bottom sheet**: address, ETA, stops left, Navigate, Done, Edit | driver | ✅ | P0 | Bottom panel |
| **D-05** | Map floating controls: **locate** + **fit entire route** | driver | ✅ | P1 | Right-side stack |
| **D-06** | **Search** stops in list (postcode/address filter) | driver | ✅ | P1 | List search icon |
| **D-07** | **Simulated optimise route** (reorder queue client-side NN) + API note in UI | driver | ✅ | P1 | Optimise button |
| **D-08** | **Edit stop** drawer: notes (local), Failed → status Delayed, service badge | driver | ✅ | P2 | Edit Stop screen |
| **D-09** | Default map = **my run only**; fleet toggled off; cleaner full-screen map | driver | ✅ | P1 | Delm8 focus |
| **D-10** | After **Start next leg** → confirm **Open Google Maps** | driver | ✅ | P1 | Navigate |
| **D-11** | **Mobile**: list sheet over map (collapsible) | driver | ✅ | P1 | Phone layout |
| **D-12** | **Edit Route** screen: name, start time, start/finish, stop time, default (local) | driver | ✅ | P1 | Delm8 Edit Route |
| N-16 | Office: **Delivery date** column in dispatch table | dashboard | ✅ | A2 | Office parity |
| N-17 | Office: QA filters ↔ map ↔ table same query | dashboard | ☐ | A2 | |
| N-20 | Client: success + highlight after **Create shipment** | client | ✅ | A2 | |
| N-21 | All apps: footer **prototype · simulated data** | all | ✅ | A3 | |
| N-01 | *Your extra dissertation rules* | TBD | ☐ | — | Add when specified |
| N-02 | *Your extra dissertation rules* | TBD | ☐ | — | |
| N-03 | *Your extra dissertation rules* | TBD | ☐ | — | |

**Delm8 — explicitly OUT of scope (Viva risk / not in dissertation):**

| Feature | Reason |
|---------|--------|
| Voice search, camera OCR, scan manifest | Real APIs/hardware; hard to demo |
| Full **Edit Route** with server sync | Local-only in driver app (see D-12); office still assigns shipments |
| Driver **Add Stop** / postcode entry | Client + office create shipments |
| True turn-by-turn inside app | Use Google Maps / Waze deep links |
| Paid Mapbox/Google embed | Keys + billing |

**Already better than Delm8 (keep & show at Viva):**

| CMP600 advantage | Evidence |
|------------------|----------|
| Office sees driver on live map | `dashboard` + location events |
| Client creates order → office assigns → driver queue | 3-app flow |
| Delayed alerts + date filters | Dashboard |
| 3D route preview (stretch) | `RouteMap3D` |
| Light/dark theme | All apps |
| External nav with real GPS | `mapsLinks.ts` |

**Deferred (later — user requested backlog):**

| ID | Planned item | Target | Status | Notes |
|----|--------------|--------|--------|-------|
| **D-13** | **Real road routing** (OSRM / Google Directions API) | driver + backend | ☐ | External API keys; replace haversine legs |
| **D-14** | **Persist optimised stop order** on server | backend + driver | ☐ | New endpoint; sync with office queue |
| N-04 | Mobile bottom navigation | driver | ⏸ | After N-19 if still needed |
| N-05 | Drag reorder stops (local state only) | driver | ⏸ | No backend; explain at Viva if added |

---

### Sprint B — Documentation, tests, Viva prep (AFTER apps)

| ID | Planned item | Target | Status | Priority | Notes |
|----|--------------|--------|--------|----------|-------|
| N-06 | Root `README.md` | repo | ☐ | B1 | Points to `Source_Code/README.md`, `server-control.bat` |
| N-11 | Create `Viva/screenshots/` + README (file names, what to capture) | Viva | ☐ | B1 | After UI stable post–Sprint A |
| N-12 | `Tests/usability/` — heuristic template + empty results table | Tests | ☐ | B2 | From `Evaluation_Heuristics_SUS_Ethics.md` |
| N-13 | Run `latency_check.py` → save results in `Tests/performance/results.md` | Tests | ☐ | B2 | For Chapter 6 / CR-6 |
| N-14 | Complete **section J** API matrix vs `API_Contract_v1.docx` | Documentation | ☐ | B2 | Tick contract column; fix mismatches |
| N-15 | `Viva/DEMO_SCRIPT.md` — 10–15 min live demo steps | Viva | ☐ | B3 | Matches final UI |

---

### Sprint C — Manual / dissertation (you + optional cloud)

| ID | Planned item | Target | Status | Notes |
|----|--------------|--------|--------|-------|
| N-07 | Screenshots: `dashboard.png`, `driver.png`, `client.png` | Viva | ☐ | Capture after Sprint A |
| N-08 | Record `Viva/demo_video.mp4` | Viva | ☐ | Follow N-15 script |
| N-09 | One usability review session → fill N-12 template | Tests | ☐ | |
| N-10 | Populate Ch.5.1–5.4 and Ch.6 in `Dissertation_Main_Document.docx` | Documentation | ☐ | `Dissertation_Population_Guide.md` |
| N-22 | Cloud deploy (Railway/Render) + public API URL in README | infra | ☐ | Optional unless required by assessor |

---

## L. Review log

| Date | Reviewer | Summary |
|------|----------|---------|
| 2026-05-15 | Initial gap analysis | Core apps ✅; Viva artefacts ❌; dissertation chapters ⚠️ |
| 2026-05-15 | Sprint order agreed | **Apps first** (Sprint A), then B/C; section K populated |
| 2026-05-15 | Delm8 screenshot review | Added D-01…D-11 + `Delm8_vs_CMP600_Driver_Analysis.md` |
| 2026-05-15 | Driver Delm8 sprint | D-01…D-11 implemented in `driver_app` (`App.tsx`, `courier-styles.css`, helpers) |
| 2026-05-15 | Sprint A wrap-up | N-16 delivery date column; N-20 create-shipment feedback; N-21 shared footer |
| 2026-05-15 | Edit Route + backlog | D-12 Edit Route UI; D-13/D-14 deferred (OSRM, server route order) |
| 2026-05-17 | Routing strategy doc | `Door_to_Door_Routing_Strategy.md` — target: depot → pickup → deliver → NN next pickup |
| | | |

---

## N. Door-to-door routing (Sprint R — after UX stabilisation)

**Spec:** `Documentation/Door_to_Door_Routing_Strategy.md`

| ID | Planned item | Target | Status | Notes |
|----|--------------|--------|--------|-------|
| R1-1 | `buildDoorToDoorPlan` (NN chain + start-of-day deliveries) | driver_app | ✅ | `doorToDoorRoute.ts` |
| R1-2 | Optimise + next stop after Delivered use plan | driver_app | ✅ | `App.tsx` — no 2-opt / reverse |
| R2-1 | List row: show Pickup + Delivery addresses | driver_app | ✅ | `StopListRow.tsx` |
| R2-2 | Polyline follows full planned legs | driver_app | ✅ | `App.tsx` `effectiveStopOrder` |
| R2-3 | Edit route: routing strategy label | driver_app | ✅ | `EditRouteScreen.tsx` |
| R3-1 | Optional: miles compare batch vs chain in Tests | Tests | ✅ | `Tests/performance/route_compare.md` + Optimise toast |
| R3-2 | Paste Ch.4–6 paragraphs from routing doc §8 | Documentation | ☐ | `Dissertation_Main_Document.docx` |

**Deferred (future work):** D-13 OSRM road distances; D-14 server-persisted route order; full PD-VRP solver.

| | | |

---

## M. One-page “ready for Viva” gate

All must be ✅ before considering the project **fully done** per both developer documents:

- [ ] `pytest` passes  
- [ ] All three frontends `npm run build`  
- [ ] `server-control.bat` demo rehearsed (&lt; 15 min)  
- [ ] `Viva/screenshots/dashboard.png`, `driver.png`, `client.png`  
- [ ] `Viva/demo_video.mp4`  
- [ ] Root `README.md`  
- [ ] `Tests/usability/` with at least one completed review  
- [ ] Latency table in Chapter 6 (from `latency_check.py`)  
- [ ] Chapters 5.1–5.4 and 6 drafted in `Dissertation_Main_Document.docx`  
- [ ] API contract matrix (section J) fully verified  

---

*Synced with: `Developer Checklist,Code Review Criteria.docx`, `Developer Implementation Plan.docx`, and current `Source_Code/` tree.*
