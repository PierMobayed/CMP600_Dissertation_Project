import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

/** Fits the map to the route only when `token` increments (manual “full route” action). */
export function MapFitBounds({ points, token }: { points: [number, number][]; token: number }) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    if (token <= 0) return;
    const pts = pointsRef.current;
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [56, 56] });
  }, [map, token]);
  return null;
}

/** Pans to lat/lng only when `token` increments (locate button or stop selection). */
export function MapLocateControl({
  lat,
  lng,
  token,
  zoom = 15,
}: {
  lat: number | undefined;
  lng: number | undefined;
  token: number;
  zoom?: number;
}) {
  const map = useMap();
  const targetRef = useRef({ lat, lng, zoom });
  targetRef.current = { lat, lng, zoom };

  useEffect(() => {
    if (token <= 0) return;
    const { lat: la, lng: ln, zoom: z } = targetRef.current;
    if (la == null || ln == null) return;
    map.setView([la, ln], Math.max(map.getZoom(), z));
  }, [map, token]);
  return null;
}
