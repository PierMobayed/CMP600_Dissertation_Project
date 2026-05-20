import { useEffect } from "react";
import {
  OpsDeliveryDateCell,
  OpsDriverCell,
  OpsNoteActionsCell,
  type OpsShipmentActionsRow,
} from "./OpsShipmentActions";

export type OpsShipmentRow = OpsShipmentActionsRow & {
  orderId: string;
  clientId: string;
  destination: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  driverId: string | null;
  deliveryOption: string;
};

type DriverMeta = { driverId: string; displayName: string };

type Props = {
  shipments: OpsShipmentRow[];
  driversMeta: DriverMeta[];
  assignPick: Record<string, string>;
  onAssignPickChange: (shipmentId: string, driverId: string) => void;
  onAssign: (shipmentId: string) => void;
  formatDeliveryDate: (iso: string | null | undefined) => string;
  actionsBusy?: boolean;
  onHold: (shipmentId: string, reason: string) => Promise<void>;
  onReleaseHold: (shipmentId: string) => Promise<void>;
  onCancel: (shipmentId: string, reason: string) => Promise<void>;
  onReschedule: (shipmentId: string, deliveryDate: string) => Promise<void>;
  markedShipmentId: string | null;
  onMarkShipment: (shipmentId: string | null) => void;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, input, select, textarea, a, label"));
}

function statusClass(status: string): string {
  const slug = status.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "default";
  return `ops-card-status ops-card-status--${slug}`;
}

type RowHandlers = {
  driversMeta: DriverMeta[];
  assignPick: Record<string, string>;
  onAssignPickChange: (shipmentId: string, driverId: string) => void;
  onAssign: (shipmentId: string) => void;
  actionsBusy?: boolean;
  onHold: (shipmentId: string, reason: string) => Promise<void>;
  onReleaseHold: (shipmentId: string) => Promise<void>;
  onCancel: (shipmentId: string, reason: string) => Promise<void>;
  onReschedule: (shipmentId: string, deliveryDate: string) => Promise<void>;
};

function actionRow(s: OpsShipmentRow, h: RowHandlers): OpsShipmentActionsRow {
  return {
    shipmentId: s.shipmentId,
    status: s.status,
    deliveryDate: s.deliveryDate,
    driverId: s.driverId,
    holdReason: s.holdReason,
    canHold: s.canHold,
    canCancel: s.canCancel,
    canReleaseHold: s.canReleaseHold,
  };
}

export function OpsDispatchList({
  shipments,
  driversMeta,
  assignPick,
  onAssignPickChange,
  onAssign,
  formatDeliveryDate,
  actionsBusy,
  onHold,
  onReleaseHold,
  onCancel,
  onReschedule,
  markedShipmentId,
  onMarkShipment,
}: Props) {
  useEffect(() => {
    if (!markedShipmentId) return;
    document.getElementById(`ops-row-${markedShipmentId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [markedShipmentId]);

  const handlers: RowHandlers = {
    driversMeta,
    assignPick,
    onAssignPickChange,
    onAssign,
    actionsBusy,
    onHold,
    onReleaseHold,
    onCancel,
    onReschedule,
  };

  return (
    <>
      <div className="ops-table-wrap ops-view--desktop">
        <table className="ops-table">
          <thead>
            <tr>
              <th className="ops-mark-col" aria-label="Mark">
                ★
              </th>
              <th>Shipment</th>
              <th>Order</th>
              <th>Client</th>
              <th>Collection</th>
              <th>Delivery</th>
              <th>Service</th>
              <th>Status</th>
              <th>Driver</th>
              <th>Delivery date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => {
              const row = actionRow(s, handlers);
              const marked = markedShipmentId === s.shipmentId;
              return (
                <tr
                  key={s.shipmentId}
                  id={`ops-row-${s.shipmentId}`}
                  className={marked ? "ops-table-row--marked" : undefined}
                  onClick={(e) => {
                    if (isInteractiveTarget(e.target)) return;
                    onMarkShipment(marked ? null : s.shipmentId);
                  }}
                >
                  <td className="ops-mark-col">
                    <button
                      type="button"
                      className={marked ? "ops-mark-btn ops-mark-btn--active" : "ops-mark-btn"}
                      title={marked ? "Clear mark" : "Mark for focus"}
                      aria-pressed={marked}
                      aria-label={marked ? `Clear mark on ${s.shipmentId}` : `Mark ${s.shipmentId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkShipment(marked ? null : s.shipmentId);
                      }}
                    >
                      {marked ? "★" : "☆"}
                    </button>
                  </td>
                  <td className="ops-shipment-id-cell">{s.shipmentId}</td>
                  <td>{s.orderId}</td>
                  <td>{s.clientId}</td>
                  <td>
                    {s.pickupAddress ?? "—"}
                    {s.status === "On Hold" && <span className="ops-leg-tag ops-leg-tag--hold">On hold</span>}
                  </td>
                  <td>
                    {s.deliveryAddress ?? s.destination}
                    {s.status === "On Hold" && <span className="ops-leg-tag ops-leg-tag--hold">On hold</span>}
                  </td>
                  <td>{s.deliveryOption}</td>
                  <td>{s.status}</td>
                  <td className="ops-table-cell-controls">
                    <OpsDriverCell key={`${s.shipmentId}-driver`} row={row} disabled={actionsBusy} {...handlers} />
                  </td>
                  <td className="ops-table-cell-controls">
                    <OpsDeliveryDateCell key={`${s.shipmentId}-date`} row={row} disabled={actionsBusy} onReschedule={onReschedule} />
                  </td>
                  <td className="ops-table-cell-controls">
                    <OpsNoteActionsCell
                      key={`${s.shipmentId}-actions`}
                      row={row}
                      disabled={actionsBusy}
                      onHold={onHold}
                      onReleaseHold={onReleaseHold}
                      onCancel={onCancel}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="ops-card-list ops-view--mobile">
        {shipments.map((s) => {
          const row = actionRow(s, handlers);
          const marked = markedShipmentId === s.shipmentId;
          return (
            <li key={s.shipmentId} id={`ops-row-${s.shipmentId}`}>
              <article className={marked ? "ops-card ops-card--marked" : "ops-card"}>
                <header className="ops-card-head">
                  <div>
                    <button
                      type="button"
                      className={marked ? "ops-mark-btn ops-mark-btn--active" : "ops-mark-btn"}
                      aria-pressed={marked}
                      onClick={() => onMarkShipment(marked ? null : s.shipmentId)}
                    >
                      {marked ? "★" : "☆"}
                    </button>
                    <strong className="ops-card-id">{s.shipmentId}</strong>
                    <span className="ops-card-sub">
                      {s.orderId} · {s.clientId}
                    </span>
                  </div>
                  <span className={statusClass(s.status)}>{s.status}</span>
                </header>
                <dl className="ops-card-dl">
                  <dt>Collection</dt>
                  <dd>
                    {s.pickupAddress ?? "—"}
                    {s.status === "On Hold" && <span className="ops-leg-tag ops-leg-tag--hold">On hold</span>}
                  </dd>
                  <dt>Delivery</dt>
                  <dd>
                    {s.deliveryAddress ?? s.destination}
                    {s.status === "On Hold" && <span className="ops-leg-tag ops-leg-tag--hold">On hold</span>}
                  </dd>
                  <dt>Service</dt>
                  <dd>{s.deliveryOption}</dd>
                </dl>
                <div className="ops-card-controls">
                  <div className="ops-card-control">
                    <span className="ops-card-control-label">Driver</span>
                    <OpsDriverCell row={row} disabled={actionsBusy} {...handlers} />
                  </div>
                  <div className="ops-card-control">
                    <span className="ops-card-control-label">Delivery date</span>
                    <OpsDeliveryDateCell row={row} disabled={actionsBusy} onReschedule={onReschedule} />
                  </div>
                  <div className="ops-card-control">
                    <span className="ops-card-control-label">Actions</span>
                    <OpsNoteActionsCell row={row} disabled={actionsBusy} onHold={onHold} onReleaseHold={onReleaseHold} onCancel={onCancel} />
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}

