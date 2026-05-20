import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

/** Recentres on a stop only when `token` increments — does not fight manual pan/zoom. */
export function MapRecenter({
  lat,
  lng,
  zoom,
  token,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  token: number;
}) {
  const map = useMap();
  const targetRef = useRef({ lat, lng, zoom });
  targetRef.current = { lat, lng, zoom };

  useEffect(() => {
    if (token <= 0) return;
    const { lat: la, lng: ln, zoom: z } = targetRef.current;
    const level = z ?? Math.max(map.getZoom(), 13);
    map.setView([la, ln], level);
  }, [map, token]);
  return null;
}
