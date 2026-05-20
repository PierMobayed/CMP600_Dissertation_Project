# CMP600 Dissertation Project — Door2Door logistics prototype

Integrated **MVP** for CMP600: a simulated London door-to-door logistics platform with one **FastAPI** backend and three **React (Vite)** frontends (office dashboard, client booking/tracking, driver courier app). All business traffic uses `/api/v1` as documented in `Documentation/API_Contract_v1.docx`.

## Quick start (Windows)

From this folder (project root):

| Tool | Purpose |
|------|---------|
| `server-control.bat` | Console menu — start/stop API and apps on ports 8000, 5173, 5174, 5175 |
| `server-control-gui.bat` | WinForms GUI (English) — same control, hidden processes |
| `create-server-control-shortcut.ps1` | Desktop shortcut to the GUI |

**[1] Start ALL** in `server-control.bat` launches everything. Then open:

| App | URL | Demo login |
|-----|-----|------------|
| Office dashboard | http://127.0.0.1:5173/ | `admin` / `demo` |
| Client app | http://127.0.0.1:5174/ | `client1` / `demo` (or book without account) |
| Driver app | http://127.0.0.1:5175/ | `driver1` / `demo` |
| API | http://127.0.0.1:8000/api/v1 | Bearer `cmp600-demo-token` |

Each frontend has a **public landing page** at `/` and a separate **sign-in** screen before the main console.

Detailed setup, pytest, cloud deploy, and Viva simulation: **`Source_Code/README.md`**.

## Repository layout

```
CMP600_Dissertation_Project/
├── README.md                 ← this file
├── server-control.bat        ← local dev launcher
├── Source_Code/
│   ├── backend/              ← FastAPI + SQLite
│   ├── dashboard/            ← Office ops (5173)
│   ├── client_app/           ← Client booking (5174)
│   ├── driver_app/           ← Driver courier (5175)
│   └── README.md
├── Documentation/            ← Requirements, API, dissertation guides
├── Tests/
│   ├── performance/          ← latency_check.py, results template
│   └── usability/          ← heuristic review template
└── Viva/                     ← presentation, screenshots, demo video (to complete)
```

## Evaluation artefacts (dissertation evidence)

| Artefact | Location |
|----------|----------|
| Heuristic evaluation (Nielsen) | `Tests/usability/heuristic_review.md` |
| API latency runs | `Tests/performance/results.md` + `latency_check.py` |
| Chapter population map | `Documentation/Dissertation_Population_Guide.md` |
| Writer-bot instructions | `Documentation/WRITER_BOT_Dissertation_Instructions.md` |
| Gap tracking | `Documentation/GAP_Checklist_Tracking.md` |

## Ethics and scope

- **Simulated data only** — no real customers, addresses, or PII.
- **Prototype authentication** — demo passwords; not production-grade security.
- **Out of scope for MVP:** real GPS hardware, commercial payment gateways, production Postgres (SQLite used locally).

## Documentation index

- `Documentation/Implementation_Notes_DEV.md` — technical notes for Ch. 5
- `Documentation/Evaluation_Heuristics_SUS_Ethics.md` — evaluation methodology
- `Documentation/Cloud_Deploy_Railway_Render.md` — optional cloud deploy
- `Dissertation_Main_Document.docx` — main submission (populate via writer bot / manual edit)

## Author

CMP600 dissertation — integrated logistics dashboard and multi-app prototype.
