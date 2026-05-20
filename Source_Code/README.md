# CMP600 — Integrated logistics prototype

Working prototype: **FastAPI backend** (SQLite) plus **three React (Vite) apps** — office dashboard, client tracker, and driver app. All traffic goes through `/api/v1` as in `Documentation/API_Contract_v1.docx`.

## Prerequisites

- Python 3.11+ with `pip`
- Node.js 18+ with `npm`

### Windows: start/stop API quickly

From **`CMP600_Dissertation_Project`** (the folder that contains both `Source_Code` and **`server-control.bat`**), run the batch file:

- **[1] Start ALL** — API (`8000`) + Dashboard (`5173`) + Client (`5174`) + Driver (`5175`), each in its own window (`npm install` runs on first launch).
- **[2] Stop ALL** — frees **8000, 5173, 5174, 5175**.
- **[3–8]** — start/stop API or individual frontends only; **[9]** opens docs + the three URLs in the browser.

See also `../Documentation/Cloud_Deploy_Railway_Render.md` and `../Documentation/Dissertation_Population_Guide.md`.

## 1. Backend

```powershell
cd Source_Code\backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API base: `http://127.0.0.1:8000/api/v1`
- Health: `http://127.0.0.1:8000/health`
- Database file: `Source_Code/backend/data/logistics.db` (created on first run)
- Bearer token (prototype): `cmp600-demo-token` (override with env `API_BEARER_TOKEN`)

### Demo accounts (`POST /api/v1/auth/login`)

| Role    | Username | Password |
|---------|----------|----------|
| Client  | client1  | demo     |
| Driver  | driver1  | demo     |
| Dashboard / admin | admin | demo |

## 2. Frontends (separate terminals)

If `npm run dev` fails with **`EPERM` / `rmdir` ... `node_modules\.vite\deps`** (common with **OneDrive** or antivirus): stop all Vite/Node processes, then delete the old cache folders **`node_modules\.vite`** and **`.vite`** inside that app directory, and run `npm run dev` again. Vite is configured to use a project-level **`.vite`** cache folder to reduce this. Optionally pause OneDrive sync for `CMP600_Dissertation_Project` while developing.

```powershell
cd Source_Code\dashboard && npm install && npm run dev
# http://127.0.0.1:5173
```

```powershell
cd Source_Code\client_app && npm install && npm run dev
# http://127.0.0.1:5174
```

```powershell
cd Source_Code\driver_app && npm install && npm run dev
# http://127.0.0.1:5175
```

If the API is not on the same machine, set `VITE_API_URL` (e.g. in `.env.local`) to your cloud base URL including `/api/v1`.

## 3. Tests

```powershell
cd Source_Code\backend
pytest tests -q
```

## 4. Cloud deployment (brief)

- Deploy the backend with `uvicorn app.main:app` and set `DATABASE_URL` if the host provides PostgreSQL.
- Build each frontend with `npm run build` and serve the `dist/` folder on any static host.
- Point all builds at the deployed API via `VITE_API_URL`.

## 5. Simulation (Viva demo)

From the **dashboard** UI (after login): use **Start GPS simulation (D101)** and **Start status simulation**, or call:

- `POST /api/v1/simulation/gps/start?driverId=D101`
- `POST /api/v1/simulation/status/start`
