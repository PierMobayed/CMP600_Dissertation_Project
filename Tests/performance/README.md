API smoke tests: run `python -m pytest tests -q` from `Source_Code/backend` after `pip install -r requirements.txt`.

**Latency / P95 (dissertation, NFR):** with the API running locally or in the cloud:

```powershell
pip install httpx
set API_BASE=http://127.0.0.1:8000/api/v1
python Tests\performance\latency_check.py
```

Set `PATH_TO_TEST` (default `/dashboard/overview`), `N` (default 100), and `API_BEARER_TOKEN` if needed.

See `Documentation/Evaluation_Heuristics_SUS_Ethics.md` for how to write up heuristics, optional SUS, and ethics in Chapter 6.
