# Door2Door source (CMP600)

This folder holds my submission build: a FastAPI service on SQLite and three Vite React apps (office dashboard, client tracking, driver queue). Every app talks to the same `/api/v1` routes listed in `Documentation/API_Contract_v1.docx`.

You need Python 3.11+ (with pip) and Node 18+ (with npm). On Windows I normally skip manual terminals and use `server-control.bat` in the parent `CMP600_Dissertation_Project` folder instead.

## Fastest start on Windows

Open the dissertation project root (the directory that contains both `Source_Code` and `server-control.bat`). Run the batch menu:

- Option 1 starts the API on port 8000 plus dashboard 5173, client 5174, and driver 5175 in separate windows. First run may run `npm install` in each app.
- Option 2 stops those ports.
- Options 3 to 8 start or stop one service at a time.
- Option 9 opens Swagger and the three browser URLs.

Product documentation lives under `../Documentation/`. Optional cloud notes are in `../Documentation/Cloud_Deploy_Railway_Render.docx`.

## Running the API by hand

```powershell
cd Source_Code\backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Base URL: `http://127.0.0.1:8000/api/v1`  
Health check: `http://127.0.0.1:8000/health`  
SQLite file: `Source_Code/backend/data/logistics.db` (created on first boot)  
Prototype auth header: `cmp600-demo-token` unless you override `API_BEARER_TOKEN`

Demo logins via `POST /api/v1/auth/login`:

| Role | Username | Password |
|------|----------|----------|
| Client | client1 | demo |
| Driver | driver1 | demo |
| Office / admin | admin | demo |

## Front ends (if not using the batch file)

Start each app in its own terminal from the repo:

```powershell
cd Source_Code\dashboard
npm install
npm run dev
```

Client app: `Source_Code\client_app` on port 5174. Driver app: `Source_Code\driver_app` on port 5175.

OneDrive sometimes blocks Vite with `EPERM` on `node_modules\.vite\deps`. If that happens, close Node processes, delete `node_modules\.vite` and `.vite` inside the affected app, then run `npm run dev` again. Pausing OneDrive sync for this project while coding also helps.

Remote API: set `VITE_API_URL` in `.env.local` to your hosted base including `/api/v1`.

## Tests and demo helpers

```powershell
cd Source_Code\backend
pytest tests -q
```

For the viva I trigger GPS and status simulation from the dashboard after login, or POST to `/api/v1/simulation/gps/start?driverId=D101` and `/api/v1/simulation/status/start`.

## Cloud (optional)

Local marking uses the stack above. If I deploy later, the backend runs under uvicorn with `DATABASE_URL` only when the host supplies Postgres; front ends are static `dist/` builds with `VITE_API_URL` pointing at the live API. Details are in the cloud deploy docx, not repeated here.
