/** Expand API shipments into driver run stops (collect + deliver phases). */

export type StopPhase = "collect" | "deliver";

export type FleetShipmentInput = {
  shipmentId: string;
  destination: string;
  status: string;
  statusBeforeHold?: string | null;
  lat: number;
  lng: number;
  deliveryDate: string | null;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  parcelCount?: number;
};

const COLLECT_DONE_STATUSES = new Set(["Picked Up", "In Transit", "Delayed", "Delivered"]);

export function isShipmentOnHold(row: FleetShipmentInput): boolean {
  return row.status === "On Hold";
}

export function isCollectLegDone(row: FleetShipmentInput): boolean {
  if (row.status === "Delivered") return true;
  if (row.status === "On Hold") {
    const before = row.statusBeforeHold;
    return Boolean(before && COLLECT_DONE_STATUSES.has(before));
  }
  return COLLECT_DONE_STATUSES.has(row.status);
}

export type QueueItemInput = {
  shipmentId: string;
  eta?: string | null;
  deliveryOption?: string;
};

export type RunStopBase = {
  stopKey: string;
  shipmentId: string;
  phase: StopPhase;
  destination: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  deliveryDate: string | null;
  eta: string | null;
  deliveryOption: string;
  lat: number;
  lng: number;
  parcelCount: number;
};

export function expandLegToStop(
  row: FleetShipmentInput,
  phase: StopPhase,
  queue?: QueueItemInput,
): RunStopBase {
  const pickup = row.pickupAddress ?? row.destination;
  const delivery = row.deliveryAddress ?? row.destination;
  const plat = row.pickupLat ?? row.lat;
  const plng = row.pickupLng ?? row.lng;
  const dlat = row.deliveryLat ?? row.lat;
  const dlng = row.deliveryLng ?? row.lng;
  const isCollect = phase === "collect";
  return {
    stopKey: `${row.shipmentId}:${phase}`,
    shipmentId: row.shipmentId,
    phase,
    pickupAddress: pickup,
    deliveryAddress: delivery,
    status: row.status,
    deliveryDate: row.deliveryDate,
    eta: queue?.eta ?? null,
    deliveryOption: queue?.deliveryOption ?? "Standard",
    parcelCount: row.parcelCount ?? 1,
    destination: isCollect ? pickup : delivery,
    lat: isCollect ? plat : dlat,
    lng: isCollect ? plng : dlng,
  };
}

/** Pickup or delivery leg already completed for this shipment. */
export function isLegCompleted(row: FleetShipmentInput, phase: StopPhase): boolean {
  if (row.status === "Delivered") return true;
  if (row.status === "Cancelled") return false;
  if (phase === "collect") return isCollectLegDone(row);
  return false;
}

/** Legs still to drive (polyline / next-stop), not hidden from list. */
export function isLegPendingOnRoute(row: FleetShipmentInput, phase: StopPhase): boolean {
  if (isShipmentOnHold(row)) return false;
  return !isLegCompleted(row, phase);
}

/** Driver can act on this leg now (swipe Actions / workflow). */
export function isLegActionable(row: FleetShipmentInput, phase: StopPhase): boolean {
  if (row.status === "Delivered" || row.status === "Cancelled" || isShipmentOnHold(row)) return false;
  if (phase === "collect") return row.status === "Assigned";
  return row.status !== "Assigned" && row.status !== "Created";
}

/** List + map rows in door-to-door plan order (one row per leg). */
export function buildRunStopsFromPlanOrder(
  stopOrder: string[],
  onRun: FleetShipmentInput[],
  queueItems: QueueItemInput[] = [],
): RunStopBase[] {
  const queueById = new Map(queueItems.map((q) => [q.shipmentId, q]));
  const rows: RunStopBase[] = [];
  for (const key of stopOrder) {
    const shipmentId = key.split(":")[0] ?? "";
    const phase: StopPhase = key.endsWith(":collect") ? "collect" : "deliver";
    const row = onRun.find((s) => s.shipmentId === shipmentId);
    if (!row) continue;
    rows.push(expandLegToStop(row, phase, queueById.get(shipmentId)));
  }
  return rows;
}

export function expandShipmentToStops(
  row: FleetShipmentInput,
  queue?: QueueItemInput,
): RunStopBase[] {
  if (row.status === "Delivered") {
    return [expandLegToStop(row, "deliver", queue)];
  }
  if (row.status === "On Hold") {
    return [expandLegToStop(row, "collect", queue), expandLegToStop(row, "deliver", queue)];
  }
  if (row.status === "Assigned") {
    return [expandLegToStop(row, "collect", queue)];
  }
  return [expandLegToStop(row, "deliver", queue)];
}

export function buildRunOrder(
  fleetOrder: string[],
  openQueueIds: string[],
  manualOrder: string[] | null,
  hasDelivered: boolean,
  onRun: FleetShipmentInput[],
): string[] {
  if (manualOrder?.length) {
    const shipmentOrder = [...manualOrder];
    for (const id of fleetOrder) {
      if (!shipmentOrder.includes(id)) shipmentOrder.push(id);
    }
    return shipmentOrder.filter((id) => onRun.some((s) => s.shipmentId === id));
  }

  const defaultOrder = (() => {
    if (!hasDelivered) {
      return [...openQueueIds, ...fleetOrder.filter((id) => !openQueueIds.includes(id))];
    }
    const pendingOpen = openQueueIds.filter((id) =>
      onRun.some((s) => s.shipmentId === id && s.status !== "Delivered"),
    );
    let pendingIdx = 0;
    return fleetOrder.map((id) => {
      const row = onRun.find((s) => s.shipmentId === id);
      if (!row || row.status === "Delivered") return id;
      return pendingOpen[pendingIdx++] ?? id;
    });
  })();

  let shipmentOrder = manualOrder?.length ? [...manualOrder] : defaultOrder;
  for (const id of fleetOrder) {
    if (!shipmentOrder.includes(id)) shipmentOrder.push(id);
  }
  return shipmentOrder.filter((id) => onRun.some((s) => s.shipmentId === id));
}

/** Keep optimised positions; completed legs inherit their shipment slot. */
export function sortStopsByRouteOrder<T extends { stopKey: string; shipmentId: string }>(
  rows: T[],
  manualStopOrder: string[],
  shipmentOrder: string[],
): T[] {
  const rank = new Map(manualStopOrder.map((k, i) => [k, i]));
  const shipmentRank = new Map(shipmentOrder.map((sid, i) => [sid, i]));

  const legRank = (stop: T): number => {
    const direct = rank.get(stop.stopKey);
    if (direct !== undefined) return direct;
    const prefix = `${stop.shipmentId}:`;
    let best = Number.POSITIVE_INFINITY;
    for (const [k, i] of rank) {
      if (k.startsWith(prefix)) best = Math.min(best, i);
    }
    if (best !== Number.POSITIVE_INFINITY) return best;
    return (shipmentRank.get(stop.shipmentId) ?? 999) * 1000;
  };

  return [...rows].sort((a, b) => legRank(a) - legRank(b));
}

/** Flatten shipments to stop keys preserving collect-before-deliver per shipment. */
export function shipmentOrderToStopKeys(
  shipmentOrder: string[],
  onRun: FleetShipmentInput[],
): string[] {
  const keys: string[] = [];
  for (const sid of shipmentOrder) {
    const row = onRun.find((s) => s.shipmentId === sid);
    if (!row) continue;
    for (const stop of expandShipmentToStops(row)) {
      keys.push(stop.stopKey);
    }
  }
  return keys;
}

/** Next shipment to work on after one is delivered (queue order, then fleet order). */
export function pickNextPendingShipmentId(
  onRun: FleetShipmentInput[],
  openQueueIds: string[],
  excludeShipmentId: string,
  preferredNextId?: string | null,
): string | null {
  const pending = onRun.filter(
    (s) =>
      s.status !== "Delivered" &&
      s.status !== "On Hold" &&
      s.status !== "Cancelled" &&
      s.shipmentId !== excludeShipmentId,
  );
  if (!pending.length) return null;

  if (preferredNextId && preferredNextId !== excludeShipmentId) {
    const hit = pending.find((s) => s.shipmentId === preferredNextId);
    if (hit) return preferredNextId;
  }

  for (const id of openQueueIds) {
    if (id === excludeShipmentId) continue;
    if (pending.some((s) => s.shipmentId === id)) return id;
  }

  return pending[0]?.shipmentId ?? null;
}

/** Build run stops in driver route order (optimise / manual order aware). */
export function buildOrderedRunStops(
  onRun: FleetShipmentInput[],
  openQueueIds: string[],
  manualOrder: string[] | null,
  manualStopOrder: string[] | null,
  queueItems: QueueItemInput[] = [],
): RunStopBase[] {
  const hasDelivered = onRun.some((s) => s.status === "Delivered");
  const queueById = new Map(queueItems.map((q) => [q.shipmentId, q]));
  const fleetOrder = onRun.map((s) => s.shipmentId);
  const shipmentOrder = buildRunOrder(fleetOrder, openQueueIds, manualOrder, hasDelivered, onRun);
  const rows: RunStopBase[] = [];
  for (const sid of shipmentOrder) {
    const row = onRun.find((s) => s.shipmentId === sid);
    if (!row) continue;
    rows.push(...expandShipmentToStops(row, queueById.get(sid)));
  }
  if (manualStopOrder?.length) {
    return sortStopsByRouteOrder(rows, manualStopOrder, shipmentOrder);
  }
  return rows;
}

/** Next shipment following the ordered run list (respects Optimise). */
export function pickNextShipmentInRunOrder(
  stops: Array<{ shipmentId: string; status: string }>,
  excludeShipmentId: string,
): string | null {
  const seen = new Set<string>();
  for (const stop of stops) {
    if (stop.status === "Delivered") continue;
    if (stop.shipmentId === excludeShipmentId) continue;
    if (seen.has(stop.shipmentId)) continue;
    seen.add(stop.shipmentId);
    return stop.shipmentId;
  }
  return null;
}
