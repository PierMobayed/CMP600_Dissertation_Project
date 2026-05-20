# Heuristic evaluation — Door2Door CMP600 prototype

**Evaluator:** _[Your name]_  
**Date:** _[YYYY-MM-DD]_  
**Method:** Nielsen’s 10 usability heuristics; _[1–2]_ independent passes per app, ~30–45 minutes each.  
**Apps reviewed:** Dashboard (`5173`), Client (`5174`), Driver (`5175`).

**Severity scale:** 0 = no issue · 1 = cosmetic · 2 = minor · 3 = major · 4 = catastrophe (blocks task).

---

## Summary

| App | Critical (4) | Major (3) | Minor (1–2) | Cosmetic (1) |
|-----|--------------|-----------|-------------|--------------|
| Dashboard | _0_ | _0_ | _0_ | _0_ |
| Client | _0_ | _0_ | _0_ | _0_ |
| Driver | _0_ | _0_ | _0_ | _0_ |

**Overall narrative (for dissertation Ch. 6):**  
_[2–4 sentences: what worked well (maps, KPIs, booking flow), main friction points, whether issues are prototype-only.]_

---

## Findings by heuristic

### H1 — Visibility of system status

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | _e.g. KPI refresh, map legend, dispatch message area_ | _0–4_ | _…_ |
| Client | _e.g. booking step indicator, tracking ETA_ | _0–4_ | _…_ |
| Driver | _e.g. active stop highlight, GPS on/off, queue position_ | _0–4_ | _…_ |

### H2 — Match between system and the real world

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | _domain terms: shipment, delayed, in transit_ | | |
| Client | _collect / deliver / service tiers_ | | |
| Driver | _pick up, deliver, navigation links_ | | |

### H3 — User control and freedom

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | _filters, logout, simulation stop_ | | |
| Client | _back from booking, cancel flow_ | | |
| Driver | _change active job, edit route, logout_ | | |

### H4 — Consistency and standards

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | _theme toggle, landing → auth → app pattern, button styles_ | | |

### H5 — Error prevention

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | _validation on login/booking forms_ | | |

### H6 — Recognition rather than recall

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | _map + table vs raw IDs_ | | |
| Client | _tracking timeline_ | | |
| Driver | _numbered map pins_ | | |

### H7 — Flexibility and efficiency of use

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | _filters, dispatch shortcuts_ | | |
| Driver | _Maps/Waze deep links, optimise route_ | | |

### H8 — Aesthetic and minimalist design

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| Dashboard | _KPI panel density (Few-style)_ | | |

### H9 — Help users recognise, diagnose, and recover from errors

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | _login errors, API failure messages_ | | |

### H10 — Help and documentation

| App | Observation | Sev. | Recommendation |
|-----|-------------|------|----------------|
| All | _README, server-control, OpenAPI `/docs`_ | | |

---

## Cross-app themes (copy to dissertation)

1. _[Theme 1 — e.g. strong map-centric visibility]_  
2. _[Theme 2 — e.g. prototype auth limitations]_  
3. _[Theme 3 — e.g. mobile driver vs desktop office]_

---

## Optional: SUS (if ethics approval includes it)

If you run the System Usability Scale, record scores here or in a separate appendix. Formula: standard SUS scoring → 0–100. Interpretation: cite your institution’s guidance; ~68+ often cited as “above average” in industry literature.

| Role tested | Mean SUS | N |
|-------------|----------|---|
| Dispatcher (dashboard) | ___ | ___ |

---

## Evidence checklist

- [ ] Screenshots saved under `Viva/screenshots/` (landing, main console per app)
- [ ] Notes aligned with `Documentation/Evaluation_Heuristics_SUS_Ethics.md`
- [ ] Summary paragraph drafted for **Chapter 6 — Evaluation**
