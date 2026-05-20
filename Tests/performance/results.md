# API latency results — CMP600 evaluation

**Purpose:** Quantitative evidence for dissertation **Chapter 6** (NFR / performance).  
**Script:** `Tests/performance/latency_check.py`  
**Target (from requirements):** P95 &lt; 300 ms for dashboard overview (adjust if your spec differs).

---

## Run metadata

| Field | Value |
|-------|-------|
| Date | 2026-05-20 |
| Tester | Automated run (Cursor agent) |
| Environment | `localhost` |
| API base URL | `http://127.0.0.1:8000/api/v1` |
| Endpoint tested | `GET /dashboard/overview` |
| Sample size **N** | 100 |
| Auth | Bearer `cmp600-demo-token` |
| Machine | Windows 10, local dev stack |
| Backend mode | `uvicorn` (existing session on port 8000) |
| Other load | Frontends not measured during run; API only |

### Commands used

```powershell
cd Tests\performance
pip install httpx
$env:API_BASE = "http://127.0.0.1:8000/api/v1"
$env:API_BEARER_TOKEN = "cmp600-demo-token"
$env:N = "100"
$env:PATH_TO_TEST = "/dashboard/overview"
python latency_check.py
```

**Raw script output:**

```
endpoint=/dashboard/overview  n=100
mean_ms=4.03  p50_ms=3.61  p95_ms=4.69  p99_ms=5.58
min_ms=3.26  max_ms=33.92
```

---

## Results summary

| Metric | Value (ms) | Meets target? |
|--------|------------|---------------|
| Mean | 4.03 | — |
| Median (P50) | 3.61 | — |
| P95 | 4.69 | **Yes** (&lt; 300 ms) |
| P99 | 5.58 | **Yes** |
| Min | 3.26 | — |
| Max | 33.92 | — |

**Interpretation (for dissertation):**  
On localhost with SQLite and no concurrent browser polling, client-observed latency for `GET /dashboard/overview` is far below the 300 ms NFR (P95 ≈ 4.7 ms). The single max outlier (33.9 ms) likely reflects a cold cache or scheduler jitter on the dev machine, not steady-state behaviour. These figures demonstrate the prototype API is responsive under light local load; they **do not** predict production performance under PostgreSQL, multiple users, or cloud network latency. Report cloud re-tests if the backend is deployed.

---

## Additional endpoints (optional)

Repeat with `PATH_TO_TEST` set as needed.

| Endpoint | N | Mean (ms) | P95 (ms) | Notes |
|----------|---|-----------|----------|-------|
| `GET /dashboard/map` | _pending_ | _|_ | _|_ | |
| `GET /driver/jobs` | _pending_ | _|_ | _|_ | |
| `GET /client/shipments` | _pending_ | _|_ | _|_ | |

---

## UI refresh indicator (exploratory)

From the **dashboard** header/footer (if shown): “Data refresh … ms” during live polling.

| Observation | Value |
|-------------|-------|
| Typical refresh cycle | _measure after login_ |
| Notes | 4 s polling interval; aggregate of parallel requests |

---

## Comparison with `X-Response-Time-Ms` header

Pick **5** manual calls (browser devtools or curl) and record the response header:

| # | Endpoint | Header value (ms) |
|---|----------|-------------------|
| 1 | `/dashboard/overview` | _optional follow-up_ |
| 2 | | |

---

## Limitations (state in Ch. 6)

- Client-observed latency includes loopback network stack; not equal to server-only CPU time.
- SQLite on a single machine ≠ production PostgreSQL under concurrent users.
- `uvicorn --reload` may add overhead if used during manual runs.
- Simulations (GPS/status) may add background load — note if active during test (this run: API only).

---

## Evidence checklist

- [x] At least one run with N ≥ 50 recorded
- [ ] Table copied or summarised in `Dissertation_Main_Document.docx` Ch. 6
- [ ] Method paragraph references this file and `latency_check.py`
