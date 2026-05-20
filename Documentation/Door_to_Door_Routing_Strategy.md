# Door-to-door routing strategy — dissertation narrative & implementation plan

**Purpose:** Define the **recommended routing policy** for the CMP600 driver prototype: how the van moves from **Start from** (Edit route) through **pickup → delivery** pairs until the run is complete. Use this document in **Chapter 4 (Methodology)**, **Chapter 5 (Implementation)**, and **Chapter 6 (Evaluation / limitations)**.

**Related:** `Door_to_Door_Parcel_Flow_Plan.md` (status & addresses), `Delm8_vs_CMP600_Driver_Analysis.md` (UX comparison), `Implementation_Notes_DEV.md` (developer summary).

**Status (May 2026):** Door-to-door **status workflow** is implemented. **Routing** still uses a simplified heuristic (batch nearest-neighbour on *active* stop legs only). **Target policy** in §3 is the agreed direction for the next implementation sprint.

---

## 1. Problem statement (for dissertation)

A door-to-door courier does **not** follow a “warehouse” model (collect everything, return to hub, deliver everything). Each parcel has:

1. A **pickup** location (sender).
2. A **delivery** location (recipient).

The driver must respect **precedence**: *pickup before delivery for the same shipment*. The route should start from a configurable **depot or start point** (Edit route → **Start from**), not from an arbitrary list sort.

**Observed prototype limitation (honest limitation text):** When many jobs are `Assigned`, the list and **Optimise** button can show **only pickup addresses** because each shipment exposes one *active leg* at a time. Delivery addresses exist in data but are not always visible as separate map stops until the parcel is collected. §5 describes UI fixes.

---

## 2. Alternative routing models (comparison table)

Use this table in Chapter 4 or 5 to justify the chosen approach.

| Model | Tour shape | Precedence | Fit for CMP600 door-to-door | Dissertation role |
|--------|------------|------------|-----------------------------|-------------------|
| **A. Batch hub** | All pickups → depot → all deliveries | At hub | Poor (not door-to-door) | **Contrast** — explain why rejected |
| **B. Static pickup tour** | Depot → optimised pickups only; deliveries later | Per shipment after collect | Partial — current Optimise approximates this at start of day | **Current prototype** baseline |
| **C. Dynamic door-to-door chain** | Start → nearest pickup → deliver same parcel → from delivery point nearest next pickup → … | Pickup then deliver per parcel | **Best fit** | **Recommended target** |
| **D. Full PD-VRP** | Global tour with pickup–delivery pairs and constraints | Solver-enforced | Excellent but heavy | **Future work** |

---

## 3. Recommended policy: dynamic nearest-neighbour door-to-door chain

### 3.1 Name (academic)

**Dynamic nearest-neighbour door-to-door routing with precedence constraints** (greedy heuristic).

### 3.2 Rules (numbered — paste into Chapter 4/5)

1. **Start:** The tour begins at **Start from** (`RouteSettings.startFromId` in Edit route), typically the simulated depot or the driver’s last known position.
2. **Precedence:** For shipment *s*, the pickup leg must be completed before the delivery leg (*Picked Up* or later before *Delivered*).
3. **Pairing:** After each **pickup** (collection + load on van), the driver immediately performs the **delivery** for that same shipment (no leaving parcel on van while visiting another sender unless business rules allow multi-parcel — here we assume **one logical pair at a time** for clarity).
4. **Next job selection:** After each **delivery**, the next **pickup** is the geographically **nearest** remaining `Assigned` pickup (haversine miles from **current position**, not from depot).
5. **Re-optimise:** The **Optimise** control recomputes the **remaining** tour using the same rules from the driver’s **current** location (or start point if replanning the full day).
6. **Honest scope:** This is a **greedy** heuristic; it does **not** guarantee a globally minimum-distance tour (cite standard OR/VRP literature on nearest-neighbour and PDP heuristics).

### 3.3 Start-of-day exception (parcels already on van)

If some shipments are already **Picked Up** or **In Transit** (parcel on van, delivery pending):

1. From **Start from**, serve **pending deliveries** first (nearest-neighbour among delivery coordinates only).
2. Then begin the **pickup → deliver** chain for remaining **Assigned** jobs.

*Dissertation sentence:* “Pre-loaded parcels are prioritised to avoid carrying completed pickup obligations through the entire tour.”

### 3.4 Pseudocode (for Chapter 5 or appendix)

```
current ← startFromDepotOrGps()
plan ← empty list

// Phase 0 — deliveries already on board
for each shipment s where status ∈ {Picked Up, In Transit}:
  append delivery(s) to plan  // order by NN from current, updating current

// Phase 1 — door-to-door pairs
while exists Assigned shipment:
  s ← argmin distance(current, pickup(s)) among Assigned
  append pickup(s), delivery(s) to plan
  current ← location(delivery(s))

return plan
```

### 3.5 One-paragraph conclusion (ready for Chapter 5 or 6)

> The driver application implements a pragmatic door-to-door routing policy aligned with single-van courier practice. From the configured start location, the system plans a tour that respects pickup-before-delivery precedence by chaining pickup and delivery for each parcel. After each delivery, the next pickup is chosen by a nearest-neighbour rule relative to the driver’s current position, and the Optimise action replans the remaining legs. This greedy approach is computationally inexpensive and explainable to users, but it does not replace a full pickup-and-delivery vehicle routing solver; total distance may be suboptimal compared with global optimisation or batched hub models.

---

## 4. Mapping to driver UI and statuses

| Step in policy | Driver action | Status transition | Visible stop leg |
|----------------|---------------|-------------------|------------------|
| Go to sender | Navigate, load parcels, Collected | `Assigned` → `Picked Up` | Pickup (collect) |
| Go to recipient | Navigate, Delivered | `Picked Up` → `In Transit` → `Delivered` | Delivery |
| Next parcel | Auto-advance to next in `plan` | — | Next pickup |

**Edit route** does **not** need a separate “pickup and delivery” toggle. It already provides **Start from**, **Finish at**, start time, and stop duration. Add (optional) read-only label: **Routing strategy: Door-to-door (nearest next pickup)**.

**List row (recommended UI):** Always show both addresses:

- `Pickup: …`
- `Delivery: …`

Only the **active** leg gets the map pin and primary Navigate target; the other address is informational (grey text).

**Map pins:** Active leg only (or optional grey “future delivery” pin — stretch goal).

---

## 5. Current prototype vs target (honest)

| Area | Current (May 2026) | Target |
|------|-------------------|--------|
| Stop expansion | One leg per shipment in list (`Assigned` → collect only; later deliver only) | Same legs, but **plan** contains both in order |
| Optimise | ~~NN + 2-opt~~ → **`buildDoorToDoorPlan`** from Start from / GPS at click time | **Door-to-door chain** (§3) — implemented Sprint R1 |
| Next stop after Delivered | Uses optimised `manualOrder` / `manualStopOrder` (fixed) | Same storage, filled by §3 algorithm |
| Completed stops in list | Stay in optimised position (fixed) | Unchanged |
| Route summary polyline | Depot → pending stops in list order | Depot → full planned legs (pickup & delivery points) |
| Server persistence | Route order **device-local** only | Unchanged for MVP (state in dissertation limitations) |

---

## 6. Implementation plan (phased)

### Sprint R1 — Routing core (driver_app)

| ID | Task | Files | Acceptance |
|----|------|-------|------------|
| R1-1 | Add `buildDoorToDoorPlan(onRun, start, queue)` returning ordered `{ stopKey, phase, shipmentId, lat, lng }[]` | `runStops.ts` or new `doorToDoorRoute.ts` | Unit-testable plan for 3+ shipments |
| R1-2 | Implement Phase 0 (pending deliveries from start) + Phase 1 (NN pickup → deliver pairs) | same | Plan respects precedence |
| R1-3 | Replace `handleOptimise` to call new planner; set `manualStopOrder` to full plan keys | `App.tsx` | Optimise order matches §3 |
| R1-4 | `pickNextShipmentInRunOrder` uses same plan index after Delivered | `App.tsx`, `runStops.ts` | Next stop is next in plan, not API queue |
| R1-5 | Remove batch-only “all pickups first” assumption in comments/docs | `routeMetrics.ts` | — |

### Sprint R2 — List & map UX

| ID | Task | Files | Acceptance |
|----|------|-------|------------|
| R2-1 | List row: always show pickup + delivery lines | `StopListRow.tsx`, CSS | User sees both addresses |
| R2-2 | `runPolyline` follows planned legs (collect + deliver coords) for pending tour | `App.tsx` | Map line visits both types |
| R2-3 | Stop numbers (`order`) = position in **plan**, not shipment ID sort | `App.tsx` | After Optimise, 1..N matches drive order |
| R2-4 | Edit route: show routing strategy label (read-only) | `EditRouteScreen.tsx`, `routeSettings.ts` | Text matches §3 |

### Sprint R3 — Documentation & evaluation hooks

| ID | Task | Files | Acceptance |
|----|------|-------|------------|
| R3-1 | Log `totalMiles` and `legs` count on Optimise (existing stats + plan length) | `App.tsx` | Toast or nav message for demo |
| R3-2 | Optional: compare miles “batch pickups only” vs “door-to-door chain” in `Tests/` note | `Tests/performance/` | One table for dissertation |
| R3-3 | Update `GAP_Checklist_Tracking.md` when R1–R2 done | Documentation | — |

### Sprint R4 — Future work (not required for MVP)

- Full **PD-VRP** with tabu search / OR-Tools (cite as future work).
- **OSRM** road distances instead of haversine (`D-13` in gap list).
- Server-side `POST /drivers/{id}/route-order` persistence.

---

## 7. Data structures (developer reference)

```typescript
type PlannedLeg = {
  stopKey: string;       // e.g. S2001:collect | S2001:deliver
  shipmentId: string;
  phase: "collect" | "deliver";
  lat: number;
  lng: number;
};

type DoorToDoorPlan = {
  legs: PlannedLeg[];
  totalMiles: number;
  strategy: "door-to-door-nearest";
};
```

**Storage (unchanged):** `manualStopOrder: string[]` = `legs.map(l => l.stopKey)`; `manualOrder: string[]` = unique shipment IDs in visit order (pickup first occurrence).

---

## 8. Dissertation chapter snippets (copy-paste)

### 8.1 Methodology (Chapter 4) — design decision

> Routing was modelled as a single-vehicle pickup-and-delivery problem with one-to-one precedence (each shipment has one pickup and one delivery, pickup first). Rather than implementing an industrial PD-VRP solver, the artefact uses a transparent **greedy door-to-door chain**: after each delivery, the next collection point is the nearest remaining pickup relative to the driver’s position. The start location is user-configurable (depot or simulated hub). This design trades optimality for explainability, implementation effort, and alignment with a mobile driver workflow.

### 8.2 Implementation (Chapter 5) — driver app

> The driver module exposes route planning through **Edit route** (start/finish locations and timing assumptions) and **Optimise**, which builds a local tour order stored on the device. The tour sequences pickup and delivery legs per parcel and selects the next pickup using a nearest-neighbour metric (haversine distance). Map polylines and numbered stops reflect this order. Server-side route persistence was out of scope; the office queue API remains status-prioritised for dispatch overview.

### 8.3 Limitations (Chapter 6)

> Route order is heuristic and device-local; reloading the app on another device does not restore tour order. Distances are great-circle miles, not road network distances. The optimiser does not re-sequence deliveries once a parcel is on the van except for the start-of-day “pending delivery” pass. A production system would integrate road routing APIs and optional central dispatch control.

---

## 9. Evaluation ideas (link to `Evaluation_Heuristics_SUS_Ethics.md`)

| Metric | How |
|--------|-----|
| **Plan length (miles)** | Compare batch-pickup tour vs door-to-door chain on same 20-stop seed |
| **Task time** | Heuristic review: can a tester explain “what happens after Optimise?” |
| **Correctness** | After Optimise, first stop is nearest pickup from start; after deliver #1, second pickup is nearest from delivery #1 |
| **SUS** | Optional question on clarity of pickup vs delivery on list |

---

## 10. Traceability

| Requirement theme | How this strategy helps |
|-------------------|-------------------------|
| Driver route efficiency | Reduces backtracking vs batch pickup list without delivery context |
| Door-to-door FR | Enforces pickup → deliver per parcel |
| Dispatcher dashboard | Unchanged (office sees status, not driver tour) |
| NFR: explainability | Greedy rules are demonstrable in viva |

---

## 11. Sign-off checklist (implementation complete when)

- [ ] `buildDoorToDoorPlan` implemented and covered by a small test
- [x] Optimise uses door-to-door plan from Start from / current GPS
- [ ] List shows pickup + delivery on every row
- [ ] After Delivered, next stop follows plan (not server queue priority)
- [ ] `Implementation_Notes_DEV.md` and `GAP_Checklist_Tracking.md` updated
- [ ] Dissertation Ch.4–5 paragraphs in §8 pasted or adapted

---

*Last updated: May 2026 — agreed routing direction after driver UX review (list order, Optimise direction, PRM badge, float card workflow).*
