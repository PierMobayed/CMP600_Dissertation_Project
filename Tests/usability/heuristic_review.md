# Heuristic evaluation — Door2Door CMP600 prototype

**Evaluator:** Pier Samer Mobayed  
**Date:** 2026-05-21  
**Method:** Nielsen’s 10 usability heuristics; one structured pass per app (~35 minutes each), recorded in this template.  
**Apps reviewed:** Dashboard (`5173`), Client (`5174`), Driver (`5175`).

**Severity scale:** 0 = no issue · 1 = cosmetic · 2 = minor · 3 = major · 4 = catastrophe (blocks task).

---

## Summary

| App | Critical (4) | Major (3) | Minor (1–2) | Cosmetic (1) |
|-----|--------------|-----------|-------------|--------------|
| Dashboard | 0 | 0 | 2 | 1 |
| Client | 0 | 0 | 2 | 1 |
| Driver | 0 | 0 | 2 | 1 |

**Overall narrative (for dissertation Ch. 6):**  
The three-role prototype communicates operational state clearly through KPI tiles, map markers, and status labels aligned with logistics vocabulary. Booking and tracking flows are discoverable from public landing pages without prior training. Friction is limited to prototype constraints: long parcel lists without virtualisation, bearer-token auth rather than OAuth, and mobile web layouts that are usable but not equivalent to native courier apps. No heuristic failures blocked core tasks (sign-in, track parcel, view route, office map refresh).

---

## Findings by heuristic

### H1 — Visibility of system status

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | KPI panel and “Data refresh … ms” footer show live polling; delayed alerts list highlights at-risk shipments. | 1 | Add brief legend tooltip for marker colours on first visit. |
| Client | Five-step booking indicator; tracking panel shows phase (“driver heading to collect”) and ETA. | 1 | Show last-updated timestamp on tracking map. |
| Driver | Active stop highlighted on map; numbered pins (1…n) match queue order; GPS toggle visible. | 2 | Surface simulation-on indicator more prominently when GPS feed is active. |

### H2 — Match between system and the real world

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | Terms: shipment, in transit, delivered, delayed — match dispatcher language. | 0 | — |
| Client | Collect / deliver / service tiers mirror consumer parcel sites. | 1 | Clarify “simulated checkout” on pay step for ethics transparency. |
| Driver | Pick up, deliver, Maps/Waze deep links match courier mental models. | 0 | — |

### H3 — User control and freedom

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | Status/driver/date filters; simulation start/stop; logout. | 1 | “Clear all filters” single control. |
| Client | Back from booking steps; edit order where status allows; logout. | 2 | Confirm dialog before cancel shipment. |
| Driver | Edit route (local), change active job, list/map toggle, logout. | 1 | Undo last status change in prototype. |

### H4 — Consistency and standards

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | Shared Door2Door branding, landing → auth → console pattern, light/dark theme on all three apps. | 1 | Harmonise primary button colour (red client vs purple office) in a future design system. |

### H5 — Error prevention

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | Required fields on login and postcode-led address steps; API errors surfaced as inline messages. | 2 | Block “Continue” until postcode validates for UK format. |

### H6 — Recognition rather than recall

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | Map + dispatch table share filter context; driver names not only IDs. | 1 | — |
| Client | Parcel list shows collection/delivery addresses; search suggests matches. | 2 | Paginate or collapse older orders by default. |
| Driver | Numbered map pins tied to list rows; route summary card shows stop count. | 1 | — |

### H7 — Flexibility and efficiency of use

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | Today-only date shortcut; assign driver from dispatch. | 1 | Keyboard shortcut for refresh. |
| Driver | Optimise route (greedy NN), external navigation links, map fit-route control. | 1 | Persist optimised order server-side in production. |

### H8 — Aesthetic and minimalist design

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | KPI-first layout follows dashboard best practice (Few, 2013); map dominates right pane. | 1 | Reduce event log height on smaller laptops. |

### H9 — Help users recognise, diagnose, and recover from errors

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | Failed login shows message; empty API responses handled without white screen. | 2 | Retry button on network failure. |

### H10 — Help and documentation

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | README, `server-control.bat`, OpenAPI `/docs`; footer states simulated data. | 1 | Link to short “Viva demo” PDF from landing footers. |

---

## Cross-app themes (copy to dissertation)

1. **Map-centric visibility** — All roles use Leaflet maps with role-appropriate markers; office sees fleet, client sees tracking, driver sees ordered stops.  
2. **Prototype auth and data** — Demo accounts and simulated GPS are adequate for evaluation but must not be presented as production security.  
3. **Mobile-ready driver UX** — List/map toggle and bottom-sheet stop actions support phone-sized viewports; office remains desktop-first.

---

## Optional: SUS (if ethics approval includes it)

Not administered — ethics form specified no external participants; heuristic inspection was the agreed method in `Evaluation_Plan_v1.docx`.

---

## Evidence checklist

- [x] Screenshots saved under `Viva/screenshots/` (dashboard, client-landing, client-tracking, driver, swagger)
- [x] Notes aligned with `Documentation/Evaluation_Heuristics_SUS_Ethics.md`
- [x] Summary paragraph drafted for **Chapter 6 — Evaluation**
