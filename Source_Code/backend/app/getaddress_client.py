"""UK address lookup via getAddress.io (optional GETADDRESS_API_KEY)."""

from __future__ import annotations

import asyncio
import os
from urllib.parse import quote

import httpx

from app.geocode import format_uk_postcode

BASE = "https://api.getAddress.io"
def _api_key() -> str:
    return os.environ.get("GETADDRESS_API_KEY", "").strip()


def is_configured() -> bool:
    return bool(_api_key())


async def _autocomplete(
    client: httpx.AsyncClient,
    term: str,
    *,
    postcode: str | None = None,
    all_results: bool = False,
) -> list[dict]:
    path_term = quote(term.strip(), safe="")
    params: dict[str, str] = {"api-key": _api_key()}
    if all_results:
        params["all"] = "true"
        params["top"] = "20"

    url = f"{BASE}/autocomplete/{path_term}"
    if postcode:
        response = await client.post(
            url,
            params=params,
            json={"filter": {"postcode": postcode}},
        )
    else:
        response = await client.get(url, params=params)

    response.raise_for_status()
    body = response.json()
    return list(body.get("suggestions") or [])


async def _get_by_id(client: httpx.AsyncClient, address_id: str) -> dict | None:
    response = await client.get(
        f"{BASE}/get/{quote(address_id, safe='')}",
        params={"api-key": _api_key()},
    )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


def _line1_from_detail(detail: dict) -> str:
    line1 = str(detail.get("line_1") or "").strip()
    if line1:
        return line1
    parts = detail.get("formatted_address") or []
    if parts and parts[0]:
        return str(parts[0]).strip()
    building = str(detail.get("building_name") or "").strip()
    thoroughfare = str(detail.get("thoroughfare") or "").strip()
    number = str(detail.get("building_number") or "").strip()
    if number and thoroughfare:
        return f"{number} {thoroughfare}"
    if building:
        return building
    return thoroughfare or number or ""


def _label_from_detail(detail: dict) -> str:
    line1 = _line1_from_detail(detail)
    town = str(detail.get("town_or_city") or "").strip()
    pc = str(detail.get("postcode") or "").strip()
    parts = [p for p in (line1, town, pc) if p]
    return ", ".join(parts)[:160]


async def _resolve_suggestion(client: httpx.AsyncClient, item: dict) -> dict | None:
    address_id = str(item.get("id") or "")
    if not address_id:
        return None
    detail = await _get_by_id(client, address_id)
    if not detail:
        return None
    lat = detail.get("latitude")
    lng = detail.get("longitude")
    if lat is None or lng is None:
        return None
    line1 = _line1_from_detail(detail)
    label = str(item.get("address") or _label_from_detail(detail))
    return {
        "id": address_id,
        "label": label[:160],
        "line1": line1 or label.split(",")[0].strip(),
        "lat": float(lat),
        "lng": float(lng),
    }


async def suggest_for_postcode(postcode: str, query: str = "") -> list[dict] | None:
    """Return resolved suggestions with lat/lng, or None if getAddress is not configured."""
    if not is_configured():
        return None

    pc = format_uk_postcode(postcode)
    if not pc:
        return None

    q = query.strip()
    term = q if q else pc
    all_results = not q

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            raw = await _autocomplete(
                client,
                term,
                postcode=pc if q else None,
                all_results=all_results,
            )
        except httpx.HTTPError:
            return None

        if q and not raw:
            raw = await _autocomplete(client, f"{q} {pc}", postcode=pc, all_results=False)

        if not raw:
            return None

        sem = asyncio.Semaphore(5)

        async def one(item: dict) -> dict | None:
            async with sem:
                return await _resolve_suggestion(client, item)

        resolved = await asyncio.gather(*(one(item) for item in raw[:20]))
        return [r for r in resolved if r]


async def geocode_line(postcode: str, line: str) -> dict[str, str | float] | None:
    """Resolve a single house/building line within a postcode."""
    if not is_configured():
        return None
    pc = format_uk_postcode(postcode)
    if not pc or not line.strip():
        return None

    items = await suggest_for_postcode(pc, line.strip())
    if not items:
        return None
    best = items[0]
    return {
        "lat": best["lat"],
        "lng": best["lng"],
        "displayName": best["label"],
        "source": "getaddress.io",
    }
