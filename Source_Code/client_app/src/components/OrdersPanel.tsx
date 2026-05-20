import { useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from "react-leaflet";
import { normalizeTrackQuery, findTrackMatches } from "../lib/trackSearch";
import { ClientOrdersList, type ClientOrderRow } from "../ClientOrdersList";
import { EditOrderPanel } from "./EditOrderPanel";
import type { DeliveryOptionMeta } from "../api";
import { canManageOrder, isOrderEditable } from "../lib/orderEditable";
import { TrackSearchBar } from "./TrackSearchBar";

type OrderRow = ClientOrderRow;

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

type Props = {
  orders: OrderRow[];
  highlightShipmentId: string | null;
  selected: string | null;
  editingOrder: OrderRow | null;
  deliveryOpts: DeliveryOptionMeta[];
  editBusy: boolean;
  track: Tracking | null;
  tiles: { url: string; attribution: string };
  themeMode: string;
  onSelect: (shipmentId: string) => void;
  onEditOrder: (order: OrderRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: (payload: {
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    destination: string;
    dest_lat: number;
    dest_lng: number;
    delivery_date: string;
  }) => Promise<void>;
  onHold: (reason: string) => Promise<void>;
  onReleaseHold: () => Promise<void>;
  onCancelDelivery: (reason: string) => Promise<void>;
};

export function OrdersPanel({
  orders,
  highlightShipmentId,
  selected,
  editingOrder,
  deliveryOpts,
  editBusy,
  track,
  tiles,
  themeMode,
  onSelect,
  onEditOrder,
  onCancelEdit,
  onSaveEdit,
  onHold,
  onReleaseHold,
  onCancelDelivery,
}: Props) {
  const [trackQuery, setTrackQuery] = useState(selected ?? "");

  const listOrders = useMemo(() => {
    const q = normalizeTrackQuery(trackQuery);
    if (!q) return orders;
    const matches = findTrackMatches(orders, trackQuery);
    return matches.length > 0 ? matches : orders;
  }, [orders, trackQuery]);

  const isFiltered = normalizeTrackQuery(trackQuery).length > 0 && findTrackMatches(orders, trackQuery).length > 0;

  const selectedOrder = useMemo(
    () => (selected ? orders.find((o) => o.shipmentId === selected) : undefined),
    [orders, selected],
  );
  const selectedEditable =
    selectedOrder != null && (selectedOrder.canEdit ?? isOrderEditable(selectedOrder.status));
  const selectedManageable = selectedOrder != null && canManageOrder(selectedOrder);

  function handleTrack(shipmentId: string) {
    onSelect(shipmentId);
    window.setTimeout(() => {
      document.getElementById(`tracking-panel-${shipmentId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  return (
    <>
      <div className="card client-card">
        <TrackSearchBar
          orders={orders}
          selected={selected}
          onTrack={handleTrack}
          query={trackQuery}
          onQueryChange={setTrackQuery}
        />
        <h2 className="client-card-title">Your parcels</h2>
        <p className="book-panel-lead">
          {isFiltered
            ? `Showing ${listOrders.length} matching parcel${listOrders.length === 1 ? "" : "s"}. Tap for live tracking.`
            : "All bookings for your account. Tap a parcel for live tracking."}
        </p>
        <ClientOrdersList
          orders={listOrders}
          highlightShipmentId={highlightShipmentId ?? selected}
          editingShipmentId={editingOrder?.shipmentId ?? null}
          onSelect={onSelect}
          onEdit={onEditOrder}
        />
      </div>
      {editingOrder && editingOrder.shipmentId === selected && (
        <div className="card client-card edit-order-card">
          <EditOrderPanel
            order={editingOrder}
            deliveryOpts={deliveryOpts}
            busy={editBusy}
            onCancel={onCancelEdit}
            onSave={onSaveEdit}
            onHold={onHold}
            onReleaseHold={onReleaseHold}
            onCancelDelivery={onCancelDelivery}
          />
        </div>
      )}
      {selected && !editingOrder && (
        <div className="card client-card" id={`tracking-panel-${selected}`}>
          <div className="tracking-panel-head">
            <h2 className="client-card-title">Tracking · {selected}</h2>
            {selectedManageable && selectedOrder && (
              <button type="button" className="client-btn client-btn--primary tracking-edit-btn" onClick={() => onEditOrder(selectedOrder)}>
                {selectedEditable ? "Edit order" : "Manage order"}
              </button>
            )}
          </div>
          {selectedOrder && !selectedManageable && (
            <p className="tracking-edit-hint">
              This parcel is <strong>{selectedOrder.status}</strong> — changes are only available before collection or while on hold.
            </p>
          )}
          {track && (
            <>
              <div className="track-facts">
                <p>
                  <strong>Status:</strong> {track.status}
                  {track.phase === "pending" ? " · awaiting driver assignment" : ""}
                  {track.phase === "pickup" ? " · driver heading to collect" : ""}
                  {track.phase === "delivery" ? " · driver heading to deliver" : ""}
                </p>
                <p>
                  <strong>Collection:</strong> {track.pickupAddress ?? "—"}
                </p>
                <p>
                  <strong>Delivery:</strong> {track.deliveryAddress ?? "—"}
                </p>
                <p>
                  <strong>ETA:</strong> {track.eta ?? "—"}
                </p>
              </div>
              <div className="map-wrap">
                <MapContainer
                  center={[
                    (track.targetLocation ?? track.currentLocation).lat,
                    (track.targetLocation ?? track.currentLocation).lng,
                  ]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <ZoomControl position="topright" />
                  <TileLayer key={themeMode} url={tiles.url} attribution={tiles.attribution} />
                  {track.pickupLocation && (
                    <CircleMarker
                      center={[track.pickupLocation.lat, track.pickupLocation.lng]}
                      radius={8}
                      pathOptions={{ color: "#d97706", fillColor: "#fbbf24", fillOpacity: 0.85 }}
                    >
                      <Popup>Collection</Popup>
                    </CircleMarker>
                  )}
                  {track.deliveryLocation && (
                    <CircleMarker
                      center={[track.deliveryLocation.lat, track.deliveryLocation.lng]}
                      radius={8}
                      pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.85 }}
                    >
                      <Popup>Delivery</Popup>
                    </CircleMarker>
                  )}
                  {track.status !== "Created" && (
                    <CircleMarker
                      center={[track.currentLocation.lat, track.currentLocation.lng]}
                      radius={10}
                      pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9 }}
                    >
                      <Popup>Driver / parcel position</Popup>
                    </CircleMarker>
                  )}
                </MapContainer>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
