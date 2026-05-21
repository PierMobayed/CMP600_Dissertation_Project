# CMP600 Dissertation Project — Door2Door logistics prototype

Integrated **MVP** for CMP600: a simulated London door-to-door logistics platform with one **FastAPI** backend and three **React (Vite)** frontends (office dashboard, client booking/tracking, driver courier app). All business traffic uses `/api/v1` as documented in [`Documentation/API_Contract_v1.docx`](Documentation/API_Contract_v1.docx).

**Repository:** https://github.com/PierMobayed/CMP600_Dissertation_Project

## Quick start (Windows)

| Tool | Purpose |
|------|---------|
| **`CMP600 Control.lnk`** | Unified GUI (project root) |
| `Source_Code/dev_tools/server-control.bat` | Console: **[1] Start ALL** |

| App | URL | Demo login |
|-----|-----|------------|
| Office dashboard | http://127.0.0.1:5173/ | `admin` / `demo` |
| Client app | http://127.0.0.1:5174/ | `client1` / `demo` |
| Driver app | http://127.0.0.1:5175/ | `driver1` / `demo` |
| API / OpenAPI | http://127.0.0.1:8000/api/v1 · `/docs` | Bearer `cmp600-demo-token` |

Setup, pytest, and dev details: [`Source_Code/README.md`](Source_Code/README.md).

## Repository layout (product & evaluation)

```
CMP600_Dissertation_Project/
├── README.md
├── Source_Code/           backend + dashboard + client + driver
├── Documentation/         project specs (see Documentation/README.md)
├── Tests/
│   ├── performance/       latency_check.py, results.md
│   └── usability/         heuristic_review.md
└── Viva/screenshots/      UI figures for dissertation & demo
```

Writing, submission scripts, ZIP output, Cursor plans, and checklists: **`_Dissertation_Prep/`** (local / OneDrive, not in Git).

## Project documentation (`Documentation/`)

| Document | Purpose |
|----------|---------|
| `Requirements Document.docx` | Functional / non-functional requirements |
| `Architecture Document.docx` | System structure |
| `API_Contract_v1.docx` | REST `/api/v1` contract |
| `Evaluation_Plan_v1.docx` | Planned evaluation of the artefact |
| `Implementation_Notes_DEV.md` | Backend and app implementation summary |
| `Door_to_Door_Parcel_Flow_Plan.md` | Shipment status flow |
| `Door_to_Door_Routing_Strategy.md` | Driver route ordering |
| `Evaluation_Heuristics_SUS_Ethics.md` | Usability / ethics method |
| `Cloud_Deploy_Railway_Render.md` | Optional cloud deploy |

## Evaluation artefacts

| Artefact | Location |
|----------|----------|
| API latency | `Tests/performance/results.md` |
| Heuristic evaluation | `Tests/usability/heuristic_review.md` |
| UI screenshots | `Viva/screenshots/` |

## Product ZIP (local)

From `_Dissertation_Prep/Scripts/`:

```powershell
powershell -ExecutionPolicy Bypass -File build_product_zip.ps1
```

Output: `_Dissertation_Prep/Submission/CMP600_Product_Submission.zip`

## Ethics and scope

- **Simulated data only** — no real customers or field participants.
- **Prototype authentication** — demo passwords; not production security.
- **Out of scope:** real GPS hardware, payment gateways, production Postgres (SQLite locally).

## Author

CMP600 — integrated logistics dashboard and multi-application prototype.
