import { canManageOrder, isOrderEditable } from "./lib/orderEditable";

export type ClientOrderRow = {
  orderId: string;
  shipmentId: string;
  status: string;
  eta: string | null;
  destination?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  deliveryOption?: string;
  driverId?: string | null;
  deliveryDate?: string | null;
  holdReason?: string | null;
  canEdit?: boolean;
  canHold?: boolean;
  canCancel?: boolean;
  canReleaseHold?: boolean;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
};

type Props = {
  orders: ClientOrderRow[];
  highlightShipmentId: string | null;
  editingShipmentId: string | null;
  onSelect: (shipmentId: string) => void;
  onEdit: (order: ClientOrderRow) => void;
};

function statusClass(status: string): string {
  const slug = status.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "default";
  return `orders-card-status orders-card-status--${slug}`;
}

function formatCardEta(eta: string | null): string {
  if (!eta) return "—";
  const d = new Date(eta);
  if (Number.isNaN(d.getTime())) return eta;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClientOrdersList({ orders, highlightShipmentId, editingShipmentId, onSelect, onEdit }: Props) {
  return (
    <div className="orders-list-shell">
      <div className="orders-table-wrap orders-view--desktop">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Shipment</th>
              <th>Collection</th>
              <th>Delivery</th>
              <th>Service</th>
              <th>Driver</th>
              <th>Status</th>
              <th>ETA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const editable = o.canEdit ?? isOrderEditable(o.status);
              const manageable = canManageOrder(o);
              return (
              <tr
                key={o.orderId}
                className={highlightShipmentId === o.shipmentId ? "order-row--highlight" : undefined}
                onClick={() => onSelect(o.shipmentId)}
              >
                <td>{o.orderId}</td>
                <td>{o.shipmentId}</td>
                <td>{o.pickupAddress ?? "—"}</td>
                <td>{o.deliveryAddress ?? o.destination ?? "—"}</td>
                <td>{o.deliveryOption ?? "—"}</td>
                <td>{o.driverId ?? "—"}</td>
                <td>{o.status}</td>
                <td>{o.eta ?? "—"}</td>
                <td className="orders-table-actions" onClick={(e) => e.stopPropagation()}>
                  {manageable ? (
                    <button type="button" className="orders-table-edit" onClick={() => onEdit(o)}>
                      {editable ? "Edit order" : "Manage"}
                    </button>
                  ) : (
                    <span className="orders-table-no-edit" title="No further changes online">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      <ul className="orders-card-list orders-view--mobile">
        {orders.map((o) => {
          const highlighted = highlightShipmentId === o.shipmentId;
          const editable = o.canEdit ?? isOrderEditable(o.status);
          const manageable = canManageOrder(o);
          const editing = editingShipmentId === o.shipmentId;
          return (
            <li key={o.orderId} id={`parcel-${o.shipmentId}`}>
              <article
                className={`orders-card${highlighted ? " orders-card--highlight" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(o.shipmentId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(o.shipmentId);
                  }
                }}
              >
                <header className="orders-card-head">
                  <div>
                    <strong className="orders-card-id">{o.shipmentId}</strong>
                    <span className="orders-card-sub">{o.orderId}</span>
                  </div>
                  <span className={statusClass(o.status)}>{o.status}</span>
                </header>
                <dl className="orders-card-dl">
                  <dt>Collection</dt>
                  <dd>{o.pickupAddress ?? "—"}</dd>
                  <dt>Delivery</dt>
                  <dd>{o.deliveryAddress ?? o.destination ?? "—"}</dd>
                  <dt>Service</dt>
                  <dd>{o.deliveryOption ?? "—"}</dd>
                  <dt>Driver</dt>
                  <dd>{o.driverId ?? "—"}</dd>
                  <dt>ETA</dt>
                  <dd className="orders-card-dd--eta">{formatCardEta(o.eta)}</dd>
                  {o.status === "On Hold" && o.holdReason && (
                    <>
                      <dt>Hold reason</dt>
                      <dd>{o.holdReason}</dd>
                    </>
                  )}
                </dl>
                <div className="orders-card-foot">
                  <p className="orders-card-hint">Tap to view tracking</p>
                  {manageable ? (
                    <button
                      type="button"
                      className="orders-card-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(o);
                      }}
                    >
                      {editing ? "Editing…" : editable ? "Edit order" : "Manage order"}
                    </button>
                  ) : (
                    <span className="orders-card-no-edit">No further changes online</span>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
