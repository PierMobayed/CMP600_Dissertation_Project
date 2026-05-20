import { useCallback, useState } from "react";
import type { RunStopRow } from "./App";
import { buildGoogleMapsDirectionsUrl } from "./mapsLinks";
import type { StopJob } from "./stopJob";
import type { StopLoadState } from "./stopLoadState";
import { WorkflowConfirmDialog } from "./WorkflowConfirmDialog";
import { needsWorkflowConfirm, type WorkflowConfirmStatus } from "./workflowStatusConfirm";

type Props = {
  stop: RunStopRow;
  job: StopJob;
  totalStops: number;
  load: StopLoadState;
  note: string;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (status: string) => void;
  onLoadOne: () => void;
  onLoadAll: () => void;
};

export function StopFloatCard({
  stop,
  job,
  totalStops,
  load,
  note,
  onClose,
  onEdit,
  onStatus,
  onLoadOne,
  onLoadAll,
}: Props) {
  const status = job.status;
  const isDone = status === "Delivered";
  const allLoaded = load.parcelTotal > 0 && load.loadedCount >= load.parcelTotal;
  const notePreview = note.trim() || "No notes — use Edit stop to add instructions";
  const [pendingConfirm, setPendingConfirm] = useState<WorkflowConfirmStatus | null>(null);

  const requestStatus = useCallback(
    (next: string) => {
      if (needsWorkflowConfirm(next)) {
        setPendingConfirm(next);
        return;
      }
      onStatus(next);
    },
    [onStatus],
  );

  const showPickup = status === "Assigned";
  const addressLabel = showPickup ? "Collection" : "Delivery";
  const addressText = showPickup ? job.pickupAddress : job.deliveryAddress;
  const navLat = showPickup ? job.pickupLat : job.deliveryLat;
  const navLng = showPickup ? job.pickupLng : job.deliveryLng;
  const navLabel =
    status === "Assigned"
      ? "To collection"
      : status === "In Transit" || status === "Delayed"
        ? "To delivery"
        : "Navigate";

  let footerMod = "";
  if (isDone || status === "Picked Up") footerMod = " stop-float-actions--two";

  return (
    <div className="stop-float-card" role="dialog" aria-label={`Stop ${stop.order}`}>
      <div className="stop-float-body">
        <div className="stop-float-inner">
          <div className="stop-float-head">
            <span className="stop-float-card-pin" aria-label={`Stop ${stop.order} of ${totalStops}`}>
              <span className="stop-float-card-pin__order">{stop.order}</span>
              <span className="stop-float-card-pin__of-total" aria-hidden>
                /{totalStops}
              </span>
            </span>
            <div className="stop-float-head-text">
              <p className="stop-float-phase-badge">{status}</p>
              <p className="stop-float-address">
                <small>{addressLabel}</small> {addressText}
              </p>
              <p className="stop-float-id">{stop.shipmentId}</p>
            </div>
            <button type="button" className="stop-float-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {!isDone && status === "Assigned" && load.parcelTotal > 0 && (
            <div className="stop-float-load">
              <p className="stop-float-parcels">
                On van: <strong>{load.loadedCount}</strong> / <strong>{load.parcelTotal}</strong>
              </p>
              <div className="stop-float-load-btns">
                <button
                  type="button"
                  className="stop-float-load-btn"
                  disabled={allLoaded}
                  onClick={onLoadOne}
                >
                  +1
                </button>
                <button
                  type="button"
                  className="stop-float-load-btn"
                  disabled={allLoaded}
                  onClick={onLoadAll}
                >
                  All
                </button>
              </div>
            </div>
          )}

          {!isDone && status !== "Assigned" && load.parcelTotal > 0 && (
            <p className="stop-float-parcels">
              Parcels on van: <strong>{load.loadedCount}</strong> / <strong>{load.parcelTotal}</strong>
            </p>
          )}

          <div className="stop-float-meta-row stop-card-meta-row">
            <span className="stop-card-meta-item">
              Dist: <strong>{stop.distMi.toFixed(2)} mi</strong>
            </span>
            <span className="stop-card-meta-item stop-card-meta-item--eta">
              {isDone ? (
                <>Completed</>
              ) : (
                <>
                  ETA: <strong>{stop.etaLabel}</strong>
                </>
              )}
            </span>
          </div>

          <button type="button" className="stop-float-notes-preview stop-float-notes-preview--tap" onClick={onEdit}>
            <small>Delivery notes</small>
            <div className="stop-float-notes-preview__scroll">
              <p>{notePreview}</p>
            </div>
          </button>
        </div>
      </div>

      <footer className="stop-float-footer">
        <div className={`stop-float-actions${footerMod}`}>
          {(status === "Assigned" || status === "In Transit" || status === "Delayed" || isDone) && (
            <a
              className="stop-float-action stop-float-action--nav"
              href={buildGoogleMapsDirectionsUrl(navLat, navLng)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${navLabel}: ${addressText}`}
            >
              {navLabel}
            </a>
          )}

          {!isDone && status === "Assigned" && (
            <button
              type="button"
              className="stop-float-action stop-float-action--primary"
              disabled={load.parcelTotal > 0 && !allLoaded}
              title={load.parcelTotal > 0 && !allLoaded ? "Load all parcels on the van first" : undefined}
              onClick={() => requestStatus("Picked Up")}
            >
              Collected
            </button>
          )}

          {!isDone && status === "Picked Up" && (
            <button
              type="button"
              className="stop-float-action stop-float-action--primary"
              onClick={() => onStatus("In Transit")}
            >
              Start delivery
            </button>
          )}

          {!isDone && status === "In Transit" && (
            <button
              type="button"
              className="stop-float-action stop-float-action--done"
              onClick={() => requestStatus("Delivered")}
            >
              Delivered
            </button>
          )}

          {!isDone && status === "Delayed" && (
            <button type="button" className="stop-float-action stop-float-action--primary" onClick={onEdit}>
              Resume
            </button>
          )}

          <button type="button" className="stop-float-action stop-float-action--edit" onClick={onEdit}>
            Edit stop
          </button>
        </div>
      </footer>

      {pendingConfirm ? (
        <WorkflowConfirmDialog
          status={pendingConfirm}
          onConfirm={() => {
            onStatus(pendingConfirm);
            setPendingConfirm(null);
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      ) : null}
    </div>
  );
}
