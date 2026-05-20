/**
 * Door-to-door routing: depot → (pending deliveries) → pickup → deliver → nearest next pickup …
 * See Documentation/Door_to_Door_Routing_Strategy.md
 */

import { haversineMiles, type LatLng } from "./routeMetrics";
import type { FleetShipmentInput, QueueItemInput, StopPhase } from "./runStops";

export type PlannedLeg = {
  stopKey: string;
  shipmentId: string;
  phase: StopPhase;
  lat: number;
  lng: number;
};

export type DoorToDoorPlan = {
  legs: PlannedLeg[];
  totalMiles: number;
  strategy: "door-to-door-nearest";
  batchPickupMiles?: number;
};

function rowCoords(row: FleetShipmentInput): { pickup: LatLng; delivery: LatLng } {
  return {
    pickup: { lat: row.pickupLat ?? row.lat, lng: row.pickupLng ?? row.lng },
    delivery: { lat: row.deliveryLat ?? row.lat, lng: row.deliveryLng ?? row.lng },
  };
}

function makeLeg(row: FleetShipmentInput, phase: StopPhase): PlannedLeg {
  const { pickup, delivery } = rowCoords(row);
  const isCollect = phase === "collect";
  return {
    stopKey: `${row.shipmentId}:${phase}`,
    shipmentId: row.shipmentId,
    phase,
    lat: isCollect ? pickup.lat : delivery.lat,
    lng: isCollect ? pickup.lng : delivery.lng,
  };
}

function nearestIndex<T>(items: T[], current: LatLng, pointOf: (item: T) => LatLng): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < items.length; i++) {
    const d = haversineMiles(current, pointOf(items[i]));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function planMiles(legs: PlannedLeg[], start: LatLng): number {
  if (!legs.length) return 0;
  let total = 0;
  let prev = start;
  for (const leg of legs) {
    total += haversineMiles(prev, { lat: leg.lat, lng: leg.lng });
    prev = { lat: leg.lat, lng: leg.lng };
  }
  return total;
}

/** Phase 0: deliveries for parcels already on van; Phase 1: pickup → deliver pairs. */
export function buildDoorToDoorPlan(
  onRun: FleetShipmentInput[],
  start: LatLng,
  _queueItems: QueueItemInput[] = [],
): DoorToDoorPlan {
  const legs: PlannedLeg[] = [];
  let current: LatLng = { ...start };

  const deliverPending = onRun.filter((s) =>
    ["Picked Up", "In Transit", "Delayed"].includes(s.status),
  );

  const deliverPool = [...deliverPending];
  while (deliverPool.length > 0) {
    const idx = nearestIndex(deliverPool, current, (r) => rowCoords(r).delivery);
    const row = deliverPool.splice(idx, 1)[0];
    legs.push(makeLeg(row, "deliver"));
    current = rowCoords(row).delivery;
  }

  const assignedPool = onRun.filter((s) => s.status === "Assigned");
  while (assignedPool.length > 0) {
    const idx = nearestIndex(assignedPool, current, (r) => rowCoords(r).pickup);
    const row = assignedPool.splice(idx, 1)[0];
    legs.push(makeLeg(row, "collect"));
    legs.push(makeLeg(row, "deliver"));
    current = rowCoords(row).delivery;
  }

  const onHold = onRun.filter((s) => s.status === "On Hold");
  for (const row of onHold) {
    legs.push(makeLeg(row, "collect"));
    legs.push(makeLeg(row, "deliver"));
  }

  const totalMiles = planMiles(legs, start);
  const batchPickupMiles = compareBatchPickupTourMiles(onRun, start);

  return {
    legs,
    totalMiles,
    strategy: "door-to-door-nearest",
    batchPickupMiles,
  };
}

/** All pickups from start, then all deliveries — baseline for dissertation comparison. */
export function compareBatchPickupTourMiles(onRun: FleetShipmentInput[], start: LatLng): number {
  const pending = onRun.filter(
    (s) => s.status !== "Delivered" && s.status !== "Cancelled" && s.status !== "On Hold",
  );
  if (!pending.length) return 0;

  const pickups: LatLng[] = [];
  const deliveries: LatLng[] = [];

  for (const row of pending) {
    const { pickup, delivery } = rowCoords(row);
    if (row.status === "Assigned") {
      pickups.push(pickup);
      deliveries.push(delivery);
    } else if (["Picked Up", "In Transit", "Delayed"].includes(row.status)) {
      deliveries.push(delivery);
    }
  }

  let total = 0;
  let prev = start;
  for (const p of pickups) {
    total += haversineMiles(prev, p);
    prev = p;
  }
  for (const d of deliveries) {
    total += haversineMiles(prev, d);
    prev = d;
  }
  return total;
}

export function shipmentOrderFromPlan(legs: PlannedLeg[]): string[] {
  const order: string[] = [];
  for (const leg of legs) {
    if (!order.includes(leg.shipmentId)) order.push(leg.shipmentId);
  }
  return order;
}

export function stopKeysFromPlan(legs: PlannedLeg[]): string[] {
  return legs.map((l) => l.stopKey);
}

/** Next shipment in plan order (skips delivered). */
export function pickNextShipmentFromPlan(
  legs: PlannedLeg[],
  onRun: FleetShipmentInput[],
  excludeShipmentId: string,
): string | null {
  const seen = new Set<string>();
  for (const leg of legs) {
    const sid = leg.shipmentId;
    if (sid === excludeShipmentId) continue;
    if (seen.has(sid)) continue;
    const row = onRun.find((s) => s.shipmentId === sid);
    if (!row || row.status === "Delivered" || row.status === "On Hold" || row.status === "Cancelled") {
      continue;
    }
    seen.add(sid);
    return sid;
  }
  return null;
}

export function resolveLegCoords(
  stopKey: string,
  onRun: FleetShipmentInput[],
): LatLng | null {
  const sid = stopKey.split(":")[0] ?? "";
  const phase = stopKey.endsWith(":collect") ? "collect" : "deliver";
  const row = onRun.find((s) => s.shipmentId === sid);
  if (!row) return null;
  const { pickup, delivery } = rowCoords(row);
  return phase === "collect" ? pickup : delivery;
}

export function legsFromStopKeys(
  keys: string[],
  onRun: FleetShipmentInput[],
): PlannedLeg[] {
  const legs: PlannedLeg[] = [];
  for (const stopKey of keys) {
    const shipmentId = stopKey.split(":")[0] ?? "";
    const phase: StopPhase = stopKey.endsWith(":collect") ? "collect" : "deliver";
    const coords = resolveLegCoords(stopKey, onRun);
    if (!coords) continue;
    legs.push({ stopKey, shipmentId, phase, lat: coords.lat, lng: coords.lng });
  }
  return legs;
}
