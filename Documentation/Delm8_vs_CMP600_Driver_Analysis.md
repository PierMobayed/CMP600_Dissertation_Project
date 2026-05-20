# Delm8 vs CMP600 Driver — feature analysis

**Purpose:** Decide what to copy, what to skip, and how to be **better than Delm8** for the dissertation prototype.  
**Delm8 reference:** Mobile route planner (UK postcodes, map + list, optimise, external navigation).  
**CMP600 scope:** Integrated system — client, office dashboard, driver (simulated data).

---

## 1. What Delm8 does well (worth matching)

| Delm8 screen | Strong UX | CMP600 driver today |
|--------------|-----------|---------------------|
| **Map + route line** | Full-screen map, blue polyline, clear sequence | ✅ Polyline on active leg; ⚠️ not full run polyline |
| **Numbered stops** | Red pins 1, 2, 3… on map | ❌ Circle markers, no numbers |
| **Route summary** | Finish time, stop count, total miles | ⚠️ Hero has counts only; no miles/finish time |
| **Map / List toggle** | Bottom bar switches views | ❌ Side panel only; no list-first mobile |
| **List row detail** | Address, Dist, ETA, priority (Prm) | ⚠️ Address + status; no per-leg Dist/ETA |
| **Active stop panel** | Dist, ETA, “N stops to go”, big actions | ⚠️ Partial; actions scattered |
| **Navigate** | Opens external turn-by-turn | ✅ Google Maps + Waze |
| **Done / status** | Mark stop complete | ⚠️ Generic status buttons, not stop sheet |
| **Edit stop** | Notes, failed/succeeded, time window | ❌ |
| **Optimise** | Reorder for efficiency | ❌ Fixed server queue only |
| **Search** | Postcode bar + recent | ❌ |
| **Map tools** | Locate, fit route, layers | ❌ |
| **Add stop** | Manual + manifest | ❌ (correct for CMP600: client/office) |

---

## 2. Where CMP600 is already stronger (say this at Viva)

1. **End-to-end platform** — Delm8 is driver-only; you have client booking, office dispatch, and fleet map.  
2. **Live operations** — Office dashboard shows driver position and delayed shipments.  
3. **Explainable simulation** — GPS/status simulation documented in backend, not a black box.  
4. **Academic constraints** — No real PII, bearer auth, pytest, latency header for evaluation.  
5. **3D visualisation stretch** — MapLibre tilt + elevation strip (Delm8 has no equivalent in screenshots).

---

## 3. Recommended driver sprint (better than Delm8, still Viva-safe)

### P0 — Must have (Delm8 parity)

- **D-01** Map ↔ List views with shared queue data.  
- **D-02** Numbered map markers matching list order.  
- **D-03** Route summary (stops, simulated miles, projected finish).  
- **D-04** Bottom sheet for active stop: Navigate, Mark delivered, Edit.

### P1 — Should have (clearly “better”)

- **D-05** Locate + fit-route map controls.  
- **D-06** Search/filter in list.  
- **D-07** “Optimise route” (client-side reorder + disclaimer: simulated).  
- **D-09** Map shows **my run** by default (less clutter than showing all fleet).  
- **D-10** Start next leg → optional Google Maps.  
- **D-11** Mobile collapsible list over map.

### P2 — Nice to have

- **D-08** Edit stop: local notes + Failed → `Delayed` status.  
- Priority badge from `delivery_option` (Express / SameDay).

### Office / client (same sprint)

- **N-16** Delivery date in dispatch table.  
- **N-20** Client create-shipment feedback.

---

## 4. Do not build (even if Delm8 has it)

| Feature | Why skip |
|---------|----------|
| Microphone / camera postcode | Scope creep, privacy narrative |
| Manifest scan | Not in requirements |
| Driver adds stops | Breaks office/client workflow story |
| In-app Google Maps JS | API key, cost, complexity |
| Drag reorder with backend persist | Needs new API; use Optimise simulation first |

---

## 5. Dissertation wording (one paragraph)

> The driver interface adopts patterns from commercial courier planners (e.g. sequenced stops, map–list duality, external navigation hand-off) while remaining a **component of an integrated logistics prototype**. Unlike standalone route planners, driver actions update a shared backend consumed by the office dashboard and client tracker, supporting the research question on multi-application visibility and simulated big-data flows.

---

*Linked from `GAP_Checklist_Tracking.md` section K.*
