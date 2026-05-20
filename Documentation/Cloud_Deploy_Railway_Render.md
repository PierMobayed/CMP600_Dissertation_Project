# Deploy backend (Railway / Render) + frontends with `VITE_API_URL`

This project is a **monorepo-style** folder layout: one Python API under `Source_Code/backend/` and three Vite apps under `Source_Code/dashboard/`, `Source_Code/client_app/`, and `Source_Code/driver_app/`.

You said you will **create a new GitHub repository** and connect it to **Railway** — the flow below matches that.

---

## 1. What gets deployed where (recommended first iteration)

| Piece | Where | Why |
|--------|--------|-----|
| **Backend** (FastAPI) | **Railway** (or Render) Docker / Nixpacks | Single long-running HTTP service, easiest to hook to GitHub. |
| **Three frontends** | **Vercel / Netlify / Cloudflare Pages** *or* second Railway service per app | Vite apps are static after `npm run build`; they only need the cloud API URL at **build time**. |

Railway can also host static sites, but splitting “API on Railway + static on Vercel” is common and cheap.

---

## 2. Backend on Railway (GitHub repo connected)

1. Create an empty **GitHub** repo and push this project (or only `Source_Code/` — your choice).
2. In **Railway**: **New project** → **Deploy from GitHub** → pick the repo.
3. **Service settings**:
   - **Root directory** (if Railway asks): `Source_Code/backend` (or wherever `Dockerfile` lives if you keep it there).
   - **Build**: Dockerfile **or** “Nixpacks” auto-detect Python if you do not use Docker.

### Option A — Dockerfile (already added: `Source_Code/backend/Dockerfile`)

- Railway will build the image and run `CMD` with `$PORT` injected.
- **Start command** is already in the Dockerfile (`uvicorn` on `${PORT:-8000}`).

### Option B — Build command without Docker

Example (adjust if your root path differs):

```text
pip install -r Source_Code/backend/requirements.txt
```

Start command:

```text
cd Source_Code/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

(On Render, use their “Build” / “Start” fields similarly.)

### Environment variables (backend)

| Variable | Purpose |
|----------|---------|
| `PORT` | Set automatically by Railway/Render — do **not** override unless you know you need to. |
| `API_BEARER_TOKEN` | Optional; defaults to prototype token if unset in code paths (keep for dissertation demo consistency). |
| `DATABASE_URL` | Optional later upgrade to PostgreSQL; **SQLite file on ephemeral disk** resets on redeploy — fine for a prototype Viva, but document this in the dissertation as a limitation. |

After deploy, copy the **public HTTPS URL** of the service, e.g. `https://your-backend-production.up.railway.app`.

**Full API base for the apps** must include `/api/v1`:

```text
https://your-backend-production.up.railway.app/api/v1
```

---

## 3. One shared `VITE_API_URL` for all three frontends

Vite only exposes env vars that start with `VITE_`. At **build time**, each app bakes in `import.meta.env.VITE_API_URL`.

1. Copy `Source_Code/.env.example` to e.g. `Source_Code/.env.production.local` (do **not** commit real URLs if the repo is public, or use CI secrets).

2. Set **one** line (example):

```env
VITE_API_URL=https://your-backend-production.up.railway.app/api/v1
```

3. Build **each** app from `Source_Code/dashboard`, `client_app`, `driver_app`:

```bash
npm install
npm run build
```

Same variable name in all three — you can symlink one `.env` file or duplicate the line.

4. Deploy the `dist/` folder of each app to your static host, or configure Railway static services with build command `npm ci && npm run build` and output `dist/`.

**CORS:** the FastAPI app already allows `allow_origins=["*"]` for the prototype. For a stricter story in the dissertation, you can later restrict origins to your Vercel domains.

---

## 4. Render.com alternative (short)

- **Web Service** → connect GitHub → set root to `Source_Code/backend`.
- Build: `pip install -r requirements.txt`  
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
- Add the same env vars as Railway.

Frontends: identical `VITE_API_URL` build-time steps.

---

## 5. Checklist before Viva

- [ ] Backend **health**: `GET /health` on the cloud URL (root, not under `/api/v1`).
- [ ] **Swagger**: `https://…/docs` loads.
- [ ] From a built client app, login (`client1` / `demo`) loads orders — proves `VITE_API_URL` is correct.
- [ ] Note in dissertation: **simulated data only**, **HTTPS**, **no real PII** (per ethics).

---

## 6. Next step: GitHub → Railway

When you create the new repo:

1. Push the project.
2. Railway “New” → GitHub → select repo → first deploy of **backend** only.
3. Grab the public URL → fill `VITE_API_URL` → rebuild frontends → deploy `dist/`.

This file is the **deployment story** you can paste or summarise in **Methodology / Implementation / Evaluation** and in any **reflection on DevOps** paragraph.
