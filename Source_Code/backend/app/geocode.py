"""UK address geocoding: postcodes.io for postcodes, Nominatim for full addresses."""

from __future__ import annotations

import re

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
POSTCODES_IO_URL = "https://api.postcodes.io/postcodes"
USER_AGENT = "CMP600-Dissertation-Prototype/1.0 (educational; contact local admin)"

# Outward + inward, e.g. LS10 4HJ, SW1A 1AA
_UK_POSTCODE_RE = re.compile(
    r"\b([A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2})\b",
    re.IGNORECASE,
)
_HOUSE_NUMBER_RE = re.compile(r"^(\d+[a-zA-Z]?)$")


def format_uk_postcode(raw: str) -> str | None:
    """Normalise LS104HJ / ls10 4hj → LS10 4HJ."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", raw.strip()).upper()
    m = re.fullmatch(r"([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})", cleaned)
    if not m:
        return None
    return f"{m.group(1)} {m.group(2)}"


def extract_uk_postcode(address: str) -> str | None:
    """Find a UK postcode in free text, or treat whole input as postcode."""
    text = address.strip()
    if not text:
        return None
    whole = format_uk_postcode(text)
    if whole:
        return whole
    match = _UK_POSTCODE_RE.search(text)
    if not match:
        return None
    return format_uk_postcode(match.group(1))


def _line_remainder(address: str, postcode: str) -> str:
    """Text left after removing the postcode (house/building detail)."""
    remainder = re.sub(re.escape(postcode), "", address, flags=re.IGNORECASE)
    return re.sub(r"[\s,.-]+", " ", remainder).strip()


def _parse_line_remainder(remainder: str) -> tuple[str | None, str | None]:
    if not remainder:
        return None, None
    if _HOUSE_NUMBER_RE.match(remainder):
        return remainder, None
    return None, remainder


def _is_postcode_only_query(address: str, postcode: str) -> bool:
    """True when input is essentially just a postcode (optional UK suffix)."""
    remainder = _line_remainder(address, postcode).lower()
    remainder = remainder.replace("united kingdom", "").replace("uk", "").strip()
    return len(remainder) == 0


def _normalise_nominatim_query(address: str, postcode: str | None) -> str:
    q = " ".join(address.strip().split())
    lower = q.lower()
    if postcode and _is_postcode_only_query(address, postcode):
        return f"{postcode}, United Kingdom"
    if "united kingdom" in lower or " uk" in lower or lower.endswith("uk"):
        return q
    return f"{q}, United Kingdom"


def _display_from_postcodes_io(result: dict) -> str:
    parts: list[str] = [str(result.get("postcode", "")).strip()]
    for key in ("parish", "admin_ward", "admin_district", "region"):
        val = result.get(key)
        if val and str(val) not in parts:
            parts.append(str(val))
    parts.append("United Kingdom")
    return ", ".join(p for p in parts if p)


async def _geocode_postcodes_io(
    postcode: str,
    client: httpx.AsyncClient,
) -> dict[str, str | float] | None:
    compact = postcode.replace(" ", "").upper()
    response = await client.get(f"{POSTCODES_IO_URL}/{compact}")
    if response.status_code == 404:
        return None
    response.raise_for_status()
    body = response.json()
    if body.get("status") != 200 or not body.get("result"):
        return None
    hit = body["result"]
    lat = hit.get("latitude")
    lng = hit.get("longitude")
    if lat is None or lng is None:
        return None
    return {
        "lat": float(lat),
        "lng": float(lng),
        "displayName": _display_from_postcodes_io(hit)[:512],
        "source": "postcodes.io",
    }


def _hit_to_result(hit: dict, query: str) -> dict[str, str | float]:
    return {
        "lat": float(hit["lat"]),
        "lng": float(hit["lon"]),
        "displayName": str(hit.get("display_name", query))[:512],
        "source": "nominatim",
    }


async def _geocode_nominatim(
    query: str,
    client: httpx.AsyncClient,
    *,
    postalcode: str | None = None,
    housenumber: str | None = None,
    street: str | None = None,
) -> dict[str, str | float] | None:
    params: dict[str, str | int] = {
        "format": "json",
        "limit": 8 if housenumber else 1,
        "countrycodes": "gb",
        "addressdetails": 1,
    }
    if query:
        params["q"] = query
    if postalcode:
        params["postalcode"] = postalcode.replace(" ", "")
    if housenumber:
        params["housenumber"] = housenumber
    if street:
        params["street"] = street
    if "q" not in params and "postalcode" not in params:
        return None

    response = await client.get(
        NOMINATIM_URL,
        params=params,
        headers={"User-Agent": USER_AGENT},
    )
    response.raise_for_status()
    rows = response.json()
    if not rows:
        return None

    if housenumber:
        for hit in rows:
            addr = hit.get("address") or {}
            if str(addr.get("house_number", "")).lower() == housenumber.lower():
                return _hit_to_result(hit, query or postalcode or street or "")

    return _hit_to_result(rows[0], query or postalcode or street or "")


def _label_with_line(
    hit: dict[str, str | float],
    line: str,
    postcode: str,
    *,
    approximate: bool,
) -> dict[str, str | float]:
    """Keep coords but show the user's house/building in the label when OSM lacks detail."""
    pc = format_uk_postcode(postcode) or postcode.strip()
    out = dict(hit)
    out["displayName"] = f"{line.strip()}, {pc}, United Kingdom"[:512]
    if approximate:
        out["approximate"] = True
    return out


def _needs_approximate_label(hit: dict[str, str | float], line: str) -> bool:
    dn = str(hit.get("displayName", "")).lower()
    token = line.strip().lower()
    return bool(token) and token not in dn


async def geocode_address(address: str) -> dict[str, str | float] | None:
    """Return { lat, lng, displayName, source? } or None if no match."""
    raw = address.strip()
    if len(raw) < 3:
        return None

    postcode = extract_uk_postcode(raw)

    async with httpx.AsyncClient(timeout=12.0) as client:
        # Postcodes.io = postcode centroid only when there is no house/building detail.
        if postcode and _is_postcode_only_query(raw, postcode):
            hit = await _geocode_postcodes_io(postcode, client)
            if hit:
                return hit

        if postcode and not _is_postcode_only_query(raw, postcode):
            remainder = _line_remainder(raw, postcode)
            from app.getaddress_client import geocode_line, is_configured
            from app.osm_addresses import resolve_line as osm_resolve_line

            osm_hit = await osm_resolve_line(postcode, remainder)
            if osm_hit and not osm_hit.get("approximate"):
                return {
                    "lat": float(osm_hit["lat"]),
                    "lng": float(osm_hit["lng"]),
                    "displayName": str(osm_hit["displayName"]),
                    "source": str(osm_hit.get("source", "openstreetmap")),
                }

            if is_configured():
                ga_hit = await geocode_line(postcode, remainder)
                if ga_hit:
                    return ga_hit

            if osm_hit:
                out: dict[str, str | float] = {
                    "lat": float(osm_hit["lat"]),
                    "lng": float(osm_hit["lng"]),
                    "displayName": str(osm_hit["displayName"]),
                    "source": str(osm_hit.get("source", "openstreetmap")),
                }
                if osm_hit.get("approximate"):
                    out["approximate"] = True
                return out

            house_number, building = _parse_line_remainder(remainder)
            pc_compact = postcode.replace(" ", "")
            if house_number:
                hit = await _geocode_nominatim(
                    "",
                    client,
                    postalcode=pc_compact,
                    housenumber=house_number,
                )
                if hit:
                    return hit
            if building:
                hit = await _geocode_nominatim(
                    f"{building}, {postcode}, United Kingdom",
                    client,
                    postalcode=pc_compact,
                    street=building,
                )
                if hit:
                    return hit

        query = _normalise_nominatim_query(raw, postcode)
        if postcode and postcode not in query:
            query = f"{postcode}, {query}" if "united kingdom" not in query.lower() else query

        remainder = (
            _line_remainder(raw, postcode)
            if postcode and not _is_postcode_only_query(raw, postcode)
            else ""
        )
        hn_final, _ = _parse_line_remainder(remainder) if remainder else (None, None)
        hit = await _geocode_nominatim(
            query,
            client,
            postalcode=postcode.replace(" ", "") if postcode else None,
            housenumber=hn_final,
        )
        if hit and remainder and _needs_approximate_label(hit, remainder):
            return _label_with_line(hit, remainder, postcode, approximate=True)
        return hit
