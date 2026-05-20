# Writer-bot instructions — `Dissertation_Main_Document.docx`

Use this document as the **system prompt / brief** for an AI writer (or for your own editing pass). The codebase is **complete enough for evaluation**; the dissertation text and evidence folders are the main gap.

**Tone:** UK academic English, third person or passive where appropriate, past tense for implementation (“was implemented”), present for claims about the artefact (“the dashboard displays”). No marketing hype. Declare **simulated data** and **prototype limitations** honestly.

**Do not invent:** metrics, participant counts, or cloud URLs — only use placeholders `___` or cite files listed below once the human fills them.

---

## Inputs the writer must read (in order)

1. `Documentation/Dissertation_Population_Guide.md` — chapter map  
2. `Documentation/Implementation_Notes_DEV.md` — Ch. 5 technical facts  
3. `Documentation/Evaluation_Heuristics_SUS_Ethics.md` — Ch. 6 methodology  
4. `Documentation/Requirements_Document_v1` (or latest requirements docx in `Documentation/`)  
5. `Tests/usability/heuristic_review.md` — after human fills observations  
6. `Tests/performance/results.md` — after human runs `latency_check.py`  
7. `Documentation/API_Contract_v1.docx` — endpoint names for appendix  
8. `Documentation/Door_to_Door_Routing_Strategy.md` — driver routing narrative (§8 greedy tour)  
9. `Documentation/GAP_Checklist_Tracking.md` — do not claim items still marked open  

**Figures:** instruct human to insert PNGs from `Viva/screenshots/` once captured (see checklist at end).

---

## Document structure to populate

### Front matter

- **Title:** Integrated logistics dashboard and multi-application prototype for door-to-door parcel operations (CMP600).  
- **Abstract (150–250 words):** problem → artefact (FastAPI + 3 React apps) → simulated evaluation → main finding (prototype meets MVP scope; limitations: SQLite, simulated GPS).  
- **Keywords:** logistics, dashboard, real-time tracking, FastAPI, React, heuristic evaluation.

### Chapter 1 — Introduction

- Problem: small logistics operators need visibility across dispatch, drivers, and clients.  
- Aim: design and implement an integrated MVP aligned with expanded proposal objectives.  
- Objectives: map to FR/NFR from requirements doc (bullet 4–6 items).  
- Scope / out of scope: real payments, hardware GPS, ML routing, production security.  
- Dissertation structure: one paragraph roadmap.

### Chapter 2 — Literature / background

- 4–6 sources: logistic systems, dashboard design (e.g. Few 2013 if cited in requirements), mobile workforce apps, API-led architecture.  
- Gap: integrated **three-role** prototype with shared API and live map narrative.

### Chapter 3 — Requirements and ethics

- Summarise functional requirements (booking, driver queue, office map/KPI, simulations).  
- NFR: latency target, usability evaluation plan, responsiveness.  
- Ethics: simulated data only; demo accounts; no field participants; AI use statement per university policy.  
- Risks from planning stage vs what happened (1 reflective paragraph).

### Chapter 4 — Methodology

- Approach: design science / artefact-centred development (justify for computing dissertation).  
- Methods: iterative implementation against API contract; heuristic evaluation; optional SUS; latency sampling script.  
- Tools: Python 3.11, FastAPI, SQLite, React, Vite, Leaflet — **no long code listings**.  
- Testing: `pytest` in backend (mention existence, not full paste).

### Chapter 5 — Implementation (core — expand, do not copy README verbatim)

#### 5.1 Backend

- FastAPI structure, `/api/v1`, SQLite persistence, bearer token prototype auth.  
- Simulations: GPS tick and status progression — **why** needed for demo without real devices.  
- `X-Response-Time-Ms` header for evaluation.  
- CORS for three dev origins.  
- One table: 5–8 key endpoints (method, path, role).

#### 5.2 Client application (`5174`)

- Public **landing** (5-step journey: Collect → Deliver → Service → Account → Pay).  
- Public booking flow vs authenticated area; tracking and ETA.  
- Figure: landing + tracking screenshot.  
- Demo: `client1` / `demo`.

#### 5.3 Driver application (`5175`)

- Public **landing** (5-step courier workflow).  
- Job queue, door-to-door legs, map pins, external navigation (Google Maps / Waze).  
- Route optimisation: greedy tour — reference `Door_to_Door_Routing_Strategy.md`, not full algorithm code.  
- GPS simulation to office map.  
- Figure: map + queue screenshot.  
- Demo: `driver1` / `demo`.

#### 5.4 Dashboard (`5173`)

- Public **landing** (Sign in → Overview → Live map → Dispatch → Simulate).  
- KPI panel, Leaflet map, dispatch list, filters, office actions (hold/cancel/reschedule where implemented).  
- Simulation controls for Viva.  
- Figure: KPI + map screenshot.  
- Demo: `admin` / `demo`.

#### 5.5 Cross-cutting (optional subsection)

- Shared theme (`cmp600-theme`), Door2Door branding, `server-control` for reproducible demos.

### Chapter 6 — Evaluation and results

- **Performance:** paste summary table from `Tests/performance/results.md`; discuss P95 vs 300 ms target; limitations of localhost.  
- **Usability:** summarise `Tests/usability/heuristic_review.md` — top 3 themes, severity counts; method paragraph (Nielsen, apps reviewed).  
- **Functional acceptance:** map 3–5 FR IDs to evidence (screenshot or endpoint).  
- **Limitations:** SQLite, prototype passwords, English UI, mobile web not native app, simulated coordinates.

### Chapter 7 — Conclusion and reflection (LO5)

- Answer research aim; what MVP demonstrates.  
- Future work: Postgres, WebSockets, OAuth, real maps billing, native driver app.  
- Personal reflection: architecture lessons, testing, time management — **authentic**, 300–500 words.

### References

- Harvard or APA as required by institution — writer bot should leave `[CITE: author year]` placeholders if sources not supplied.

### Appendices

- A: API endpoint matrix (from contract)  
- B: Heuristic review table (condensed from markdown)  
- C: Sample latency run output  
- D: Ethics / AI declaration (if required)

---

## Figures and captions (human + writer)

| Figure | File (to create) | Caption template |
|--------|------------------|------------------|
| 5.1 | `Viva/screenshots/dashboard-kpi-map.png` | Office dashboard KPI panel and live map with simulated drivers. |
| 5.2 | `Viva/screenshots/client-landing-book.png` | Client landing page and booking step indicator. |
| 5.3 | `Viva/screenshots/driver-map-queue.png` | Driver map with numbered stops and job queue. |
| 6.1 | `Viva/screenshots/client-tracking.png` | Client shipment tracking with ETA. |

---

## What the writer bot must NOT do

- Claim deployment URL unless `Documentation/Cloud_Deploy_Railway_Render.md` contains a real link filled by human.  
- Claim user study with N participants unless ethics approval exists.  
- Paste entire source files or API definitions.  
- State “production-ready” — always **research prototype**.

---

## Human tasks before final Word export

1. Run `Tests/performance/latency_check.py` → fill `results.md`.  
2. Complete `Tests/usability/heuristic_review.md` (one review session minimum).  
3. Capture screenshots → `Viva/screenshots/`.  
4. Record `Viva/demo_video.mp4` (3–5 min: start servers → login three roles → one booking → driver GPS → dashboard map).  
5. Cross-check `Documentation/GAP_Checklist_Tracking.md` and close items.  
6. Proofread writer output; add Harvard references; run plagiarism/AI policy check.

---

## One-paragraph prompt (paste into writer bot)

```
You are writing the CMP600 dissertation for an integrated logistics prototype (FastAPI + dashboard/client/driver React apps, simulated London data). Follow Documentation/WRITER_BOT_Dissertation_Instructions.md and Dissertation_Population_Guide.md. Use UK academic English. Chapters 5–6 must describe landing pages at :5173/:5174/:5175, backend simulations, and evaluation from Tests/performance/results.md and Tests/usability/heuristic_review.md (use ___ only where empty). Include ethics: simulated data, demo passwords. Do not invent metrics or participants. Add figure placeholders matching Viva/screenshots/. End with reflection and future work.
```
