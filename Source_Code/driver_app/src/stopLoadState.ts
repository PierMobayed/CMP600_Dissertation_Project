const KEY = "cmp600-driver-stop-load";

export type StopLoadState = {
  parcelTotal: number;
  loadedCount: number;
  onVan: boolean;
};

export function defaultParcelTotal(deliveryOption: string, shipmentId: string): number {
  if (deliveryOption === "WhiteGlove") return 3;
  if (deliveryOption === "Express" || deliveryOption === "SameDay") return 2;
  const n = parseInt(shipmentId.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? 1 + (n % 2) : 1;
}

export function loadStopLoadStates(): Record<string, StopLoadState> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, StopLoadState>) : {};
  } catch {
    return {};
  }
}

export function getStopLoadState(
  shipmentId: string,
  deliveryOption: string,
  cache: Record<string, StopLoadState>,
  parcelCount?: number,
): StopLoadState {
  const total = parcelCount ?? defaultParcelTotal(deliveryOption, shipmentId);
  const existing = cache[shipmentId];
  if (existing) {
    const loadedCount = Math.min(existing.loadedCount, total);
    return {
      parcelTotal: total,
      loadedCount,
      onVan: loadedCount > 0,
    };
  }
  return {
    parcelTotal: total,
    loadedCount: 0,
    onVan: false,
  };
}

export function saveStopLoadState(shipmentId: string, state: StopLoadState): void {
  const all = loadStopLoadStates();
  all[shipmentId] = state;
  localStorage.setItem(KEY, JSON.stringify(all));
}
