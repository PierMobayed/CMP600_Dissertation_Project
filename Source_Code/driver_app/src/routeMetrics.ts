import { formatDriverEta } from "./formatEta";

export type LatLng = { lat: number; lng: number };

/** Simulated depot / hub (London) — start and end of each run. */
export const DEFAULT_DEPOT: LatLng = { lat: 51.5074, lng: -0.1278 };

const EARTH_MI = 3958.8;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.sqrt(x));
}

function stopPoint(s: { lat: number; lng: number }): LatLng {
  return { lat: s.lat, lng: s.lng };
}

/** Total driving distance: depot → stops in order (does not return to depot). */
export function routeOrderMiles(
  order: string[],
  stopsById: Map<string, { lat: number; lng: number }>,
  depot: LatLng = DEFAULT_DEPOT,
): number {
  if (!order.length) return 0;
  let total = 0;
  let prev: LatLng = depot;
  for (const id of order) {
    const s = stopsById.get(id);
    if (!s) continue;
    const p = stopPoint(s);
    total += haversineMiles(prev, p);
    prev = p;
  }
  return total;
}

/** Nearest-neighbour tour on a flat stop list (legacy / comparison). Prefer `buildDoorToDoorPlan`. */
export function optimiseStopOrder(
  stops: { shipmentId: string; lat: number; lng: number }[],
  depot: LatLng = DEFAULT_DEPOT,
): string[] {
  return optimiseStopOrderWithStats(stops, depot).order;
}

export type OptimiseResult = {
  order: string[];
  totalMiles: number;
  previousMiles: number;
  milesSaved: number;
};

export function optimiseStopOrderWithStats(
  stops: { shipmentId: string; lat: number; lng: number }[],
  depot: LatLng = DEFAULT_DEPOT,
  previousOrder?: string[],
): OptimiseResult {
  if (stops.length <= 1) {
    const order = stops.map((s) => s.shipmentId);
    const stopsById = new Map(stops.map((s) => [s.shipmentId, s]));
    const totalMiles = routeOrderMiles(order, stopsById, depot);
    const previousMiles = previousOrder?.length
      ? routeOrderMiles(previousOrder, stopsById, depot)
      : totalMiles;
    return { order, totalMiles, previousMiles, milesSaved: Math.max(0, previousMiles - totalMiles) };
  }

  const stopsById = new Map(stops.map((s) => [s.shipmentId, s]));
  const previousMiles = previousOrder?.length
    ? routeOrderMiles(previousOrder, stopsById, depot)
    : routeOrderMiles(
        stops.map((s) => s.shipmentId),
        stopsById,
        depot,
      );

  const remaining = [...stops];
  const order: string[] = [];
  let current: LatLng = depot;

  while (remaining.length > 0) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(current, stopPoint(remaining[i]));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const next = remaining.splice(best, 1)[0];
    order.push(next.shipmentId);
    current = stopPoint(next);
  }

  const improved = twoOptImprove(order, stopsById, depot);
  const totalMiles = routeOrderMiles(improved, stopsById, depot);

  return {
    order: improved,
    totalMiles,
    previousMiles,
    milesSaved: Math.max(0, previousMiles - totalMiles),
  };
}

function twoOptImprove(
  order: string[],
  stopsById: Map<string, { lat: number; lng: number }>,
  depot: LatLng,
): string[] {
  if (order.length < 3) return order;
  let best = [...order];
  let bestDist = routeOrderMiles(best, stopsById, depot);
  let improved = true;
  let guard = 0;

  while (improved && guard < 80) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const d = routeOrderMiles(candidate, stopsById, depot);
        if (d + 0.001 < bestDist) {
          best = candidate;
          bestDist = d;
          improved = true;
        }
      }
    }
  }
  return best;
}

export type LegMetrics = {
  distMi: number;
  etaSimulated: Date | null;
  etaLabel: string;
};

export function buildLegMetrics(
  stops: { lat: number; lng: number; status: string; eta: string | null }[],
  opts?: { startAt?: Date; mph?: number; minutesPerStop?: number; depot?: LatLng },
): LegMetrics[] {
  const mph = opts?.mph ?? 28;
  const serviceMin = opts?.minutesPerStop ?? 5;
  const depot = opts?.depot ?? DEFAULT_DEPOT;
  let cursor = opts?.startAt ?? new Date();
  const out: LegMetrics[] = [];
  let prev: LatLng | null = null;
  let legFromDepot = true;

  for (const s of stops) {
    const point: LatLng = { lat: s.lat, lng: s.lng };
    if (s.status === "Delivered") {
      out.push({ distMi: 0, etaSimulated: null, etaLabel: "Delivered" });
      prev = point;
      legFromDepot = false;
      continue;
    }
    let distMi = 0;
    if (legFromDepot || !prev) {
      distMi = haversineMiles(depot, point);
      legFromDepot = false;
    } else {
      distMi = haversineMiles(prev, point);
    }
    const travelH = distMi / mph;
    cursor = new Date(cursor.getTime() + (travelH + serviceMin / 60) * 3600 * 1000);
    const etaLabel = formatDriverEta(s.eta, cursor);
    out.push({ distMi, etaSimulated: new Date(cursor), etaLabel });
    prev = point;
  }
  return out;
}

export function totalRouteMiles(legs: LegMetrics[]): number {
  return legs.reduce((a, l) => a + l.distMi, 0);
}

export function projectedFinish(legs: LegMetrics[]): string {
  const pending = legs.filter((l) => l.etaSimulated);
  if (!pending.length) return "—";
  const last = pending[pending.length - 1]!.etaSimulated!;
  return last.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
