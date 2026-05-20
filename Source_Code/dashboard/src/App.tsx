import "leaflet/dist/leaflet.css";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from "react-leaflet";
import {
  apiGet,
  apiPost,
  login,
  logout,
  officeCancelShipment,
  officeHoldShipment,
  officeReleaseHold,
  officeRescheduleDelivery,
} from "./api";
import { fleetRasterTiles } from "./mapTiles";
import { AuthScreen } from "./components/AuthScreen";
import { LandingScreen } from "./components/LandingScreen";
import { OpsDispatchList } from "./OpsDispatchList";
import { ThemeToggle } from "./ThemeToggle";
import { useThemeMode } from "./useThemeMode";

type PublicView = "landing" | "auth";

type MapData = {
  drivers: { driverId: string; lat: number; lng: number }[];
  shipments: {
    shipmentId: string;
    status: string;
    lat: number;
    lng: number;
    destination?: string;
    pickupAddress?: string;
    deliveryAddress?: string;
    pickupLat?: number;
    pickupLng?: number;
    deliveryLat?: number;
    deliveryLng?: number;
    driverId?: string | null;
    deliveryDate?: string | null;
  }[];
};

type Events = {
  events: { shipmentId: string; status: string; ts: string | null; note: string | null }[];
};

type DriversMeta = {
  drivers: { driverId: string; displayName: string }[];
};

type DelayedAlerts = {
  alerts: {
    shipmentId: string;
    orderId: string;
    destination: string;
    eta: string | null;
    driverId: string | null;
    deliveryDate: string | null;
  }[];
};

type OpsShipment = {
  shipmentId: string;
  orderId: string;
  clientId: string;
  destination: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  status: string;
  eta: string | null;
  driverId: string | null;
  deliveryDate: string | null;
  deliveryOption: string;
  holdReason?: string | null;
  canHold?: boolean;
  canCancel?: boolean;
  canReleaseHold?: boolean;
};

const STATUS_OPTIONS = [
  "",
  "Created",
  "Assigned",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Delayed",
  "On Hold",
  "Cancelled",
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDeliveryDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function buildListQueryString(
  filterStatus: string,
  filterDriverId: string,
  filterDateFrom: string,
  filterDateTo: string,
  unassignedDispatch: boolean,
  notDeliveredDispatch: boolean,
) {
  const qs = new URLSearchParams();
  if (filterStatus) qs.set("status", filterStatus);
  if (filterDriverId) qs.set("driverId", filterDriverId);
  if (filterDateFrom) qs.set("deliveryDateFrom", filterDateFrom);
  if (filterDateTo) qs.set("deliveryDateTo", filterDateTo);
  if (unassignedDispatch) qs.set("unassigned", "true");
  if (notDeliveredDispatch) qs.set("notDelivered", "true");
  return qs.toString();
}

export default function App() {
  const themeMode = useThemeMode();
  const tiles = useMemo(() => fleetRasterTiles(themeMode), [themeMode]);
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("token"));
  const [publicView, setPublicView] = useState<PublicView>("landing");
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("demo");
  const [err, setErr] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [events, setEvents] = useState<Events["events"]>([]);
  const [alerts, setAlerts] = useState<DelayedAlerts["alerts"]>([]);
  const [driversMeta, setDriversMeta] = useState<DriversMeta["drivers"]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [lastRefreshMs, setLastRefreshMs] = useState<number | null>(null);
  const [opsShipments, setOpsShipments] = useState<OpsShipment[]>([]);
  const [unassignedDispatch, setUnassignedDispatch] = useState(false);
  const [notDeliveredDispatch, setNotDeliveredDispatch] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const [actionsBusy, setActionsBusy] = useState(false);
  const [markedShipmentId, setMarkedShipmentId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const t0 = performance.now();
    const qs = buildListQueryString(
      filterStatus,
      filterDriverId,
      filterDateFrom,
      filterDateTo,
      unassignedDispatch,
      notDeliveredDispatch,
    );
    const listPath = `/dashboard/shipments${qs ? `?${qs}` : ""}`;
    const mapPath = `/dashboard/map${qs ? `?${qs}` : ""}`;
    const [m, e, da, dr, opsList] = await Promise.all([
      apiGet<MapData>(mapPath),
      apiGet<Events>("/dashboard/recent-events?limit=15"),
      apiGet<DelayedAlerts>("/dashboard/alerts/delayed"),
      apiGet<DriversMeta>("/dashboard/drivers"),
      apiGet<{ shipments: OpsShipment[] }>(listPath),
    ]);
    setMapData(m);
    setEvents(e.events);
    setAlerts(da.alerts);
    setDriversMeta(dr.drivers);
    setOpsShipments(opsList.shipments);
    setLastRefreshMs(Math.round(performance.now() - t0));
  }, [filterStatus, filterDriverId, filterDateFrom, filterDateTo, unassignedDispatch, notDeliveredDispatch]);

  async function runShipmentAction(fn: () => Promise<unknown>, okMsg: string) {
    setActionsBusy(true);
    setDispatchMsg(null);
    try {
      await fn();
      setDispatchMsg(okMsg);
      await refresh();
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "Action failed";
      setDispatchMsg(msg);
      throw ex;
    } finally {
      setActionsBusy(false);
    }
  }

  async function assignToDriver(shipmentId: string) {
    const picked = assignPick[shipmentId] ?? "";
    setDispatchMsg(null);
    try {
      await apiPost(`/dashboard/shipments/${shipmentId}/assign`, { driverId: picked || "" });
      if (!picked) {
        setDispatchMsg(`Unassigned driver from ${shipmentId}`);
      } else {
        setDispatchMsg(`Assigned: ${shipmentId} \u2192 ${picked}`);
      }
      setAssignPick((prev) => {
        const next = { ...prev };
        delete next[shipmentId];
        return next;
      });
      await refresh();
    } catch (ex) {
      setDispatchMsg(ex instanceof Error ? ex.message : "Driver update failed");
    }
  }

  useEffect(() => {
    if (!authed) return;
    refresh();
    const id = window.setInterval(refresh, 4000);
    return () => window.clearInterval(id);
  }, [authed, refresh]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(user || "admin", pass || "demo");
      setAuthed(true);
    } catch {
      setErr("Invalid credentials. Use admin / demo");
    }
  }

  function handleLogout() {
    logout();
    setAuthed(false);
    setPublicView("landing");
    setOverview(null);
    setMapData(null);
    setEvents([]);
    setAlerts([]);
    setOpsShipments([]);
    setDispatchMsg(null);
    setErr(null);
  }

  const center: [number, number] = [51.508, -0.12];

  const dispatchShipments = useMemo(() => {
    if (!notDeliveredDispatch) return opsShipments;
    return opsShipments.filter((s) => s.status !== "Delivered");
  }, [opsShipments, notDeliveredDispatch]);

  const sidebarKpis = useMemo(() => {
    const rows = dispatchShipments;
    return {
      totalShipments: rows.length,
      inTransit: rows.filter((s) => s.status === "In Transit" || s.status === "Picked Up").length,
      delivered: rows.filter((s) => s.status === "Delivered").length,
      delayed: rows.filter((s) => s.status === "Delayed").length,
    };
  }, [dispatchShipments]);

  const { shownShipments, shownDrivers } = useMemo(() => {
    if (!mapData) return { shownShipments: [], shownDrivers: [] };
    const drivers = filterDriverId ? mapData.drivers.filter((d) => d.driverId === filterDriverId) : mapData.drivers;
    const shipments = notDeliveredDispatch
      ? mapData.shipments.filter((s) => s.status !== "Delivered")
      : mapData.shipments;
    return { shownShipments: shipments, shownDrivers: drivers };
  }, [mapData, filterDriverId, notDeliveredDispatch]);

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
        onLogin={handleLogin}
        onBackHome={() => setPublicView("landing")}
      />
    );
  }

  const activeFilterCount =
    [filterStatus, filterDriverId, filterDateFrom, filterDateTo].filter(Boolean).length +
    (unassignedDispatch ? 1 : 0) +
    (notDeliveredDispatch ? 1 : 0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-main">
          <div className="app-header-text">
            <h1>Logistics Office Dashboard · live overview</h1>
            {lastRefreshMs !== null && (
              <p className="sub">
                Data refresh (API round-trip): <strong>{lastRefreshMs} ms</strong> · map uses same payload (NFR timing)
              </p>
            )}
          </div>
          <div className="app-header-actions">
            <ThemeToggle />
            <button type="button" className="btn-header" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="layout layout-workspace">
        <div className="panel panel-sidebar">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>KPIs</h2>
          <div className="kpi-grid">
              <div className="kpi">
                <div className="label">Total</div>
                <div className="value">{sidebarKpis.totalShipments}</div>
              </div>
              <div className="kpi">
                <div className="label">In transit</div>
                <div className="value">{sidebarKpis.inTransit}</div>
              </div>
              <div className="kpi">
                <div className="label">Delivered</div>
                <div className="value">{sidebarKpis.delivered}</div>
              </div>
              <div className="kpi">
                <div className="label">Delayed</div>
                <div className="value">{sidebarKpis.delayed}</div>
              </div>
          </div>

          <div className="filters filters--pair">
            <div className="filter-field">
              <label htmlFor="st">Status</label>
              <select id="st" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s || "all"} value={s}>
                    {s || "All"}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label htmlFor="dr">Driver</label>
              <select id="dr" value={filterDriverId} onChange={(e) => setFilterDriverId(e.target.value)}>
                <option value="">All drivers</option>
                {driversMeta.map((d) => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.driverId} — {d.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="filters filters--dates">
            <span className="filter-section-label">Delivery window (optional)</span>
            <div className="filters filters--pair">
              <div className="filter-field">
                <label htmlFor="dtf">From</label>
                <input
                  id="dtf"
                  type="date"
                  className="filter-date-input"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="dtt">To</label>
                <input
                  id="dtt"
                  type="date"
                  className="filter-date-input"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="filter-date-actions">
              <button type="button" className="date-filter-btn" onClick={() => {
                const d = todayIsoDate();
                setFilterDateFrom(d);
                setFilterDateTo(d);
              }}>
                Today only
              </button>
              <button
                type="button"
                className="date-filter-btn date-filter-btn--alt"
                onClick={() => {
                  setFilterDateFrom("");
                  setFilterDateTo("");
                }}
              >
                Clear dates
              </button>
            </div>
          </div>
          <p className="filter-hint">
            {activeFilterCount
              ? `${activeFilterCount} filter(s) applied — map, list and dispatch rows use the same query.`
              : "No filters — full fleet on the map."}
          </p>

          <div className="delayed-panel">
            <h3 style={{ fontSize: "0.95rem", margin: "0.75rem 0 0.35rem" }}>Delayed alerts</h3>
            {alerts.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                No delayed shipments.
              </p>
            ) : (
              <ul className="alert-list">
                {alerts.map((a) => (
                  <li key={a.shipmentId}>
                    <strong>{a.shipmentId}</strong> · {a.destination}
                    <br />
                    <small>
                      Driver {a.driverId ?? "—"} · ETA {a.eta ?? "—"} · Date {a.deliveryDate ?? "—"}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sim-btns">
            <button type="button" onClick={() => apiPost("/simulation/gps/start?driverId=D101").then(refresh)}>
              Start GPS simulation (D101)
            </button>
            <button type="button" onClick={() => apiPost("/simulation/status/start").then(refresh)}>
              Start status simulation
            </button>
          </div>
          <h3 style={{ fontSize: "0.95rem", marginTop: "1rem" }}>Recent events</h3>
          <ul className="timeline">
            {events.map((ev) => (
              <li key={`${ev.shipmentId}-${ev.ts}-${ev.status}`}>
                <strong>{ev.shipmentId}</strong> {"\u2192"} {ev.status}{" "}
                <span className="timeline-ts">{ev.ts}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel panel-map">
          <div className="map-legend-strip">
            <strong>Legend:</strong> blue — driver GPS · orange — collection · blue — delivery (red if delayed) ·{" "}
            <strong style={{ color: "#7c3aed" }}>purple ring</strong> — marked shipment.
          </div>
          <div className="map-wrap">
            <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
              <ZoomControl position="topright" />
              <TileLayer key={themeMode} url={tiles.url} attribution={tiles.attribution} />
              {shownDrivers.map((d) => (
                <CircleMarker
                  key={d.driverId}
                  center={[d.lat, d.lng]}
                  radius={8}
                  pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.85 }}
                >
                  <Popup>Driver {d.driverId}</Popup>
                </CircleMarker>
              ))}
              {shownShipments.map((s) => {
                const focused = markedShipmentId === s.shipmentId;
                const onHold = s.status === "On Hold";
                const holdStroke = "#a16207";
                const holdFill = "#fcd34d";
                return (
                <Fragment key={s.shipmentId}>
                  <CircleMarker
                    key={`${s.shipmentId}-pickup`}
                    center={[s.pickupLat ?? s.lat, s.pickupLng ?? s.lng]}
                    radius={focused ? 9 : 6}
                    pathOptions={{
                      color: focused ? "#7c3aed" : onHold ? holdStroke : "#d97706",
                      fillColor: focused ? "#c4b5fd" : onHold ? holdFill : "#fbbf24",
                      fillOpacity: 0.9,
                      weight: focused ? 3 : onHold ? 2 : 1,
                    }}
                  >
                    <Popup>
                      <strong>{s.shipmentId}</strong> · Collection{onHold ? " · On hold" : ""}
                      <br />
                      <small>{s.pickupAddress ?? "—"}</small>
                    </Popup>
                  </CircleMarker>
                  <CircleMarker
                    key={`${s.shipmentId}-delivery`}
                    center={[s.deliveryLat ?? s.lat, s.deliveryLng ?? s.lng]}
                    radius={focused ? 10 : 7}
                    pathOptions={{
                      color: focused ? "#7c3aed" : onHold ? holdStroke : s.status === "Delayed" ? "#b91c1c" : "#1d4ed8",
                      fillColor: focused ? "#a78bfa" : onHold ? holdFill : s.status === "Delayed" ? "#ef4444" : "#3b82f6",
                      fillOpacity: 0.9,
                      weight: focused ? 3 : onHold ? 2 : 1,
                    }}
                  >
                    <Popup>
                      <strong>{s.shipmentId}</strong> · {s.status}
                      <br />
                      <small>{s.deliveryAddress ?? s.destination ?? ""}</small>
                      <br />
                      <small>
                        Driver {s.driverId ?? "—"} · Date {s.deliveryDate ?? "—"}
                      </small>
                    </Popup>
                  </CircleMarker>
                </Fragment>
              );
              })}
            </MapContainer>
          </div>
        </div>
      </div>

      <section className="panel dispatch-panel">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Operations — assign shipments to drivers</h2>
        <p className="intro-muted">
          Client bookings arrive as <strong>Created</strong> without a driver. Choose a driver and confirm; re-assignment overrides
          the previous carrier unless the shipment is already <strong>Delivered</strong>. Click <strong>☆</strong> or a row to mark a
          shipment for focus (highlighted on the map).
        </p>
        {markedShipmentId && (
          <p className="ops-marked-banner">
            Focused shipment: <strong>{markedShipmentId}</strong>
            <button type="button" className="ops-marked-clear" onClick={() => setMarkedShipmentId(null)}>
              Clear mark
            </button>
          </p>
        )}
        <div className="dispatch-filter-toggles">
          <label className="dispatch-filter-toggle">
            <input
              type="checkbox"
              checked={unassignedDispatch}
              onChange={(e) => setUnassignedDispatch(e.target.checked)}
            />
            Unassigned shipments only
          </label>
          <label className="dispatch-filter-toggle">
            <input
              type="checkbox"
              checked={notDeliveredDispatch}
              onChange={(e) => setNotDeliveredDispatch(e.target.checked)}
            />
            Not delivered only
          </label>
        </div>
        {dispatchMsg && <p className="dispatch-msg">{dispatchMsg}</p>}
        <OpsDispatchList
          shipments={dispatchShipments}
          driversMeta={driversMeta}
          assignPick={assignPick}
          onAssignPickChange={(shipmentId, driverId) =>
            setAssignPick((p) => ({ ...p, [shipmentId]: driverId }))
          }
          onAssign={assignToDriver}
          formatDeliveryDate={formatDeliveryDate}
          actionsBusy={actionsBusy}
          onHold={(id, reason) => runShipmentAction(() => officeHoldShipment(id, reason), `On hold: ${id}`)}
          onReleaseHold={(id) => runShipmentAction(() => officeReleaseHold(id), `Hold released: ${id}`)}
          onCancel={(id, reason) => runShipmentAction(() => officeCancelShipment(id, reason), `Cancelled: ${id}`)}
          onReschedule={(id, date) =>
            runShipmentAction(() => officeRescheduleDelivery(id, date), `Delivery date updated: ${id}`)
          }
          markedShipmentId={markedShipmentId}
          onMarkShipment={setMarkedShipmentId}
        />
      </section>
      <p className="app-footer-note">CMP600 prototype · simulated data</p>
    </div>
  );
}
