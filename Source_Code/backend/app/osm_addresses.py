"""UK address points from OpenStreetMap (Overpass + Nominatim) — no API key required."""

from __future__ import annotations

import re
import time
from urllib.parse import quote

import httpx

from app.geocode import (
    NOMINATIM_URL,
    USER_AGENT,
    _geocode_postcodes_io,
    format_uk_postcode,
)

_OVERPASS_URL = "https://overpass-api.de/api/interpreter"
_HEADERS = {"User-Agent": USER_AGENT}

# Simple in-memory cache: postcode -> (timestamp, items)
_CACHE: dict[str, tuple[float, list[dict]]] = {}
_CACHE_TTL_SEC = 600

_HOUSE_NUMBER_RE = re.compile(r"^(\d+[a-zA-Z]?)$")


def _parse_line_query(q: str) -> tuple[str | None, str | None]:
    text = q.strip()
    if not text:
        return None, None
    if _HOUSE_NUMBER_RE.match(text):
        return text, None
    return None, text


def _label_from_tags(tags: dict, postcode: str) -> tuple[str, str]:
    hn = str(tags.get("addr:housenumber", "") or "").strip()
    street = str(tags.get("addr:street", "") or tags.get("addr:place", "") or "").strip()
    building = str(tags.get("addr:building", "") or tags.get("name", "") or "").strip()

    if hn and street:
        line1 = f"{hn} {street}"
    elif street:
        line1 = street
    elif building:
        line1 = building
    elif hn:
        line1 = hn
    else:
        line1 = postcode

    parts = [p for p in (line1, postcode) if p]
    town = str(tags.get("addr:city", "") or tags.get("addr:suburb", "") or "").strip()
    if town and town not in line1:
        parts.append(town)
    return line1, ", ".join(parts)[:160]


def _element_to_item(element: dict, postcode: str, idx: int) -> dict | None:
    tags = element.get("tags") or {}
    if not tags.get("addr:housenumber") and not tags.get("addr:street") and not tags.get("name"):
        return None

    lat = element.get("lat")
    lon = element.get("lon")
    if lat is None or lon is None:
        center = element.get("center") or {}
        lat = center.get("lat")
        lon = center.get("lon")
    if lat is None or lon is None:
        return None

    line1, label = _label_from_tags(tags, postcode)
    hn = str(tags.get("addr:housenumber", "") or "")
    eid = element.get("id", idx)
    return {
        "id": f"osm-{element.get('type', 'node')}-{eid}",
        "label": label,
        "line1": line1,
        "lat": float(lat),
        "lng": float(lon),
        "houseNumber": hn.lower() if hn else "",
    }


async def _overpass_addresses(
    client: httpx.AsyncClient,
    postcode: str,
    lat: float,
    lng: float,
) -> list[dict]:
    pc_pattern = postcode.replace(" ", " ?")
    query = f"""
[out:json][timeout:25];
(
  node["addr:postcode"~"{pc_pattern}"](around:1200,{lat},{lng});
  way["addr:postcode"~"{pc_pattern}"](around:1200,{lat},{lng});
);
out center 80;
"""
    response = await client.get(
        _OVERPASS_URL,
        params={"data": query},
        headers=_HEADERS,
        timeout=28.0,
    )
    response.raise_for_status()
    data = response.json()
    items: list[dict] = []
    seen: set[str] = set()
    for idx, element in enumerate(data.get("elements") or []):
        item = _element_to_item(element, postcode, idx)
        if not item:
            continue
        key = item["label"].lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(item)
    return items


async def _nominatim_address_points(
    client: httpx.AsyncClient,
    postcode: str,
) -> list[dict]:
    response = await client.get(
        NOMINATIM_URL,
        params={
            "postalcode": postcode.replace(" ", ""),
            "countrycodes": "gb",
            "format": "json",
            "addressdetails": 1,
            "limit": 40,
            "layer": "address",
        },
        headers=_HEADERS,
    )
    response.raise_for_status()
    rows = response.json()
    items: list[dict] = []
    seen: set[str] = set()
    for idx, hit in enumerate(rows):
        addr = hit.get("address") or {}
        tags = {
            "addr:housenumber": addr.get("house_number", ""),
            "addr:street": addr.get("road", ""),
            "addr:city": addr.get("city") or addr.get("town") or addr.get("village", ""),
        }
        element = {
            "type": "node",
            "id": hit.get("place_id", idx),
            "lat": hit.get("lat"),
            "lon": hit.get("lon"),
            "tags": tags,
        }
        item = _element_to_item(element, postcode, idx)
        if not item:
            continue
        key = item["label"].lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(item)
    return items


async def fetch_postcode_addresses(postcode: str) -> list[dict]:
    """All known OSM address points for a UK postcode (cached)."""
    pc = format_uk_postcode(postcode)
    if not pc:
        return []

    now = time.time()
    cached = _CACHE.get(pc)
    if cached and now - cached[0] < _CACHE_TTL_SEC:
        return list(cached[1])

    async with httpx.AsyncClient(timeout=30.0) as client:
        area = await _geocode_postcodes_io(pc, client)
        if not area:
            return []

        lat = float(area["lat"])
        lng = float(area["lng"])
        items: list[dict] = []
        seen: set[str] = set()

        for source in (
            lambda: _nominatim_address_points(client, pc),
            lambda: _overpass_addresses(client, pc, lat, lng),
        ):
            try:
                batch = await source()
            except httpx.HTTPError:
                batch = []
            for item in batch:
                key = item["label"].lower()
                if key in seen:
                    continue
                seen.add(key)
                items.append(item)

    _CACHE[pc] = (now, items)
    return items


def _score_item(item: dict, house_number: str | None, name_query: str | None) -> int:
    score = 0
    label = item["label"].lower()
    line1 = item["line1"].lower()
    hn = str(item.get("houseNumber", "")).lower()
    if house_number:
        if hn == house_number.lower():
            score += 120
        elif line1.startswith(f"{house_number.lower()} "):
            score += 100
        elif house_number.lower() in label:
            score += 50
    if name_query:
        nq = name_query.lower()
        if nq in label or nq in line1:
            score += 90
    return score


def filter_and_rank(items: list[dict], query: str) -> list[dict]:
    house_number, name_query = _parse_line_query(query)
    if not query.strip():
        return items[:25]
    scored = [( _score_item(it, house_number, name_query), it) for it in items]
    scored.sort(key=lambda x: x[0], reverse=True)
    best = [it for s, it in scored if s > 0]
    return (best if best else [it for _, it in scored])[:25]


async def resolve_line(postcode: str, line: str) -> dict[str, str | float] | None:
    """Best match for house/building line within postcode."""
    from app.geocode import _geocode_nominatim

    pc = format_uk_postcode(postcode)
    line_text = line.strip()
    if not pc or not line_text:
        return None

    items = await fetch_postcode_addresses(pc)
    ranked = filter_and_rank(items, line_text)
    if ranked and items:
        hit = ranked[0]
        house_number, name_query = _parse_line_query(line_text)
        score = _score_item(hit, house_number, name_query)
        return {
            "lat": hit["lat"],
            "lng": hit["lng"],
            "displayName": hit["label"],
            "source": "openstreetmap",
            "approximate": score <= 0,
        }

    house_number, building = _parse_line_query(line_text)
    label = f"{line_text}, {pc}, United Kingdom"
    pc_compact = pc.replace(" ", "")

    async with httpx.AsyncClient(timeout=12.0) as client:
        if house_number:
            hit = await _geocode_nominatim(
                "",
                client,
                postalcode=pc_compact,
                housenumber=house_number,
            )
            if hit:
                return {
                    "lat": float(hit["lat"]),
                    "lng": float(hit["lng"]),
                    "displayName": label[:512],
                    "source": "nominatim",
                    "approximate": False,
                }

        if building:
            hit = await _geocode_nominatim(
                f"{building}, {pc}, United Kingdom",
                client,
                postalcode=pc_compact,
                street=building,
            )
            if hit:
                return {
                    "lat": float(hit["lat"]),
                    "lng": float(hit["lng"]),
                    "displayName": label[:512],
                    "source": "nominatim",
                    "approximate": False,
                }

        try:
            hit = await _geocode_nominatim(label, client, postalcode=pc_compact)
        except httpx.HTTPError:
            hit = None

        if hit:
            dn = str(hit.get("displayName", "")).lower()
            approx = line_text.lower() not in dn
            return {
                "lat": float(hit["lat"]),
                "lng": float(hit["lng"]),
                "displayName": label[:512] if approx else str(hit["displayName"])[:512],
                "source": "nominatim",
                "approximate": approx,
            }

        try:
            area = await _geocode_postcodes_io(pc, client)
        except httpx.HTTPError:
            area = None

        if area:
            return {
                "lat": float(area["lat"]),
                "lng": float(area["lng"]),
                "displayName": label[:512],
                "source": "postcodes.io",
                "approximate": True,
            }

    return None
