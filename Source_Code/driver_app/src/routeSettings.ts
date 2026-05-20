import { DEFAULT_DEPOT, type LatLng } from "./routeMetrics";

export type RouteLocationOption = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

export type RouteSettings = {
  name: string;
  startTimeIso: string;
  startFromId: string;
  finishAtId: string;
  stopMinutes: number;
  markAsDefault: boolean;
};

/** Shown read-only in Edit route (see Door_to_Door_Routing_Strategy.md). */
export const ROUTING_STRATEGY_LABEL =
  "Door-to-door (nearest collection after each delivery)";

const STORAGE_PREFIX = "cmp600-route-settings";
const DEFAULT_KEY = "cmp600-route-settings-default";

export const DEPOT_PRESETS: RouteLocationOption[] = [
  {
    id: "depot-london",
    label: "London depot · simulated hub",
    lat: DEFAULT_DEPOT.lat,
    lng: DEFAULT_DEPOT.lng,
  },
  {
    id: "depot-leeds",
    label: "LS27 7JQ · Gildersome Link Ind Est (simulated)",
    lat: 53.748,
    lng: -1.619,
  },
];

export function formatRouteNameFromDate(d = new Date()): string {
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date.replace(/ /g, "-")} (${time})`;
}

export function formatDisplayDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date.replace(/ /g, "-")} (${time})`;
}

export function formatStopTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function defaultRouteSettings(): RouteSettings {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  return {
    name: formatRouteNameFromDate(now),
    startTimeIso: toLocalIso(now),
    startFromId: DEPOT_PRESETS[0].id,
    finishAtId: DEPOT_PRESETS[0].id,
    stopMinutes: 4,
    markAsDefault: false,
  };
}

/** `datetime-local` value from Date (local timezone). */
export function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function storageKey(driverId: string) {
  return `${STORAGE_PREFIX}:${driverId}`;
}

export function loadRouteSettings(driverId: string): RouteSettings {
  if (!driverId) return defaultRouteSettings();
  try {
    const defaultRaw = localStorage.getItem(DEFAULT_KEY);
    const raw = localStorage.getItem(storageKey(driverId));
    const pick = raw ?? defaultRaw;
    if (!pick) return defaultRouteSettings();
    return { ...defaultRouteSettings(), ...(JSON.parse(pick) as RouteSettings) };
  } catch {
    return defaultRouteSettings();
  }
}

export function saveRouteSettings(driverId: string, settings: RouteSettings): void {
  localStorage.setItem(storageKey(driverId), JSON.stringify(settings));
  if (settings.markAsDefault) {
    localStorage.setItem(DEFAULT_KEY, JSON.stringify(settings));
  }
}

export function resolveLocation(
  id: string,
  options: RouteLocationOption[],
): RouteLocationOption {
  return options.find((o) => o.id === id) ?? DEPOT_PRESETS[0];
}

export function toLatLng(loc: RouteLocationOption): LatLng {
  return { lat: loc.lat, lng: loc.lng };
}

export function buildLocationOptions(
  stops: { shipmentId: string; destination: string; lat: number; lng: number }[],
): RouteLocationOption[] {
  const stopOpts = stops.map((s) => ({
    id: `stop-${s.shipmentId}`,
    label: `${s.shipmentId} · ${s.destination.length > 42 ? `${s.destination.slice(0, 42)}…` : s.destination}`,
    lat: s.lat,
    lng: s.lng,
  }));
  return [...DEPOT_PRESETS, ...stopOpts];
}
