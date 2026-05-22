# Heuristic review — Door2Door CMP600

Evaluator: Pier Samer Mobayed  
Date: 21 May 2026  
Method: Nielsen (1994) heuristics, one pass per app (~35 minutes each)  
Apps: Dashboard on 5173, Client on 5174, Driver on 5175  

Severity: 0 none · 1 cosmetic · 2 minor · 3 major · 4 blocks task

## Headline counts

| App | Critical (4) | Major (3) | Minor (1–2) | Cosmetic (1) |
|-----|--------------|-----------|-------------|--------------|
| Dashboard | 0 | 0 | 2 | 1 |
| Client | 0 | 0 | 2 | 1 |
| Driver | 0 | 0 | 2 | 1 |

## What I will paste into Chapter 6

I could sign in on all three builds, track shipment S2013 on the client, read the driver stop order, and refresh the office map without hitting a show-stopper. KPI tiles, coloured markers, and status wording (in transit, delayed, delivered) read like a small courier operation rather than a generic admin theme. Booking starts from the public client landing without hidden menus. The rough edges are prototype limits: long order lists with no virtualisation, bearer-token login instead of OAuth, and driver layouts that work on a phone browser but are not a native courier app.

## H1 — Visibility of system status

Dashboard (1): KPI row plus a “Data refresh … ms” footer proved polling was alive; delayed alerts listed risky jobs. I would add a one-line legend for marker colours on first visit.

Client (1): Five booking steps were visible; tracking said things like “driver heading to collect” with an ETA. A “last updated” time on the map would help.

Driver (2): Active stop stood out on the map; numbered pins matched the queue; GPS toggle was there but easy to miss when simulation was running. I want a clearer “simulation on” banner.

## H2 — Match between system and the real world

Dashboard (0): Shipment / in transit / delivered / delayed matched how I would brief a dispatcher.

Client (1): Collect, deliver, and tier labels felt like consumer parcel sites; the pay step should say simulated checkout for ethics.

Driver (0): Pick up, deliver, and Maps/Waze links matched courier habits.

## H3 — User control and freedom

Dashboard (1): Filters, simulation start/stop, logout all worked; a single “clear filters” button would save clicks.

Client (2): I could step back through booking and edit where status allowed; cancel shipment needs a confirm dialog.

Driver (1): Local route edit, change active job, list/map toggle, logout; an undo for the last status tap would be nice in a later build.

## H4 — Consistency and standards (all apps, severity 1)

Shared Door2Door branding and landing → login → console flow across apps. Light/dark theme worked everywhere. Client primary buttons are red while office leans purple; fine for MVP, would unify in a design system later.

## H5 — Error prevention (all apps, severity 2)

Login and postcode fields were required; API errors showed inline. UK postcode format should block Continue until valid.

## H6 — Recognition rather than recall

Dashboard (1): Map and dispatch table shared the same filters; drivers showed names not only IDs.

Client (2): List rows showed both addresses; search helped. Older orders should collapse or paginate by default.

Driver (1): Map pin numbers matched list rows; route card showed stop count.

## H7 — Flexibility and efficiency

Dashboard (1): “Today” date shortcut and assign-from-dispatch were quick; keyboard refresh would help power users.

Driver (1): Greedy route optimise, external nav links, and fit-route on the map were useful; production would persist order server-side.

## H8 — Aesthetic and minimalist design

Dashboard (1): KPI-first layout matched dashboard practice (Few, 2013); on a 1366px laptop the event log felt tall.

## H9 — Errors and recovery (all apps, severity 2)

Bad login showed a message; empty API responses did not white-screen. A retry on network failure would reduce support calls in a real deploy.

## H10 — Help and documentation (all apps, severity 1)

README, server-control.bat, and OpenAPI `/docs` were enough for me as developer-evaluator. Footer already notes simulated data; a footer link to the viva demo script would help guests.

## Themes across apps

Maps are the shared language: office sees the fleet, client sees tracking, driver sees ordered stops. Demo accounts and simulated GPS are fine for CMP600 evidence but must not be sold as production security. Driver UI is the most phone-friendly; office is desktop-first.

## SUS

Not run. Ethics approval excluded external participants; `Evaluation_Plan_v1.docx` agreed heuristic inspection only.

## Evidence filed

- Screenshots under `Viva/screenshots/` (dashboard, client-landing, client-tracking, driver, swagger)
- Method pointers in `Documentation/Evaluation_Heuristics_SUS_Ethics.docx`
- This file feeds the evaluation chapter narrative
