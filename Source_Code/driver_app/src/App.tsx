import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet";
import { apiGet, apiPost, getDriverId, login, logout } from "./api";
import { fleetRasterTiles } from "./mapTiles";
import { MapFitBounds } from "./MapControls";
import { MapRecenter } from "./MapRecenter";
import { MapFloatMenu } from "./MapFloatMenu";
import { MapZoomPortal } from "./MapZoomPortal";
import { buildGoogleMapsDirectionsUrl } from "./mapsLinks";
import { NumberedMarker } from "./NumberedMarker";
import { AuthScreen } from "./components/AuthScreen";
import { LandingScreen } from "./components/LandingScreen";
import { EditRouteScreen } from "./EditRouteScreen";
import { buildRunSimulationPath, GPS_TICK_MS, mergeActiveLegPath, type GpsSimSpeed } from "./driverSimulation";
import {
  buildDoorToDoorPlan,
  legsFromStopKeys,
  pickNextShipmentFromPlan,
  resolveLegCoords,
  shipmentOrderFromPlan,
  stopKeysFromPlan,
} from "./doorToDoorRoute";
import { buildLegMetrics, projectedFinish, totalRouteMiles, type LegMetrics } from "./routeMetrics";
import {
  buildLocationOptions,
  defaultRouteSettings,
  loadRouteSettings,
  resolveLocation,
  saveRouteSettings,
  toLatLng,
  type RouteSettings,
} from "./routeSettings";
import { RouteMap3D } from "./RouteMap3D";
import { loadStopNotes, saveStopNote } from "./stopNotes";
import {
  getStopLoadState,
  loadStopLoadStates,
  saveStopLoadState,
  type StopLoadState,
} from "./stopLoadState";
import { EditStopWorkflow } from "./EditStopWorkflow";
import { StopFloatCard } from "./StopFloatCard";
import { resolveStopJob } from "./stopJob";
import { StopListRow } from "./StopListRow";
import {
  buildRunStopsFromPlanOrder,
  isLegActionable,
  isLegCompleted,
  isLegPendingOnRoute,
  isShipmentOnHold,
  pickNextPendingShipmentId,
  type FleetShipmentInput,
} from "./runStops";
import { resolveStopJobFromRow } from "./stopJob";
import { ThemeToggle } from "./ThemeToggle";
import { useThemeMode } from "./useThemeMode";

type Jobs = {
  driverId: string;
  jobs: { shipmentId: string; destination: string; status: string }[];
};

type FleetMapShipment = {
  shipmentId: string;
  destination: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  status: string;
  statusBeforeHold?: string | null;
  holdReason?: string | null;
  lat: number;
  lng: number;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  parcelCount?: number;
  phase?: string;
  driverId: string | null;
  deliveryDate: string | null;
  assignedToViewer: boolean;
};

type FleetMapResponse = {
  viewerDriverId: string;
  shipments: FleetMapShipment[];
};

type QueueItem = {
  shipmentId: string;
  destination: string;
  status: string;
  deliveryDate: string | null;
  eta?: string | null;
  deliveryOption?: string;
};

type QueueResponse = {
  driverId: string;
  nextShipmentId: string | null;
  queue: QueueItem[];
};

type RouteRes = {
  shipmentId: string;
  routeType: string;
  coordinates: { lat: number; lng: number }[];
  coordinates3D?: { lat: number; lng: number; altMeters: number }[];
};

export type RunStopRow = {
  order: number;
  stopKey: string;
  shipmentId: string;
  phase: "collect" | "deliver";
  destination: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  deliveryDate: string | null;
  eta: string | null;
  deliveryOption: string;
  parcelCount: number;
  lat: number;
  lng: number;
  distMi: number;
  etaLabel: string;
};

function pillClass(status: string): string {
  const slug = status.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "default";
  return `pill pill--${slug}`;
}

function isPriorityOption(opt: string): boolean {
  return opt === "Express" || opt === "SameDay" || opt === "WhiteGlove";
}

type PublicView = "landing" | "auth";

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("token"));
  const [publicView, setPublicView] = useState<PublicView>("landing");
  const [user, setUser] = useState("driver1");
  const [pass, setPass] = useState("demo");
  const [jobs, setJobs] = useState<Jobs | null>(null);
  const [fleet, setFleet] = useState<FleetMapResponse | null>(null);
  const [queuePreview, setQueuePreview] = useState<QueueResponse | null>(null);
  const [activeShipment, setActiveShipment] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteRes | null>(null);
  const [posIdx, setPosIdx] = useState(0);
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsSpeed, setGpsSpeed] = useState<GpsSimSpeed>("normal");
  const [show3d, setShow3d] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [navMsg, setNavMsg] = useState<string | null>(null);
  const [showFleetOverview, setShowFleetOverview] = useState(false);
  const [primaryView, setPrimaryView] = useState<"map" | "list">("map");
  const [listSearch, setListSearch] = useState("");
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const [manualStopOrder, setManualStopOrder] = useState<string[] | null>(null);
  const [stopNotes, setStopNotes] = useState<Record<string, string>>(() => loadStopNotes());
  const [loadStates, setLoadStates] = useState<Record<string, StopLoadState>>(() => loadStopLoadStates());
  const [listNoteDrafts, setListNoteDrafts] = useState<Record<string, string>>({});
  const [editStopId, setEditStopId] = useState<string | null>(null);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [fitToken, setFitToken] = useState(0);
  const [recenterToken, setRecenterToken] = useState(0);
  const mapInitialFitDone = useRef(false);
  const [mapZoomHost, setMapZoomHost] = useState<HTMLDivElement | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [showEditRoute, setShowEditRoute] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [routeSettings, setRouteSettings] = useState<RouteSettings>(() => defaultRouteSettings());
  const idxRef = useRef(0);
  const themeMode = useThemeMode();
  const tiles = useMemo(() => fleetRasterTiles(themeMode), [themeMode]);

  useEffect(() => {
    if (!navMsg) return undefined;
    const id = window.setTimeout(() => setNavMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [navMsg]);

  useEffect(() => {
    if (!activeShipment || primaryView !== "list") return;
    const el = document.querySelector(`[data-shipment-id="${activeShipment}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeShipment, primaryView]);

  const reloadDriverData = useCallback(async (): Promise<{
    fleet: FleetMapResponse;
    queue: QueueResponse;
  } | null> => {
    const did = getDriverId();
    if (!did) return null;
    try {
      const [j, f, q] = await Promise.all([
        apiGet<Jobs>(`/drivers/${did}/jobs`),
        apiGet<FleetMapResponse>(`/drivers/${did}/shipments-map-context`),
        apiGet<QueueResponse>(`/drivers/${did}/delivery-queue`),
      ]);
      setJobs(j);
      setFleet(f);
      setQueuePreview(q);
      setErr(null);
      return { fleet: f, queue: q };
    } catch {
      setErr("Could not synchronise jobs from the server.");
      return null;
    }
  }, []);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(user, pass);
      setAuthed(true);
    } catch {
      setErr("Use driver1 / demo");
    }
  }

  useEffect(() => {
    if (!authed) return undefined;
    reloadDriverData();
    const id = window.setInterval(reloadDriverData, 4000);
    return () => window.clearInterval(id);
  }, [authed, reloadDriverData]);

  useEffect(() => {
    if (!authed) return;
    const did = getDriverId();
    if (did) setRouteSettings(loadRouteSettings(did));
  }, [authed]);

  useEffect(() => {
    if (!authed || !activeShipment) {
      setRoute(null);
      return undefined;
    }
    const dim = show3d ? "3" : "2";
    let cancelled = false;
    apiGet<RouteRes>(`/shipments/${activeShipment}/route?dimensions=${dim}`).then((r) => {
      if (!cancelled) {
        setRoute(r);
        idxRef.current = 0;
        setPosIdx(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeShipment, authed, show3d]);

  const latLngs = useMemo(() => route?.coordinates.map((c) => [c.lat, c.lng] as [number, number]) ?? [], [route]);

  const onRunFleet = useMemo(
    () => fleet?.shipments.filter((s) => s.assignedToViewer) ?? [],
    [fleet],
  );

  const fleetInputs = useMemo((): FleetShipmentInput[] => {
    return onRunFleet.map((s) => ({
      shipmentId: s.shipmentId,
      destination: s.destination,
      status: s.status,
      statusBeforeHold: s.statusBeforeHold,
      lat: s.lat,
      lng: s.lng,
      deliveryDate: s.deliveryDate,
      pickupAddress: s.pickupAddress,
      deliveryAddress: s.deliveryAddress ?? s.destination,
      pickupLat: s.pickupLat,
      pickupLng: s.pickupLng,
      deliveryLat: s.deliveryLat ?? s.lat,
      deliveryLng: s.deliveryLng ?? s.lng,
      parcelCount: s.parcelCount,
    }));
  }, [onRunFleet]);

  const queueItems = useMemo(() => queuePreview?.queue ?? [], [queuePreview]);

  const fleetLocationOptions = useMemo(
    () =>
      buildLocationOptions(
        onRunFleet.map((s) => ({
          shipmentId: s.shipmentId,
          destination: s.destination,
          lat: s.lat,
          lng: s.lng,
        })),
      ),
    [onRunFleet],
  );

  const routeStartDepot = useMemo(
    () => toLatLng(resolveLocation(routeSettings.startFromId, fleetLocationOptions)),
    [routeSettings.startFromId, fleetLocationOptions],
  );

  const routeFinishDepot = useMemo(
    () => toLatLng(resolveLocation(routeSettings.finishAtId, fleetLocationOptions)),
    [routeSettings.finishAtId, fleetLocationOptions],
  );

  const routePlan = useMemo(
    () => buildDoorToDoorPlan(fleetInputs, routeStartDepot, queueItems),
    [fleetInputs, routeStartDepot, queueItems],
  );

  const effectiveStopOrder = useMemo(
    () => (manualStopOrder?.length ? manualStopOrder : stopKeysFromPlan(routePlan.legs)),
    [manualStopOrder, routePlan],
  );

  const activeRouteLegs = useMemo(
    () => legsFromStopKeys(effectiveStopOrder, fleetInputs),
    [effectiveStopOrder, fleetInputs],
  );

  const baseQueueRows = useMemo((): Omit<RunStopRow, "order" | "distMi" | "etaLabel">[] => {
    if (!fleet || !onRunFleet.length) return [];
    return buildRunStopsFromPlanOrder(effectiveStopOrder, fleetInputs, queueItems);
  }, [fleet, onRunFleet, fleetInputs, queueItems, effectiveStopOrder]);

  const locationOptions = useMemo(
    () =>
      buildLocationOptions(
        baseQueueRows.map((r) => ({
          shipmentId: r.shipmentId,
          destination: r.destination,
          lat: r.lat,
          lng: r.lng,
        })),
      ),
    [baseQueueRows],
  );

  const legMetrics: LegMetrics[] = useMemo(
    () =>
      buildLegMetrics(
        baseQueueRows.map((r) => {
          const row = fleetInputs.find((f) => f.shipmentId === r.shipmentId);
          const done = row ? isLegCompleted(row, r.phase) : false;
          return {
            lat: r.lat,
            lng: r.lng,
            status: done ? "Delivered" : r.status,
            eta: r.eta,
          };
        }),
        {
          depot: routeStartDepot,
          startAt: new Date(routeSettings.startTimeIso),
          minutesPerStop: routeSettings.stopMinutes,
        },
      ),
    [baseQueueRows, fleetInputs, routeStartDepot, routeSettings.startTimeIso, routeSettings.stopMinutes],
  );

  const runStops: RunStopRow[] = useMemo(
    () =>
      baseQueueRows.map((r, idx) => ({
        ...r,
        order: idx + 1,
        distMi: legMetrics[idx]?.distMi ?? 0,
        etaLabel: legMetrics[idx]?.etaLabel ?? "—",
      })),
    [baseQueueRows, legMetrics],
  );

  const filteredStops = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return runStops;
    return runStops.filter(
      (s) =>
        s.destination.toLowerCase().includes(q) ||
        s.pickupAddress.toLowerCase().includes(q) ||
        s.deliveryAddress.toLowerCase().includes(q) ||
        s.shipmentId.toLowerCase().includes(q) ||
        s.deliveryDate?.includes(q),
    );
  }, [runStops, listSearch]);

  const runPolyline = useMemo(() => {
    const pts: [number, number][] = [[routeStartDepot.lat, routeStartDepot.lng]];
    let hasLeg = false;
    for (const key of effectiveStopOrder) {
      const sid = key.split(":")[0] ?? "";
      const row = fleetInputs.find((s) => s.shipmentId === sid);
      if (!row || !isLegPendingOnRoute(row, key.endsWith(":collect") ? "collect" : "deliver")) continue;
      const coords = resolveLegCoords(key, fleetInputs);
      if (!coords) continue;
      pts.push([coords.lat, coords.lng]);
      hasLeg = true;
    }
    if (
      hasLeg &&
      (Math.abs(routeFinishDepot.lat - routeStartDepot.lat) > 1e-6 ||
        Math.abs(routeFinishDepot.lng - routeStartDepot.lng) > 1e-6)
    ) {
      pts.push([routeFinishDepot.lat, routeFinishDepot.lng]);
    }
    return pts.length > 1 ? pts : [];
  }, [effectiveStopOrder, fleetInputs, routeStartDepot, routeFinishDepot]);

  /** Map pins follow the full door-to-door plan (pickup + delivery legs), not one pin per shipment. */
  const mapPlanMarkers = useMemo(
    () =>
      runStops.map((s) => ({
        stopKey: s.stopKey,
        shipmentId: s.shipmentId,
        phase: s.phase,
        lat: s.lat,
        lng: s.lng,
        order: s.order,
      })),
    [runStops],
  );

  const simPath = useMemo(() => {
    const base = buildRunSimulationPath(runStops, routeStartDepot, routeFinishDepot);
    if (activeShipment && route?.coordinates.length) {
      return mergeActiveLegPath(
        base,
        route.coordinates.map((c) => ({ lat: c.lat, lng: c.lng })),
      );
    }
    return base;
  }, [runStops, activeShipment, route, routeStartDepot, routeFinishDepot]);

  useEffect(() => {
    idxRef.current = 0;
    setPosIdx(0);
  }, [simPath, gpsOn]);

  useEffect(() => {
    if (!gpsOn || simPath.length === 0) return undefined;
    const did = getDriverId();
    const tick = GPS_TICK_MS[gpsSpeed];
    const id = window.setInterval(() => {
      const i = idxRef.current % simPath.length;
      idxRef.current += 1;
      setPosIdx(i);
      const { lat, lng } = simPath[i];
      apiPost(`/drivers/${did}/location`, {
        lat,
        lng,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }, tick);
    return () => window.clearInterval(id);
  }, [gpsOn, gpsSpeed, simPath]);

  const mapCentre: [number, number] = useMemo(() => {
    if (runStops[0]) return [runStops[0].lat, runStops[0].lng];
    return [routeStartDepot.lat, routeStartDepot.lng];
  }, [runStops, routeStartDepot]);

  const vehiclePos = useMemo(() => {
    if (gpsOn && simPath.length) return simPath[posIdx % simPath.length];
    if (route?.coordinates.length) return route.coordinates[posIdx % route.coordinates.length];
    return null;
  }, [gpsOn, simPath, route, posIdx]);

  const activeStop = useMemo(() => {
    if (!activeShipment) return null;
    const matches = runStops.filter((s) => s.shipmentId === activeShipment);
    if (!matches.length) return null;
    const live =
      matches.find(
        (s) =>
          (s.phase === "collect" && s.status === "Assigned") ||
          (s.phase === "deliver" && s.status !== "Assigned" && s.status !== "Delivered"),
      ) ?? matches[matches.length - 1];
    return live;
  }, [runStops, activeShipment]);

  const editingStop = useMemo(
    () => (editStopId ? runStops.find((s) => s.shipmentId === editStopId) ?? null : null),
    [editStopId, runStops],
  );

  const editingJob = useMemo(
    () => (editStopId ? resolveStopJob(editStopId, fleet?.shipments, runStops) : null),
    [editStopId, fleet, runStops],
  );

  const nextQueueId = useMemo(() => {
    if (!fleetInputs.length) return null;
    return pickNextShipmentFromPlan(activeRouteLegs, fleetInputs, "");
  }, [activeRouteLegs, fleetInputs]);

  const nextPlanStopKey = useMemo(() => {
    if (!nextQueueId) return null;
    for (const leg of activeRouteLegs) {
      const row = fleetInputs.find((s) => s.shipmentId === leg.shipmentId);
      if (!row || !isLegPendingOnRoute(row, leg.phase)) continue;
      if (leg.shipmentId === nextQueueId) return leg.stopKey;
    }
    return null;
  }, [activeRouteLegs, fleetInputs, nextQueueId]);

  const stopsRemaining = useMemo(
    () =>
      runStops.filter((s) => {
        const row = fleetInputs.find((f) => f.shipmentId === s.shipmentId);
        return row ? !isLegCompleted(row, s.phase) : false;
      }).length,
    [runStops, fleetInputs],
  );
  const totalMiles = totalRouteMiles(legMetrics);
  const finishLabel = projectedFinish(legMetrics);

  const mapViewCenter: [number, number] = useMemo(() => {
    if (activeStop) return [activeStop.lat, activeStop.lng];
    if (vehiclePos) return [vehiclePos.lat, vehiclePos.lng];
    return mapCentre;
  }, [activeStop, vehiclePos, mapCentre]);

  useEffect(() => {
    if (activeShipment) setRecenterToken((t) => t + 1);
  }, [activeShipment]);

  useEffect(() => {
    if (primaryView !== "map" || mapInitialFitDone.current) return;
    if (runPolyline.length < 2) return;
    mapInitialFitDone.current = true;
    setFitToken((t) => t + 1);
  }, [primaryView, runPolyline.length]);

  async function navigateToNextStop(openMaps: boolean) {
    setErr(null);
    setNavMsg(null);
    const exclude = activeShipment ?? "";
    const nextId = pickNextShipmentFromPlan(activeRouteLegs, fleetInputs, exclude);
    if (!nextId) {
      setNavMsg("No pending parcels on your run.");
      setGpsOn(false);
      return;
    }
    const dest =
      runStops.find((s) => s.stopKey === nextPlanStopKey) ?? runStops.find((s) => s.shipmentId === nextId);
    try {
      await apiPost(`/shipments/${nextId}/status`, {
        status: "In Transit",
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      setActiveShipment(nextId);
      setPrimaryView("map");
      setNavMsg(`Leg started · ${nextId}`);
      setGpsOn(true);
      if (openMaps && dest) {
        window.open(buildGoogleMapsDirectionsUrl(dest.lat, dest.lng), "_blank", "noopener,noreferrer");
      }
      await reloadDriverData();
    } catch {
      setErr("Unable to start the next leg.");
    }
  }

  async function updateShipmentStatus(shipmentId: string, status: string) {
    if (!shipmentId) return;
    setErr(null);
    try {
      await apiPost(`/shipments/${shipmentId}/status`, {
        status,
        timestamp: new Date().toISOString(),
      });
      const synced = await reloadDriverData();
      if (status === "Delivered") {
        setEditStopId(null);

        const onRun: FleetShipmentInput[] =
          synced?.fleet.shipments
            .filter((s) => s.assignedToViewer)
            .map((s) => ({
              shipmentId: s.shipmentId,
              destination: s.destination,
              status: s.status,
              lat: s.lat,
              lng: s.lng,
              deliveryDate: s.deliveryDate,
              pickupAddress: s.pickupAddress,
              deliveryAddress: s.deliveryAddress,
              pickupLat: s.pickupLat,
              pickupLng: s.pickupLng,
              deliveryLat: s.deliveryLat,
              deliveryLng: s.deliveryLng,
              parcelCount: s.parcelCount,
            })) ?? [];

        const openIds = (synced?.queue.queue ?? []).map((q) => q.shipmentId);
        const queueItems = synced?.queue.queue ?? [];

        const plan = buildDoorToDoorPlan(onRun, routeStartDepot, queueItems);
        const legs = manualStopOrder?.length
          ? legsFromStopKeys(manualStopOrder, onRun)
          : plan.legs;
        const nextId =
          pickNextShipmentFromPlan(legs, onRun, shipmentId) ??
          pickNextPendingShipmentId(onRun, openIds, shipmentId, null);

        setActiveShipment(nextId);
        setNavMsg(
          nextId
            ? `Delivered · ${shipmentId}. Next stop: ${nextId}`
            : `Delivered · ${shipmentId}. Route complete.`,
        );
      } else if (status === "Assigned" || status === "Picked Up" || status === "In Transit") {
        setActiveShipment(shipmentId);
        setNavMsg(`Stop active again · ${shipmentId}`);
        setEditStopId(null);
      } else if (status === "Delayed") {
        setNavMsg(`Marked delayed · ${shipmentId}`);
      }
    } catch {
      setErr("Could not update shipment status.");
    }
  }

  function reactivateStop(shipmentId: string, asInTransit = false) {
    void updateShipmentStatus(shipmentId, asInTransit ? "In Transit" : "Assigned");
  }

  function handleOptimise() {
    const pendingShipments = fleetInputs.filter((s) => s.status !== "Delivered");
    if (pendingShipments.length < 2) return;
    const start = vehiclePos
      ? { lat: vehiclePos.lat, lng: vehiclePos.lng }
      : routeStartDepot;
    const plan = buildDoorToDoorPlan(fleetInputs, start, queueItems);
    const keys = stopKeysFromPlan(plan.legs);
    setManualStopOrder(keys);
    setManualOrder(shipmentOrderFromPlan(plan.legs));
    setActiveShipment(null);
    setEditStopId(null);
    setPrimaryView("map");
    const batch = plan.batchPickupMiles ?? 0;
    const saved = batch - plan.totalMiles;
    const savedNote =
      saved > 0.05 ? ` (~${saved.toFixed(1)} mi shorter than batch-collection tour)` : "";
    setNavMsg(
      `Door-to-door route · ${plan.totalMiles.toFixed(1)} mi, ${plan.legs.length} legs. Batch-collection baseline ~${batch.toFixed(1)} mi${savedNote}. Device-local only.`,
    );
    setFitToken((t) => t + 1);
  }

  function openEditStop(id: string) {
    setEditStopId(id);
    setEditNoteDraft(stopNotes[id] ?? "");
  }

  function saveEditStop() {
    if (!editStopId) return;
    saveStopNote(editStopId, editNoteDraft);
    setStopNotes(loadStopNotes());
    setEditStopId(null);
    setNavMsg("Stop notes saved on this device.");
  }

  function noteForShipment(shipmentId: string): string {
    return listNoteDrafts[shipmentId] ?? stopNotes[shipmentId] ?? "";
  }

  function saveNoteForShipment(shipmentId: string, text: string) {
    saveStopNote(shipmentId, text);
    setStopNotes(loadStopNotes());
    setListNoteDrafts((prev) => {
      const next = { ...prev };
      delete next[shipmentId];
      return next;
    });
    setNavMsg("Delivery note saved on this device.");
  }

  function loadForShipment(
    shipmentId: string,
    deliveryOption: string,
    mode: "one" | "all",
    parcelCount?: number,
  ) {
    setLoadStates((prev) => {
      const cur = getStopLoadState(shipmentId, deliveryOption, prev, parcelCount);
      const loadedCount =
        mode === "all" ? cur.parcelTotal : Math.min(cur.parcelTotal, cur.loadedCount + 1);
      const next: StopLoadState = { ...cur, loadedCount, onVan: loadedCount > 0 };
      saveStopLoadState(shipmentId, next);
      if (loadedCount >= cur.parcelTotal) {
        setNavMsg(`All ${cur.parcelTotal} parcel(s) on van · ${shipmentId}`);
      } else {
        setNavMsg(`Loaded ${loadedCount}/${cur.parcelTotal} · ${shipmentId}`);
      }
      return { ...prev, [shipmentId]: next };
    });
  }

  const handleLogout = useCallback(() => {
    logout();
    setAuthed(false);
    setPublicView("landing");
    setGpsOn(false);
    setFleet(null);
    setManualOrder(null);
    setMapMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!mapMenuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapMenuOpen]);

  function markerColourFleet(s: FleetMapShipment) {
    const isActive = activeShipment === s.shipmentId;
    const isNext = nextQueueId === s.shipmentId;
    if (s.status === "Delivered") {
      return { stroke: "#64748b", fill: "#94a3b8", weight: 1, r: 6 };
    }
    if (isActive) return { stroke: "#10b981", fill: "#6ee7b7", weight: 3, r: 10 };
    if (isNext) return { stroke: "#fbbf24", fill: "#fcd34d", weight: 3, r: 10 };
    return { stroke: "#94a3b8", fill: "#cbd5e1", weight: 1, r: 5 };
  }

  if (!authed) {
    if (publicView === "landing") {
      return <LandingScreen onSignIn={() => setPublicView("auth")} />;
    }
    return (
      <AuthScreen
        user={user}
        pass={pass}
        onUserChange={setUser}
        onPassChange={setPass}
        error={err}
        onLogin={doLogin}
        onBackHome={() => setPublicView("landing")}
      />
    );
  }

  const didLabel = jobs?.driverId ?? getDriverId();

  return (
    <div
      className={`driver-app driver-app--courier ${primaryView === "map" ? "driver-app--map-focus" : ""} ${
        primaryView === "map" && activeStop ? "driver-app--stop-focus" : ""
      }`}
    >
      <header className="driver-topbar">
        <div className="driver-topbar-brand">
          <span className="driver-topbar-title">CMP600 Driver</span>
          <span className="driver-topbar-sub">{didLabel}</span>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <button type="button" className="btn-header" onClick={handleLogout}>
            <span className="btn-header-long">Log out</span>
            <span className="btn-header-short" aria-hidden>
              Out
            </span>
          </button>
        </div>
      </header>

      <main
        className={`driver-main driver-main--courier driver-main--${primaryView} ${
          primaryView === "map" ? "driver-main--map-fullscreen" : ""
        }`}
      >
        {primaryView !== "map" && err && <div className="driver-alert driver-alert--error">{err}</div>}
        {primaryView !== "map" && navMsg && !err && (
          <div className="driver-alert driver-alert--ok">{navMsg}</div>
        )}

        {primaryView !== "map" && (
        <button
          type="button"
          className="route-summary-card route-summary-card--clickable"
          onClick={() => setShowEditRoute(true)}
        >
          <div className="route-summary-icon" aria-hidden>
            ✓
          </div>
          <div className="route-summary-body">
            <strong className="route-summary-title">{routeSettings.name || "Route summary"}</strong>
            <span className="route-summary-finish">Finish {finishLabel}</span>
            <span className="route-summary-meta">
              {stopsRemaining} of {runStops.length} legs · {totalMiles.toFixed(1)} mi · stop{" "}
              {routeSettings.stopMinutes} min
            </span>
            <span className="route-summary-edit-hint">Tap to edit route</span>
          </div>
        </button>
        )}

        {primaryView === "map" ? (
          <div className="courier-map-stage courier-map-stage--fullscreen">
            <div className="map-wrap map-wrap-courier map-wrap--fullscreen">
              <MapContainer
                center={mapCentre}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
                zoomControl={false}
              >
                <MapZoomPortal host={mapZoomHost} />
                <MapRecenter
                  lat={mapViewCenter[0]}
                  lng={mapViewCenter[1]}
                  zoom={activeStop ? 15 : undefined}
                  token={recenterToken}
                />
                <MapFitBounds points={runPolyline} token={fitToken} />
                <TileLayer key={themeMode} url={tiles.url} attribution={tiles.attribution} />

                {showFleetOverview &&
                  fleet?.shipments
                    .filter((s) => !runStops.some((r) => r.shipmentId === s.shipmentId))
                    .map((s) => {
                      const mc = markerColourFleet(s);
                      return (
                        <CircleMarker
                          key={`f-${s.shipmentId}`}
                          center={[s.lat, s.lng]}
                          radius={mc.r}
                          pathOptions={{
                            color: mc.stroke,
                            weight: mc.weight,
                            fillColor: mc.fill,
                            fillOpacity: 0.5,
                          }}
                        />
                      );
                    })}

                {mapPlanMarkers
                  .filter((m) => {
                    if (!listSearch.trim()) return true;
                    const q = listSearch.toLowerCase();
                    const row = fleetInputs.find((s) => s.shipmentId === m.shipmentId);
                    return (
                      m.shipmentId.toLowerCase().includes(q) ||
                      row?.destination.toLowerCase().includes(q) ||
                      row?.pickupAddress?.toLowerCase().includes(q) ||
                      row?.deliveryAddress?.toLowerCase().includes(q)
                    );
                  })
                  .map((m) => {
                    const fleetRow = fleetInputs.find((f) => f.shipmentId === m.shipmentId);
                    const legDone = fleetRow ? isLegCompleted(fleetRow, m.phase) : false;
                    let variant: "next" | "active" | "default" | "delivered" = "default";
                    if (legDone) variant = "delivered";
                    else if (activeStop?.stopKey === m.stopKey) variant = "active";
                    else if (m.stopKey === nextPlanStopKey) variant = "next";
                    return (
                      <NumberedMarker
                        key={m.stopKey}
                        lat={m.lat}
                        lng={m.lng}
                        number={m.order}
                        phase={m.phase}
                        variant={variant}
                        onSelect={() => setActiveShipment(m.shipmentId)}
                      />
                    );
                  })}

                {runPolyline.length > 1 && (
                  <>
                    <Polyline
                      positions={runPolyline}
                      pathOptions={{
                        color: themeMode === "dark" ? "#0f172a" : "#475569",
                        weight: 10,
                        opacity: 0.5,
                        lineCap: "round",
                      }}
                    />
                    <Polyline
                      positions={runPolyline}
                      pathOptions={{
                        color: "#2563eb",
                        weight: 6,
                        opacity: 0.95,
                        lineCap: "round",
                      }}
                    />
                  </>
                )}

                {latLngs.length > 0 && (
                  <Polyline
                    positions={latLngs}
                    pathOptions={{
                      color: "#14b8a6",
                      weight: 4,
                      opacity: 0.85,
                      dashArray: "8 6",
                    }}
                  />
                )}

                {gpsOn && vehiclePos && (
                  <CircleMarker
                    center={[vehiclePos.lat, vehiclePos.lng]}
                    radius={10}
                    pathOptions={{
                      color: "#22c55e",
                      fillColor: "#86efac",
                      fillOpacity: 0.95,
                      weight: 3,
                    }}
                  />
                )}
              </MapContainer>
            </div>

            <div className="map-float-layer">
              {(err || (navMsg && !err)) && (
                <div
                  className={`map-toast ${err ? "map-toast--error" : "map-toast--ok"}`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="map-toast-text">{err ?? navMsg}</span>
                  <button
                    type="button"
                    className="map-toast-dismiss"
                    aria-label="Dismiss message"
                    onClick={() => {
                      if (err) setErr(null);
                      else setNavMsg(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="map-float-chrome">
                <div className="map-float-top">
                  <MapFloatMenu
                    open={mapMenuOpen}
                    onToggle={() => setMapMenuOpen((v) => !v)}
                    onClose={() => setMapMenuOpen(false)}
                    onEditRoute={() => setShowEditRoute(true)}
                    onLogOut={handleLogout}
                  />
                  <input
                    type="search"
                    className="map-search map-search--float"
                    placeholder="Search stops…"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="map-float-route-chip"
                    onClick={() => setShowEditRoute(true)}
                    title={routeSettings.name || "Route"}
                  >
                    {mapPlanMarkers.length} legs
                  </button>
                  <ThemeToggle />
                </div>
                <p className="map-route-legend map-route-legend--float" aria-hidden>
                  <span>
                    <i className="legend-collection" /> Collection
                  </span>
                  <span>
                    <i className="legend-delivery" /> Delivery
                  </span>
                </p>
              </div>

              <div className="map-float-controls map-float-controls--side">
                <button
                  type="button"
                  title="Centre on active stop or vehicle"
                  aria-label="Centre on active stop or vehicle"
                  onClick={() => setRecenterToken((t) => t + 1)}
                >
                  ⊕
                </button>
                <button
                  type="button"
                  className={fitToken > 0 ? "is-on" : ""}
                  title="Show full route overview"
                  aria-label="Show full route overview"
                  onClick={() => setFitToken((t) => t + 1)}
                >
                  ⛶
                </button>
                <button
                  type="button"
                  title={showFleetOverview ? "Hide fleet" : "Show fleet"}
                  className={showFleetOverview ? "is-on" : ""}
                  onClick={() => setShowFleetOverview((v) => !v)}
                >
                  ◉
                </button>
                <button
                  type="button"
                  title={gpsOn ? "GPS sim on" : "GPS sim off"}
                  className={`map-float-btn--gps ${gpsOn ? "is-on" : ""}`.trim()}
                  onClick={() => setGpsOn((v) => !v)}
                >
                  GPS
                </button>
                <div ref={setMapZoomHost} className="map-float-zoom-slot" />
              </div>

              {!activeStop && (
                <button
                  type="button"
                  className="map-float-start"
                  title="Start next leg"
                  onClick={() => void navigateToNextStop(false)}
                >
                  ▶
                </button>
              )}

              {activeStop &&
                (() => {
                  const activeJob = resolveStopJob(activeStop.shipmentId, fleet?.shipments, runStops);
                  if (!activeJob) return null;
                  return (
                    <StopFloatCard
                      stop={activeStop}
                      job={activeJob}
                      totalStops={runStops.length}
                      load={getStopLoadState(
                        activeStop.shipmentId,
                        activeStop.deliveryOption,
                        loadStates,
                        activeStop.parcelCount,
                      )}
                      note={stopNotes[activeStop.shipmentId] ?? ""}
                      onClose={() => setActiveShipment(null)}
                      onEdit={() => openEditStop(activeStop.shipmentId)}
                      onStatus={(st) => void updateShipmentStatus(activeStop.shipmentId, st)}
                      onLoadOne={() =>
                        loadForShipment(
                          activeStop.shipmentId,
                          activeStop.deliveryOption,
                          "one",
                          activeStop.parcelCount,
                        )
                      }
                      onLoadAll={() =>
                        loadForShipment(
                          activeStop.shipmentId,
                          activeStop.deliveryOption,
                          "all",
                          activeStop.parcelCount,
                        )
                      }
                    />
                  );
                })()}
            </div>
          </div>
        ) : (
          <div className="courier-list-stage">
            <div className="list-toolbar">
              <input
                type="search"
                className="map-search"
                placeholder="Search postcode or address…"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
              <button
                type="button"
                className="list-refresh-btn"
                title="Refresh stops from server"
                onClick={() => void reloadDriverData()}
              >
                Refresh
              </button>
            </div>
            <div className="list-route-summary">
              <span>{runStops.length} legs</span>
              <span>{totalMiles.toFixed(1)} mi</span>
              <span>Finish {finishLabel}</span>
            </div>
            <div className="list-depot">
              <span className="list-depot-flag" aria-hidden>
                🏁
              </span>
              <div>
                <strong>Depot / start</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                  Simulated hub · first stop follows optimised queue
                </p>
              </div>
            </div>
            <ol className="courier-list">
              {filteredStops.map((row) => {
                const fleetRow = fleetInputs.find((f) => f.shipmentId === row.shipmentId);
                const onHold = fleetRow ? isShipmentOnHold(fleetRow) : false;
                const actionable = fleetRow ? isLegActionable(fleetRow, row.phase) : false;
                const active = activeStop?.stopKey === row.stopKey;
                const isNext = !onHold && row.stopKey === nextPlanStopKey;
                const isDone = fleetRow ? isLegCompleted(fleetRow, row.phase) : false;
                const legUpcoming = !onHold && !isDone && !actionable;
                const load = getStopLoadState(
                  row.shipmentId,
                  row.deliveryOption,
                  loadStates,
                  row.parcelCount,
                );
                const note = noteForShipment(row.shipmentId);
                const job = resolveStopJobFromRow(row, fleet?.shipments, runStops);
                if (!job) return null;
                return (
                  <StopListRow
                    key={row.stopKey}
                    row={row}
                    job={job}
                    load={load}
                    active={active}
                    isNext={isNext}
                    isDone={isDone}
                    legUpcoming={legUpcoming}
                    onHold={onHold}
                    actionable={actionable}
                    note={note}
                    onSelect={() => setActiveShipment(row.shipmentId)}
                    onNoteChange={(v) =>
                      setListNoteDrafts((prev) => ({ ...prev, [row.shipmentId]: v }))
                    }
                    onNoteSave={() =>
                      saveNoteForShipment(
                        row.shipmentId,
                        listNoteDrafts[row.shipmentId] ?? stopNotes[row.shipmentId] ?? "",
                      )
                    }
                    onEdit={() => openEditStop(row.shipmentId)}
                    onStatus={(st) => void updateShipmentStatus(row.shipmentId, st)}
                    onLoadOne={() =>
                      loadForShipment(row.shipmentId, row.deliveryOption, "one", row.parcelCount)
                    }
                    onLoadAll={() =>
                      loadForShipment(row.shipmentId, row.deliveryOption, "all", row.parcelCount)
                    }
                    onReactivate={(asInTransit) => reactivateStop(row.shipmentId, asInTransit)}
                  />
                );
              })}
            </ol>
          </div>
        )}

        <nav className="courier-bottom-nav" aria-label="Main navigation">
          <button type="button" className="courier-nav-btn" onClick={handleOptimise} disabled={runStops.length < 2}>
            Optimise
          </button>
          <button
            type="button"
            className={`courier-nav-btn ${primaryView === "map" ? "courier-nav-btn--active" : ""}`}
            onClick={() => setPrimaryView("map")}
          >
            Map
          </button>
          <button
            type="button"
            className={`courier-nav-btn ${primaryView === "list" ? "courier-nav-btn--active" : ""}`}
            onClick={() => {
              setPrimaryView("list");
              setMobileListOpen(false);
            }}
          >
            List
          </button>
        </nav>

        <section className="driver-tools-row">
          <label className="toggle-chip">
            <input type="checkbox" checked={show3d} onChange={(e) => setShow3d(e.target.checked)} />
            3D route preview
          </label>
        </section>

        {show3d && activeShipment && route && route.coordinates.length > 0 && (
          <section className="panel-3d">
            <RouteMap3D coordinates={route.coordinates} coordinates3D={route.coordinates3D} theme={themeMode} />
          </section>
        )}

        <p className="app-footer-note">CMP600 prototype · simulated data</p>
      </main>

      {editStopId && (
        <div
          className="edit-stop-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-stop-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditStopId(null);
          }}
        >
          <div className="edit-stop-sheet">
            <div className="edit-stop-handle" aria-hidden />
            <div className="edit-stop-header">
              <div className="edit-stop-header-main">
                {editingStop && (
                  <span className="edit-stop-order" aria-hidden>
                    {editingStop.order}
                  </span>
                )}
                <div>
                  <h2 id="edit-stop-title">Edit stop</h2>
                  <p className="edit-stop-id">{editStopId}</p>
                </div>
              </div>
              <button
                type="button"
                className="edit-stop-close"
                onClick={() => setEditStopId(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {editingJob && (
              <div className="edit-stop-meta">
                <div className="edit-stop-route">
                  <div className="edit-stop-route__leg">
                    <span className="edit-stop-route__dot edit-stop-route__dot--pickup" aria-hidden />
                    <div className="edit-stop-route__text">
                      <span className="edit-stop-route__label">Collection</span>
                      <span className="edit-stop-route__addr">{editingJob.pickupAddress}</span>
                    </div>
                  </div>
                  <span className="edit-stop-route__arrow" aria-hidden>
                    →
                  </span>
                  <div className="edit-stop-route__leg">
                    <span className="edit-stop-route__dot edit-stop-route__dot--delivery" aria-hidden />
                    <div className="edit-stop-route__text">
                      <span className="edit-stop-route__label">Delivery</span>
                      <span className="edit-stop-route__addr">{editingJob.deliveryAddress}</span>
                    </div>
                  </div>
                </div>
                <span className={pillClass(editingJob.status)}>{editingJob.status}</span>
              </div>
            )}

            <div className="edit-stop-body">
              {editingJob && editStopId && (
                <EditStopWorkflow
                  variant="panel"
                  status={editingJob.status}
                  pickupAddress={editingJob.pickupAddress}
                  deliveryAddress={editingJob.deliveryAddress}
                  pickupLat={editingJob.pickupLat}
                  pickupLng={editingJob.pickupLng}
                  deliveryLat={editingJob.deliveryLat}
                  deliveryLng={editingJob.deliveryLng}
                  load={getStopLoadState(
                    editStopId,
                    editingJob.deliveryOption,
                    loadStates,
                    editingJob.parcelCount,
                  )}
                  onStatus={(st) => void updateShipmentStatus(editStopId, st)}
                  onLoadOne={() =>
                    loadForShipment(editStopId, editingJob.deliveryOption, "one", editingJob.parcelCount)
                  }
                  onLoadAll={() =>
                    loadForShipment(editStopId, editingJob.deliveryOption, "all", editingJob.parcelCount)
                  }
                  onReactivate={(asInTransit) => reactivateStop(editStopId, asInTransit)}
                />
              )}

              <section className="edit-stop-section edit-stop-section--notes">
                <label className="edit-stop-label" htmlFor="edit-stop-notes">
                  Delivery notes
                  <span className="edit-stop-label-hint">Stored on this device only</span>
                </label>
                <textarea
                  id="edit-stop-notes"
                  className="edit-stop-notes"
                  value={editNoteDraft}
                  onChange={(e) => setEditNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="Access codes, safe place, customer instructions…"
                />
              </section>
            </div>

            <footer className="edit-stop-footer">
              <button type="button" className="edit-stop-btn edit-stop-btn--cancel" onClick={() => setEditStopId(null)}>
                Cancel
              </button>
              <button type="button" className="edit-stop-btn edit-stop-btn--save" onClick={saveEditStop}>
                Save notes
              </button>
            </footer>
          </div>
        </div>
      )}

      <EditRouteScreen
        open={showEditRoute}
        initial={routeSettings}
        locationOptions={locationOptions}
        onClose={() => setShowEditRoute(false)}
        onSave={(saved) => {
          const did = getDriverId();
          saveRouteSettings(did, saved);
          setRouteSettings(saved);
          setShowEditRoute(false);
          setNavMsg(`Route settings saved · ${saved.name}`);
          setFitToken((t) => t + 1);
        }}
      />
    </div>
  );
}
