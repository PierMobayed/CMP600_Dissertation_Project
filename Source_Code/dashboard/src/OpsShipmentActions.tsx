import { useEffect, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { clampDeliveryDate, maxDeliveryDate, minForwardDeliveryDate } from "./lib/deliveryDate";

export type OpsShipmentActionsRow = {
  shipmentId: string;
  status: string;
  deliveryDate: string | null;
  driverId?: string | null;
  holdReason?: string | null;
  canHold?: boolean;
  canCancel?: boolean;
  canReleaseHold?: boolean;
};

type DriverMeta = { driverId: string; displayName: string };

type BaseProps = {
  row: OpsShipmentActionsRow;
  disabled?: boolean;
};

type DriverProps = BaseProps & {
  driversMeta: DriverMeta[];
  assignPick: Record<string, string>;
  onAssignPickChange: (shipmentId: string, driverId: string) => void;
  onAssign: (shipmentId: string) => void;
};

type DateProps = BaseProps & {
  onReschedule: (shipmentId: string, deliveryDate: string) => Promise<void>;
};

type NoteProps = BaseProps & {
  onHold: (shipmentId: string, reason: string) => Promise<void>;
  onReleaseHold: (shipmentId: string) => Promise<void>;
  onCancel: (shipmentId: string, reason: string) => Promise<void>;
};

const HOLD_DEFAULT = "Not ready for delivery";

function canAssignDriver(status: string): boolean {
  return status !== "Delivered" && status !== "Cancelled" && status !== "On Hold";
}

export function OpsDriverCell({ row, disabled, driversMeta, assignPick, onAssignPickChange, onAssign }: DriverProps) {
  if (!canAssignDriver(row.status)) {
    return <span className="ops-cell-muted">{row.driverId ?? "—"}</span>;
  }

  const current = row.driverId ?? "";
  const selected = assignPick[row.shipmentId] ?? current;
  const wantsUnassign = selected === "" && Boolean(current);
  const wantsAssign = selected !== "" && selected !== current;
  const canApply = wantsUnassign || wantsAssign;

  return (
    <div className="ops-cell-inline">
      <select
        className="ops-cell-select"
        value={selected}
        disabled={disabled}
        aria-label={`Driver for ${row.shipmentId}`}
        onChange={(e) => onAssignPickChange(row.shipmentId, e.target.value)}
      >
        <option value="">—</option>
        {driversMeta.map((d) => (
          <option key={d.driverId} value={d.driverId}>
            {d.driverId}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={wantsUnassign ? "ops-btn ops-btn--secondary" : "ops-btn ops-btn--accent"}
        disabled={disabled || !canApply}
        onClick={() => onAssign(row.shipmentId)}
      >
        {wantsUnassign ? "Unassign" : "Assign"}
      </button>
    </div>
  );
}

export function OpsDeliveryDateCell({ row, disabled, onReschedule }: DateProps) {
  const [deliveryDate, setDeliveryDate] = useState(() => clampDeliveryDate(row.deliveryDate));
  const [err, setErr] = useState<string | null>(null);
  const minDate = minForwardDeliveryDate(row.deliveryDate);
  const maxDate = maxDeliveryDate();
  const canEdit = row.status !== "Delivered" && row.status !== "Cancelled" && row.status !== "On Hold";

  useEffect(() => {
    setDeliveryDate(clampDeliveryDate(row.deliveryDate));
  }, [row.deliveryDate]);

  if (!canEdit) {
    return <span>{row.deliveryDate ?? "—"}</span>;
  }

  async function save() {
    if (!deliveryDate || deliveryDate < minDate || deliveryDate > maxDate) return;
    setErr(null);
    try {
      await onReschedule(row.shipmentId, deliveryDate);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not update date");
    }
  }

  return (
    <div className="ops-cell-stack">
      <div className="ops-cell-inline">
        <input
          type="date"
          className="ops-cell-input"
          value={deliveryDate}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
        <button
          type="button"
          className="ops-btn ops-btn--secondary"
          disabled={disabled || !deliveryDate || deliveryDate < minDate || deliveryDate > maxDate}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>
      {err && <span className="ops-cell-err">{err}</span>}
    </div>
  );
}

export function OpsNoteActionsCell({ row, disabled, onHold, onReleaseHold, onCancel }: NoteProps) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const canHold =
    row.canHold ?? (row.status === "Created" || row.status === "Assigned" || row.status === "Delayed");
  const showActions = canHold || row.canCancel || row.canReleaseHold;

  if (!showActions) {
    return <span className="ops-cell-muted">—</span>;
  }

  function resolveNote(): string {
    const trimmed = note.trim();
    return trimmed.length >= 3 ? trimmed : HOLD_DEFAULT;
  }

  async function submitHold() {
    setErr(null);
    try {
      await onHold(row.shipmentId, resolveNote());
      setNote("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not place on hold");
    }
  }

  return (
    <div className="ops-cell-stack">
      {row.holdReason && row.status === "On Hold" && (
        <span className="ops-cell-hold-tag">On hold: {row.holdReason}</span>
      )}
      {(canHold || (row.canCancel && !row.canReleaseHold)) && (
        <input
          type="text"
          className="ops-cell-input ops-cell-input--note"
          placeholder={HOLD_DEFAULT}
          value={note}
          disabled={disabled}
          onChange={(e) => {
            setNote(e.target.value);
            setErr(null);
          }}
        />
      )}
      {(canHold || row.canReleaseHold || row.canCancel) && (
        <div className="ops-cell-inline ops-cell-inline--actions">
          {canHold && (
            <button type="button" className="ops-btn ops-btn--warn" disabled={disabled} onClick={() => void submitHold()}>
              On hold
            </button>
          )}
          {row.canReleaseHold && (
            <button type="button" className="ops-btn ops-btn--accent" disabled={disabled} onClick={() => void onReleaseHold(row.shipmentId)}>
              Release hold
            </button>
          )}
          {row.canCancel && (
            <button type="button" className="ops-btn ops-btn--danger" disabled={disabled} onClick={() => setShowCancelConfirm(true)}>
              Cancel
            </button>
          )}
        </div>
      )}
      {err && <span className="ops-cell-err">{err}</span>}
      {showCancelConfirm && (
        <ConfirmDialog
          title={`Cancel shipment ${row.shipmentId}?`}
          message="The client will see this order as cancelled. Any assigned driver will be removed. This cannot be undone."
          confirmLabel="Yes, cancel shipment"
          cancelLabel="Keep shipment"
          busy={disabled}
          onCancel={() => setShowCancelConfirm(false)}
          onConfirm={() => {
            const reason = note.trim() || "Cancelled by office";
            void onCancel(row.shipmentId, reason).finally(() => setShowCancelConfirm(false));
          }}
        />
      )}
    </div>
  );
}
