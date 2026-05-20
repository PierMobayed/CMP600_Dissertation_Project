"""UK address suggestions: OpenStreetMap (free) with optional getAddress.io when keyed."""

from __future__ import annotations

import re

import httpx

from app.geocode import _geocode_postcodes_io, format_uk_postcode
from app.getaddress_client import is_configured, suggest_for_postcode as ga_suggest
from app.osm_addresses import fetch_postcode_addresses, filter_and_rank

_HOUSE_NUMBER_RE = re.compile(r"^(\d+[a-zA-Z]?)$")


def _parse_line_query(q: str) -> tuple[str | None, str | None]:
    text = q.strip()
    if not text:
        return None, None
    if _HOUSE_NUMBER_RE.match(text):
        return text, None
    return None, text


async def suggest_addresses(postcode: str, query: str = "") -> dict:
    pc = format_uk_postcode(postcode)
    if not pc:
        return {
            "postcode": postcode.strip(),
            "provider": "none",
            "preciseLookup": False,
            "suggestions": [],
        }

    q = query.strip()
    area_label: str | None = None

    async with httpx.AsyncClient(timeout=12.0) as client:
        area = await _geocode_postcodes_io(pc, client)
        if area:
            area_label = str(area["displayName"])

    # Optional upgrade when user has configured getAddress.io
    if is_configured():
        ga_items = await ga_suggest(pc, q)
        if ga_items:
            house_number, name_query = _parse_line_query(q)
            ranked = _rank_ga(ga_items, house_number, name_query)
            return {
                "postcode": pc,
                "areaLabel": area_label,
                "provider": "getaddress.io",
                "preciseLookup": True,
                "suggestions": ranked[:25],
            }

    # Free path: OSM address points for this postcode
    osm_items = await fetch_postcode_addresses(pc)
    ranked = filter_and_rank(osm_items, q)

    return {
        "postcode": pc,
        "areaLabel": area_label,
        "provider": "openstreetmap",
        "preciseLookup": len(osm_items) > 0,
        "suggestions": ranked,
    }


def _rank_ga(
    items: list[dict],
    house_number: str | None,
    name_query: str | None,
) -> list[dict]:
    if not house_number and not name_query:
        return items
    import re

    scored: list[tuple[int, dict]] = []
    for item in items:
        score = 0
        label = str(item.get("label", "")).lower()
        line1 = str(item.get("line1", "")).lower()
        if house_number:
            hn = house_number.lower()
            if line1.startswith(f"{hn} ") or line1 == hn:
                score += 120
            elif re.search(rf"\b{re.escape(hn)}\b", label):
                score += 80
        if name_query and name_query.lower() in label:
            score += 90
        scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    best = [item for score, item in scored if score > 0]
    return best if best else items
