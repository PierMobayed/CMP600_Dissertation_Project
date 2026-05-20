import { useMemo, useState } from "react";
import type { DeliveryOptionMeta } from "../api";
import { ConfirmDialog } from "./ConfirmDialog";
import { geocodeAddress } from "../lib/geocode";
import {
  clampDeliveryDate,
  isDeliveryDateForward,
  maxDeliveryDate,
  minForwardDeliveryDate,
} from "../lib/deliveryDate";

export type EditableOrder = {
  shipmentId: string;
  orderId: string;
  status: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  destination?: string;
  deliveryOption?: string;
  deliveryDate?: string | null;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  holdReason?: string | null;
  canHold?: boolean;
  canCancel?: boolean;
  canReleaseHold?: boolean;
};

type SavePayload = {
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination: string;
  dest_lat: number;
  dest_lng: number;
  delivery_date: string;
};

type Props = {
  order: EditableOrder;
  deliveryOpts: DeliveryOptionMeta[];
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  onHold: (reason: string) => Promise<void>;
  onReleaseHold: () => Promise<void>;
  onCancelDelivery: (reason: string) => Promise<void>;
};

export function EditOrderPanel({
  order,
  deliveryOpts,
  busy,
  onCancel,
  onSave,
  onHold,
  onReleaseHold,
  onCancelDelivery,
}: Props) {
  const [pickup, setPickup] = useState(order.pickupAddress ?? "");
  const [delivery, setDelivery] = useState(order.deliveryAddress ?? order.destination ?? "");
  const [deliveryDate, setDeliveryDate] = useState(() => clampDeliveryDate(order.deliveryDate));
  const [holdReason, setHoldReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const minDate = useMemo(() => minForwardDeliveryDate(order.deliveryDate), [order.deliveryDate]);
  const maxDate = maxDeliveryDate();

  const serviceLabel =
    deliveryOpts.find((o) => o.id === order.deliveryOption)?.label ?? order.deliveryOption ?? "Standard";

  async function resolveCoords(
    address: string,
    original: string | undefined,
    lat: number | undefined,
    lng: number | undefined,
  ) {
    const trimmed = address.trim();
    if (
      original &&
      trimmed.toLowerCase() === original.trim().toLowerCase() &&
      lat !== undefined &&
      lng !== undefined
    ) {
      return { lat, lng };
    }
    const hit = await geocodeAddress(trimmed);
    return { lat: hit.lat, lng: hit.lng };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    const pickupTrim = pickup.trim();
    const deliveryTrim = delivery.trim();
    if (pickupTrim.length < 5 || deliveryTrim.length < 5) {
      setLocalErr("Enter full collection and delivery addresses (postcode and house or building).");
      return;
    }
    if (!deliveryDate.trim()) {
      setLocalErr("Choose a delivery date.");
      return;
    }
    if (!isDeliveryDateForward(order.deliveryDate, deliveryDate.trim())) {
      setLocalErr(`Choose a date between ${minDate} and ${maxDate}.`);
      return;
    }
    setSaving(true);
    try {
      const [pickupGeo, destGeo] = await Promise.all([
        resolveCoords(pickupTrim, order.pickupAddress, order.pickupLat, order.pickupLng),
        resolveCoords(deliveryTrim, order.deliveryAddress ?? order.destination, order.deliveryLat, order.deliveryLng),
      ]);
      await onSave({
        pickup_address: pickupTrim,
        pickup_lat: pickupGeo.lat,
        pickup_lng: pickupGeo.lng,
        destination: deliveryTrim,
        dest_lat: destGeo.lat,
        dest_lng: destGeo.lng,
        delivery_date: deliveryDate.trim(),
      });
    } catch (ex) {
      setLocalErr(ex instanceof Error ? ex.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(fn: () => Promise<void>) {
    setLocalErr(null);
    setSaving(true);
    try {
      await fn();
    } catch (ex) {
      setLocalErr(ex instanceof Error ? ex.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  const disabled = busy || saving;
  const showAddressForm = order.status !== "On Hold" && order.status !== "Cancelled";

  return (
    <div className="edit-order-panel">
      <h3 className="edit-order-title">Edit order · {order.shipmentId}</h3>
      <p className="edit-order-lead">
        Correct addresses or reschedule before collection. Service level is fixed after payment. Office and driver
        see updates on refresh.
      </p>
      {order.status === "On Hold" && order.holdReason && (
        <p className="edit-order-warn">
          <strong>On hold:</strong> {order.holdReason}
        </p>
      )}
      {order.status === "Assigned" && showAddressForm && (
        <p className="edit-order-warn">A driver is already assigned — change only if details are still wrong.</p>
      )}

      {showAddressForm && (
        <form className="edit-order-form" onSubmit={handleSubmit}>
          <label className="client-field">
            <span className="client-field-label">Collection address</span>
            <input
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="e.g. 109, LS10 4HJ"
              required
              disabled={disabled}
            />
          </label>
          <label className="client-field">
            <span className="client-field-label">Delivery address</span>
            <input
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              placeholder="e.g. 121, LS10 4HH"
              required
              disabled={disabled}
            />
          </label>
          <div className="client-field client-field--readonly">
            <span className="client-field-label">Service (paid — cannot change)</span>
            <p className="edit-order-readonly-value">{serviceLabel}</p>
          </div>
          <label className="client-field">
            <span className="client-field-label">Delivery date</span>
            <input
              type="date"
              value={deliveryDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
              disabled={disabled}
            />
            <span className="client-field-hint">
              Between today and {maxDate} (up to 30 days ahead). Same date or later only.
            </span>
          </label>
          {localErr && <p className="client-alert client-alert--error">{localErr}</p>}
          <div className="edit-order-actions">
            <button type="button" className="client-btn client-btn--ghost" onClick={onCancel} disabled={disabled}>
              Close
            </button>
            <button type="submit" className="client-btn client-btn--primary" disabled={disabled}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      <div className="edit-order-extra">
        {order.canHold && (
          <div className="edit-order-block">
            <h4 className="edit-order-subtitle">Put on hold</h4>
            <p className="edit-order-block-lead">
              e.g. parcel not ready for collection yet. Leave blank to use &ldquo;Not ready for delivery&rdquo;.
            </p>
            <textarea
              className="edit-order-textarea"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="Reason for hold (optional)…"
              rows={2}
              disabled={disabled}
            />
            <button
              type="button"
              className="client-btn client-btn--ghost edit-order-block-btn"
              disabled={disabled}
              onClick={() => {
                const reason = holdReason.trim();
                const finalReason = reason.length >= 3 ? reason : "Not ready for delivery";
                void runAction(() => onHold(finalReason));
              }}
            >
              Place on hold
            </button>
          </div>
        )}
        {order.canReleaseHold && (
          <div className="edit-order-block">
            <button
              type="button"
              className="client-btn client-btn--primary edit-order-block-btn"
              disabled={disabled}
              onClick={() => void runAction(onReleaseHold)}
            >
              Release hold
            </button>
          </div>
        )}
        {order.canCancel && (
          <div className="edit-order-block edit-order-block--danger">
            <h4 className="edit-order-subtitle">Cancel delivery</h4>
            <textarea
              className="edit-order-textarea"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional reason…"
              rows={2}
              disabled={disabled}
            />
            <button
              type="button"
              className="client-btn client-btn--danger edit-order-block-btn"
              disabled={disabled}
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel delivery
            </button>
          </div>
        )}
        {!showAddressForm && localErr && <p className="client-alert client-alert--error">{localErr}</p>}
      </div>
      {showCancelConfirm && (
        <ConfirmDialog
          title={`Cancel order ${order.shipmentId}?`}
          message="This will cancel the delivery permanently. The office and driver will be notified. This cannot be undone."
          confirmLabel="Yes, cancel delivery"
          cancelLabel="Keep order"
          busy={disabled}
          onCancel={() => setShowCancelConfirm(false)}
          onConfirm={() => {
            void runAction(async () => {
              await onCancelDelivery(cancelReason.trim());
              setShowCancelConfirm(false);
            });
          }}
        />
      )}
    </div>
  );
}
