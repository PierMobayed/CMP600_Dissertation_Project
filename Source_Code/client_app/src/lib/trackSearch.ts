export type TrackableOrder = {
  orderId: string;
  shipmentId: string;
  status?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  destination?: string;
};

export function normalizeTrackQuery(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function searchableText(o: TrackableOrder): string {
  return [o.shipmentId, o.orderId, o.pickupAddress, o.deliveryAddress, o.destination, o.status]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function scoreOrder(o: TrackableOrder, q: string): number {
  const sid = o.shipmentId.toUpperCase();
  const oid = o.orderId.toUpperCase();
  if (sid === q || oid === q) return 100;
  if (sid.startsWith(q) || oid.startsWith(q)) return 85;
  if (sid.includes(q) || oid.includes(q)) return 70;
  if (searchableText(o).includes(q)) return 45;
  return 0;
}

export function findTrackMatches(orders: TrackableOrder[], rawQuery: string): TrackableOrder[] {
  const q = normalizeTrackQuery(rawQuery);
  if (!q) return [];

  return [...orders]
    .map((o) => ({ o, score: scoreOrder(o, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.o.shipmentId.localeCompare(b.o.shipmentId))
    .map((x) => x.o);
}

export function bestTrackMatch(orders: TrackableOrder[], rawQuery: string): TrackableOrder | null {
  const matches = findTrackMatches(orders, rawQuery);
  return matches[0] ?? null;
}
