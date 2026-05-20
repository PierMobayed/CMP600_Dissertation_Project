#!/usr/bin/env python3
"""
Measure API latency for dissertation evaluation (NFR discussion).
Usage (from repo or any folder with httpx installed):

  pip install httpx
  set API_BASE=http://127.0.0.1:8000/api/v1
  set API_BEARER_TOKEN=cmp600-demo-token
  python latency_check.py

Outputs mean and percentiles in milliseconds (client-observed, includes network stack).
"""

from __future__ import annotations

import os
import statistics
import time

import httpx

API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api/v1").rstrip("/")
TOKEN = os.environ.get("API_BEARER_TOKEN", "cmp600-demo-token")
N = int(os.environ.get("N", "100"))
PATH = os.environ.get("PATH_TO_TEST", "/dashboard/overview")


def percentile(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    k = min(len(sorted_vals) - 1, max(0, int(round((p / 100) * (len(sorted_vals) - 1)))))
    return sorted_vals[k]


def main() -> None:
    headers = {"Authorization": f"Bearer {TOKEN}"}
    times: list[float] = []
    url = f"{API_BASE}{PATH}"
    with httpx.Client(headers=headers, timeout=30.0) as client:
        for _ in range(N):
            t0 = time.perf_counter()
            r = client.get(url)
            r.raise_for_status()
            times.append((time.perf_counter() - t0) * 1000.0)
    times.sort()
    avg = statistics.mean(times)
    print(f"endpoint={PATH}  n={N}")
    print(f"mean_ms={avg:.2f}  p50_ms={percentile(times, 50):.2f}  p95_ms={percentile(times, 95):.2f}  p99_ms={percentile(times, 99):.2f}")
    print(f"min_ms={times[0]:.2f}  max_ms={times[-1]:.2f}")


if __name__ == "__main__":
    main()
