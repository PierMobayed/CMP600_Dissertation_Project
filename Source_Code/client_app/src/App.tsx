import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { fleetRasterTiles } from "./mapTiles";
import { useThemeMode } from "./useThemeMode";
import {
  apiGet,
  createClientShipment,
  updateClientShipment,
  holdClientShipment,
  releaseHoldClientShipment,
  cancelClientShipment,
  getDeliveryOptionsPublic,
  getClientId,
  login,
  logout,
  register,
  type DeliveryOptionMeta,
} from "./api";
import { AuthScreen } from "./components/AuthScreen";
import { BookParcelFlow, type OrderDraft } from "./components/BookParcelFlow";
import { LandingScreen } from "./components/LandingScreen";
import { OrdersPanel } from "./components/OrdersPanel";
import { PublicBookPage } from "./components/PublicBookPage";
import type { ClientOrderRow } from "./ClientOrdersList";
import { ThemeToggle } from "./ThemeToggle";

type Orders = {
  clientId: string;
  orders: {
    orderId: string;
    shipmentId: string;
    status: string;
    eta: string | null;
    destination?: string;
    pickupAddress?: string;
    deliveryAddress?: string;
    phase?: string;
    parcelCount?: number;
    deliveryOption?: string;
    driverId?: string | null;
    deliveryDate?: string | null;
    canEdit?: boolean;
    canHold?: boolean;
    canCancel?: boolean;
    canReleaseHold?: boolean;
    holdReason?: string | null;
    pickupLat?: number;
    pickupLng?: number;
    deliveryLat?: number;
    deliveryLng?: number;
  }[];
};

type Tracking = {
  shipmentId: string;
  status: string;
  phase?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  targetLocation?: { lat: number; lng: number };
  pickupLocation?: { lat: number; lng: number };
  deliveryLocation?: { lat: number; lng: number };
  currentLocation: { lat: number; lng: number };
  eta: string | null;
};

type ClientView = "book" | "orders";
type PublicView = "landing" | "auth" | "book";

export default function App() {
  const themeMode = useThemeMode();
  const tiles = useMemo(() => fleetRasterTiles(themeMode), [themeMode]);
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("token"));
  const [publicView, setPublicView] = useState<PublicView>("landing");
  const [publicBookSession, setPublicBookSession] = useState(false);
  const [clientView, setClientView] = useState<ClientView>("book");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState("client1");
  const [pass, setPass] = useState("demo");
  const [displayName, setDisplayName] = useState("");
  const [orders, setOrders] = useState<Orders | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [track, setTrack] = useState<Tracking | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deliveryOpts, setDeliveryOpts] = useState<DeliveryOptionMeta[]>([]);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [highlightShipmentId, setHighlightShipmentId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<ClientOrderRow | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  function reloadOrders() {
    const cid = getClientId();
    return apiGet<Orders>(`/clients/${cid}/orders`).then(setOrders);
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(user, pass);
      setAuthed(true);
    } catch {
      setErr("Use client1 / demo");
    }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await register(user.trim(), pass, displayName.trim());
      setAuthed(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Registration failed");
    }
  }

  useEffect(() => {
    if (!authed) {
      getDeliveryOptionsPublic().then(setDeliveryOpts).catch(() => {});
      return;
    }
    reloadOrders().catch(() => setErr("Failed to load orders"));
    getDeliveryOptionsPublic().then(setDeliveryOpts).catch(() => {});
  }, [authed]);


  useEffect(() => {
    if (!highlightShipmentId) return undefined;
    const id = window.setTimeout(() => setHighlightShipmentId(null), 8000);
    return () => window.clearTimeout(id);
  }, [highlightShipmentId]);

  async function handleBook(draft: OrderDraft, paymentRef: string) {
    setErr(null);
    setSubmitBusy(true);
    try {
      const cid = getClientId();
      const payload: Record<string, unknown> = {
        pickup_address: draft.pickupAddress,
        destination: draft.destination,
        delivery_option: draft.deliveryOption,
        delivery_date: draft.deliveryDate,
      };
      if (draft.pickupLat !== undefined) payload.pickup_lat = draft.pickupLat;
      if (draft.pickupLng !== undefined) payload.pickup_lng = draft.pickupLng;
      if (draft.destLat !== undefined) payload.dest_lat = draft.destLat;
      if (draft.destLng !== undefined) payload.dest_lng = draft.destLng;

      const created = await createClientShipment(cid, payload);
      setCreateSuccess(
        `Payment ${paymentRef} accepted (simulated). Shipment ${created.shipmentId} booked for ${draft.deliveryDate}. The office will assign a driver.`,
      );
      setHighlightShipmentId(created.shipmentId);
      setSelected(created.shipmentId);
      setClientView("orders");
      setPublicBookSession(false);
      setPublicView("landing");
      await reloadOrders();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not create shipment");
      throw e2;
    } finally {
      setSubmitBusy(false);
    }
  }

  async function handleSaveEdit(payload: {
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    destination: string;
    dest_lat: number;
    dest_lng: number;
    delivery_date: string;
  }) {
    if (!editingOrder) return;
    setEditBusy(true);
    setErr(null);
    try {
      const cid = getClientId();
      await updateClientShipment(cid, editingOrder.shipmentId, payload);
      setCreateSuccess(`Order ${editingOrder.shipmentId} updated — office and driver will see the new details.`);
      setEditingOrder(null);
      await reloadOrders();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not update order");
      throw e2;
    } finally {
      setEditBusy(false);
    }
  }

  async function refreshEditingOrder() {
    const cid = getClientId();
    const data = await apiGet<Orders>(`/clients/${cid}/orders`);
    setOrders(data);
    if (editingOrder) {
      const fresh = data.orders.find((o) => o.shipmentId === editingOrder.shipmentId);
      if (fresh) setEditingOrder(fresh);
      else setEditingOrder(null);
    }
  }

  async function handleHold(reason: string) {
    if (!editingOrder) return;
    setEditBusy(true);
    setErr(null);
    try {
      const cid = getClientId();
      await holdClientShipment(cid, editingOrder.shipmentId, reason);
      setCreateSuccess(`Order ${editingOrder.shipmentId} placed on hold.`);
      await refreshEditingOrder();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not place on hold");
      throw e2;
    } finally {
      setEditBusy(false);
    }
  }

  async function handleReleaseHold() {
    if (!editingOrder) return;
    setEditBusy(true);
    setErr(null);
    try {
      const cid = getClientId();
      await releaseHoldClientShipment(cid, editingOrder.shipmentId);
      setCreateSuccess(`Hold released for ${editingOrder.shipmentId}.`);
      await refreshEditingOrder();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not release hold");
      throw e2;
    } finally {
      setEditBusy(false);
    }
  }

  async function handleCancelDelivery(reason: string) {
    if (!editingOrder) return;
    setEditBusy(true);
    setErr(null);
    try {
      const cid = getClientId();
      await cancelClientShipment(cid, editingOrder.shipmentId, reason);
      setCreateSuccess(`Delivery ${editingOrder.shipmentId} cancelled.`);
      setEditingOrder(null);
      await reloadOrders();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not cancel delivery");
      throw e2;
    } finally {
      setEditBusy(false);
    }
  }

  useEffect(() => {
    if (!selected) {
      setTrack(null);
      setEditingOrder(null);
      return;
    }
    const load = () =>
      apiGet<Tracking>(`/shipments/${selected}/tracking`).then(setTrack).catch(() => {});
    load();
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [selected]);

  if (publicBookSession && publicView === "book") {
    return (
      <PublicBookPage
        deliveryOpts={deliveryOpts}
        busy={submitBusy}
        authed={authed}
        clientId={authed ? getClientId() : null}
        mode={mode}
        onModeChange={setMode}
        user={user}
        pass={pass}
        displayName={displayName}
        onUserChange={setUser}
        onPassChange={setPass}
        onDisplayNameChange={setDisplayName}
        authError={err}
        onLogin={doLogin}
        onRegister={doRegister}
        onSubmit={handleBook}
        onBackHome={() => {
          setErr(null);
          setPublicBookSession(false);
          setPublicView("landing");
        }}
        onOpenLogin={() => {
          setErr(null);
          setPublicView("auth");
        }}
      />
    );
  }

  if (!authed) {
    if (publicView === "book") {
      return (
        <PublicBookPage
          deliveryOpts={deliveryOpts}
          busy={submitBusy}
          authed={false}
          clientId={null}
          mode={mode}
          onModeChange={setMode}
          user={user}
          pass={pass}
          displayName={displayName}
          onUserChange={setUser}
          onPassChange={setPass}
          onDisplayNameChange={setDisplayName}
          authError={err}
          onLogin={doLogin}
          onRegister={doRegister}
          onSubmit={handleBook}
          onBackHome={() => {
            setErr(null);
            setPublicView("landing");
          }}
          onOpenLogin={() => {
            setErr(null);
            setPublicView("auth");
          }}
        />
      );
    }
    if (publicView === "auth") {
      return (
        <AuthScreen
          mode={mode}
          onModeChange={setMode}
          user={user}
          pass={pass}
          displayName={displayName}
          onUserChange={setUser}
          onPassChange={setPass}
          onDisplayNameChange={setDisplayName}
          error={err}
          onLogin={doLogin}
          onRegister={doRegister}
          onBackHome={() => {
            setErr(null);
            setPublicView("landing");
          }}
          onStartBook={() => {
            setErr(null);
            setPublicBookSession(true);
            setPublicView("book");
          }}
        />
      );
    }
    return (
      <LandingScreen
        onStartBook={() => {
          setErr(null);
          setPublicBookSession(true);
          setPublicView("book");
        }}
        onLogin={() => {
          setErr(null);
          setPublicView("auth");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="client-brand client-brand--header">
            <span className="client-brand-mark" aria-hidden>
              ▣
            </span>
            Door2Door
          </span>
          <p className="client-header-sub">Client · {orders?.clientId}</p>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <button
            type="button"
            className="btn-logout"
            onClick={() => {
              logout();
              setAuthed(false);
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <nav className="client-nav" aria-label="Main">
        <button
          type="button"
          className={clientView === "book" ? "client-nav-btn client-nav-btn--active" : "client-nav-btn"}
          onClick={() => setClientView("book")}
        >
          Send
        </button>
        <button
          type="button"
          className={clientView === "orders" ? "client-nav-btn client-nav-btn--active" : "client-nav-btn"}
          onClick={() => setClientView("orders")}
        >
          Track
        </button>
      </nav>

      <main>
        {err && <p className="client-alert client-alert--error">{err}</p>}
        {createSuccess && !err && <p className="create-success-banner">{createSuccess}</p>}

        {clientView === "book" && (
          <>
            <section className="rm-hero" aria-labelledby="send-hero-title">
              <h1 id="send-hero-title">Send a parcel</h1>
              <p>Book collection and delivery in a few steps — pay securely (simulated).</p>
            </section>
            <div className="rm-trust-bar">
              <span className="rm-trust-item">Door-to-door collection</span>
              <span className="rm-trust-item">Next-day from £14.99</span>
              <span className="rm-trust-item">Office assigns your driver</span>
            </div>
            <div className="card client-card">
              <BookParcelFlow deliveryOpts={deliveryOpts} busy={submitBusy} onSubmit={handleBook} />
            </div>
          </>
        )}

        {clientView === "orders" && orders && (
          <OrdersPanel
            orders={orders.orders}
            highlightShipmentId={highlightShipmentId}
            selected={selected}
            editingOrder={editingOrder}
            deliveryOpts={deliveryOpts}
            editBusy={editBusy}
            track={track}
            tiles={tiles}
            themeMode={themeMode}
            onSelect={(id) => {
              setSelected(id);
              setEditingOrder(null);
            }}
            onEditOrder={(order) => {
              setSelected(order.shipmentId);
              setEditingOrder(order);
            }}
            onCancelEdit={() => setEditingOrder(null)}
            onSaveEdit={handleSaveEdit}
            onHold={handleHold}
            onReleaseHold={handleReleaseHold}
            onCancelDelivery={handleCancelDelivery}
          />
        )}
      </main>
      <p className="app-footer-note">CMP600 prototype · simulated data</p>
    </div>
  );
}
