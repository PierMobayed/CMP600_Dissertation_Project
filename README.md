# CMP600 — Door2Door logistics prototype

My CMP600 artefact is a simulated London courier platform: one FastAPI API on SQLite and three Vite React apps (office dashboard, client booking and tracking, driver queue). Every screen calls `/api/v1`; the route list is in `Documentation/API_Contract_v1.docx`.

GitHub: https://github.com/PierMobayed/CMP600_Dissertation_Project

## Running it on my Windows laptop

I usually start everything from the project root. Either double-click `CMP600 Control.lnk` or run `Source_Code/dev_tools/server-control.bat` and pick option 1 (Start ALL). That brings up the API on port 8000, dashboard on 5173, client on 5174, and driver on 5175.

| App | URL | Login |
|-----|-----|-------|
| Office | http://127.0.0.1:5173/ | admin / demo |
| Client | http://127.0.0.1:5174/ | client1 / demo |
| Driver | http://127.0.0.1:5175/ | driver1 / demo |
| API docs | http://127.0.0.1:8000/docs | Bearer cmp600-demo-token |

Manual setup, pytest, and OneDrive/Vite fixes are written in `Source_Code/README.md`.

## What sits in this repo

`Source_Code/` holds the backend and the three front ends. `Documentation/` holds the Word specs for Turnitin product submission (requirements, architecture, API contract, evaluation plan, plus supporting docx files). `Tests/performance/` stores the latency script and `results.md`; `Tests/usability/` stores `heuristic_review.md`. `Viva/screenshots/` is where I kept UI captures for the dissertation and demo.


## Documentation folder (assessor copy)

The product ZIP includes docx versions, for example `Requirements Document.docx`, `Architecture Document.docx`, `API_Contract_v1.docx`, and `Evaluation_Plan_v1.docx`. Markdown sources for some notes remain in Git for editing; 

## Evidence I cite in the report

Latency numbers live in `Tests/performance/results.md` (P95 was 4.69 ms on overview). Heuristic notes are in `Tests/usability/heuristic_review.md`. Screenshots are under `Viva/screenshots/`.


## Ethics and limits

All parcel data is seeded fiction for London; I did not run field studies with real couriers or customers. Auth is demo passwords and a bearer token, not production IAM. The build does not include live card payments, hardware GPS units, or hosted Postgres on my laptop (SQLite only).

## Author

Pier Mobayed — CMP600 integrated logistics prototype, May 2026.
