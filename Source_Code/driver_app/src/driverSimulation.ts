import { DEFAULT_DEPOT, haversineMiles, type LatLng } from "./routeMetrics";

export type GpsSimSpeed = "slow" | "normal" | "fast";

export const GPS_TICK_MS: Record<GpsSimSpeed, number> = {
  slow: 1600,
  normal: 900,
  fast: 450,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Insert intermediate points along each leg so the van moves smoothly on the map. */
export function densifyPath(waypoints: LatLng[], pointsPerLeg = 10): LatLng[] {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) return [...waypoints];
  const out: LatLng[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const steps = Math.max(2, pointsPerLeg);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push({ lat: lerp(a.lat, b.lat, t), lng: lerp(a.lng, b.lng, t) });
    }
  }
  out.push(waypoints[waypoints.length - 1]);
  return out;
}

/** Build simulation path: depot → pending stops in run order. */
export function buildRunSimulationPath(
  stops: { lat: number; lng: number; status: string }[],
  depot: LatLng = DEFAULT_DEPOT,
  finishDepot?: LatLng,
): LatLng[] {
  const pending = stops.filter((s) => s.status !== "Delivered");
  const waypoints: LatLng[] = [depot, ...pending.map((s) => ({ lat: s.lat, lng: s.lng }))];
  if (
    finishDepot &&
    pending.length > 0 &&
    (Math.abs(finishDepot.lat - depot.lat) > 1e-6 || Math.abs(finishDepot.lng - depot.lng) > 1e-6)
  ) {
    waypoints.push(finishDepot);
  }
  if (waypoints.length === 1) return waypoints;
  const legCount = waypoints.length - 1;
  const perLeg = Math.min(14, Math.max(6, Math.floor(48 / legCount)));
  return densifyPath(waypoints, perLeg);
}

/** Optional: blend API route polyline with run path when a leg is active. */
export function mergeActiveLegPath(runPath: LatLng[], legCoords: LatLng[]): LatLng[] {
  if (!legCoords.length) return runPath;
  if (!runPath.length) return densifyPath(legCoords, 8);
  const start = runPath[0];
  const end = legCoords[legCoords.length - 1];
  const near = (a: LatLng, b: LatLng) => haversineMiles(a, b) < 0.15;
  if (near(start, legCoords[0]) && near(end, runPath[runPath.length - 1])) {
    return densifyPath(legCoords, 8);
  }
  return runPath;
}
