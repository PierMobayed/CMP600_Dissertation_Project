import { useCallback, useState } from "react";
import { buildGoogleMapsDirectionsUrl } from "./mapsLinks";
import type { StopLoadState } from "./stopLoadState";
import { WorkflowConfirmDialog } from "./WorkflowConfirmDialog";
import { needsWorkflowConfirm, type WorkflowConfirmStatus } from "./workflowStatusConfirm";

type Props = {
  variant?: "full" | "panel";
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  load: StopLoadState;
  onStatus: (status: string) => void;
  onLoadOne: () => void;
  onLoadAll: () => void;
  onReactivate: (asInTransit: boolean) => void;
};

const STEPS = [
  { status: "Assigned", title: "Go to collection", detail: "Collect the parcel from the sender address." },
  { status: "Picked Up", title: "Parcel collected", detail: "Confirm all parcels are on the van." },
  { status: "In Transit", title: "Go to deliver", detail: "Drive to the recipient delivery address." },
  { status: "Delivered", title: "Delivered", detail: "Hand over the parcel to the recipient." },
] as const;

/** Shorter copy for List → Actions on mobile */
const PANEL_STEP_TEXT: Record<(typeof STEPS)[number]["status"], { title: string; detail: string }> = {
  Assigned: { title: "Collection", detail: "Go to the sender and load parcels on the van." },
  "Picked Up": { title: "Collected", detail: "Everything is on the van — start the delivery run." },
  "In Transit": { title: "Delivery", detail: "Go to the recipient and complete the handover." },
  Delivered: { title: "Done", detail: "Parcel delivered to the recipient." },
};

function stepIndex(status: string): number {
  if (status === "Assigned") return 0;
  if (status === "Picked Up") return 1;
  if (status === "In Transit") return 2;
  if (status === "Delivered") return 3;
  if (status === "Delayed") return 1;
  return -1;
}

type StepActionsProps = Pick<
  Props,
  | "load"
  | "pickupAddress"
  | "deliveryAddress"
  | "pickupLat"
  | "pickupLng"
  | "deliveryLat"
  | "deliveryLng"
  | "onStatus"
  | "onLoadOne"
  | "onLoadAll"
> & {
  step: (typeof STEPS)[number];
  stepIdx: number;
  allLoaded: boolean;
  compact?: boolean;
};

function StepActions({
  step,
  stepIdx,
  load,
  pickupAddress,
  deliveryAddress,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  allLoaded,
  onStatus,
  onLoadOne,
  onLoadAll,
  compact,
}: StepActionsProps) {
  const actionsClass = compact
    ? "edit-stop-workflow__actions edit-stop-workflow__actions--compact"
    : "edit-stop-workflow__actions";

  if (step.status === "Assigned") {
    return (
      <div className={actionsClass}>
        <a
          className="edit-stop-status-btn edit-stop-status-btn--nav edit-stop-status-btn--wide"
          href={buildGoogleMapsDirectionsUrl(pickupLat, pickupLng)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={compact ? `Navigate to collection: ${pickupAddress}` : undefined}
        >
          {compact ? "Navigate" : "Navigate to collection"}
        </a>
        {!compact && stepIdx === 0 && (
          <p className="edit-stop-workflow__addr">
            <small>Collection</small> {pickupAddress}
          </p>
        )}
        {load.parcelTotal > 0 && (
          <>
            {compact ? (
              <p className="workflow-van-row">
                <span className="workflow-van-row__label">On van</span>
                <span className="workflow-van-row__count">
                  {load.loadedCount} / {load.parcelTotal}
                </span>
              </p>
            ) : (
              <p className="edit-stop-hint edit-stop-hint--inline">
                Van: <strong>{load.loadedCount}</strong>/<strong>{load.parcelTotal}</strong>
              </p>
            )}
            <div className="edit-stop-status-grid">
              <button
                type="button"
                className="edit-stop-status-btn edit-stop-status-btn--load"
                disabled={allLoaded}
                onClick={onLoadOne}
              >
                {compact ? "+1" : "+1 parcel"}
              </button>
              <button
                type="button"
                className="edit-stop-status-btn edit-stop-status-btn--load"
                disabled={allLoaded}
                onClick={onLoadAll}
              >
                {compact ? "All" : "Load all"}
              </button>
            </div>
            <button
              type="button"
              className="edit-stop-status-btn edit-stop-status-btn--teal edit-stop-status-btn--wide"
              disabled={!allLoaded}
              onClick={() => onStatus("Picked Up")}
            >
              {compact ? "Collected" : "I collected the parcel"}
            </button>
          </>
        )}
        {load.parcelTotal <= 0 && (
          <button
            type="button"
            className="edit-stop-status-btn edit-stop-status-btn--teal edit-stop-status-btn--wide"
            onClick={() => onStatus("Picked Up")}
          >
            {compact ? "Collected" : "I collected the parcel"}
          </button>
        )}
      </div>
    );
  }

  if (step.status === "Picked Up") {
    return (
      <div className={actionsClass}>
        <button
          type="button"
          className="edit-stop-status-btn edit-stop-status-btn--teal edit-stop-status-btn--wide"
          onClick={() => onStatus("In Transit")}
        >
          {compact ? "Start delivery" : "Start delivery route"}
        </button>
      </div>
    );
  }

  if (step.status === "In Transit") {
    return (
      <div className={actionsClass}>
        <a
          className="edit-stop-status-btn edit-stop-status-btn--nav edit-stop-status-btn--wide"
          href={buildGoogleMapsDirectionsUrl(deliveryLat, deliveryLng)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={compact ? `Navigate to delivery: ${deliveryAddress}` : undefined}
        >
          {compact ? "Navigate" : "Navigate to delivery"}
        </a>
        {!compact && stepIdx === 2 && (
          <p className="edit-stop-workflow__addr">
            <small>Delivery</small> {deliveryAddress}
          </p>
        )}
        <button
          type="button"
          className="edit-stop-status-btn edit-stop-status-btn--done edit-stop-status-btn--wide"
          onClick={() => onStatus("Delivered")}
        >
          {compact ? "Delivered" : "I delivered the parcel"}
        </button>
      </div>
    );
  }

  return null;
}

function WorkflowProgress({ current }: { current: number }) {
  return (
    <div className="workflow-panel__progress" aria-label={`Step ${current + 1} of ${STEPS.length}`}>
      <span className="workflow-panel__step-label">
        Step {current + 1} of {STEPS.length}
      </span>
      <div className="workflow-panel__dots" aria-hidden>
        {STEPS.map((step, i) => {
          let dotClass = "workflow-panel__dot";
          if (i < current) dotClass += " workflow-panel__dot--done";
          else if (i === current) dotClass += " workflow-panel__dot--active";
          return <span key={step.status} className={dotClass} />;
        })}
      </div>
    </div>
  );
}

export function EditStopWorkflow({
  variant = "full",
  status,
  pickupAddress,
  deliveryAddress,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  load,
  onStatus,
  onLoadOne,
  onLoadAll,
  onReactivate,
}: Props) {
  const current = stepIndex(status);
  const allLoaded = load.parcelTotal > 0 && load.loadedCount >= load.parcelTotal;
  const sectionClass = variant === "panel" ? "edit-stop-section edit-stop-section--panel" : "edit-stop-section";
  const titleClass = variant === "panel" ? "edit-stop-section-title edit-stop-section-title--panel" : "edit-stop-section-title";
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

  const confirmDialog = pendingConfirm ? (
    <WorkflowConfirmDialog
      status={pendingConfirm}
      onConfirm={() => {
        onStatus(pendingConfirm);
        setPendingConfirm(null);
      }}
      onCancel={() => setPendingConfirm(null)}
    />
  ) : null;

  const actionProps = {
    load,
    pickupAddress,
    deliveryAddress,
    pickupLat,
    pickupLng,
    deliveryLat,
    deliveryLng,
    allLoaded,
    onStatus: requestStatus,
    onLoadOne,
    onLoadAll,
  };

  if (status === "Delayed") {
    return (
      <>
      <section className={sectionClass}>
        {variant === "panel" ? null : <h3 className={titleClass}>Workflow</h3>}
        <p className="edit-stop-hint edit-stop-hint--warn">This job is marked delayed. Resume at your current step:</p>
        <div className={`edit-stop-status-grid${variant === "panel" ? " edit-stop-status-grid--stack" : ""}`}>
          <button type="button" className="edit-stop-status-btn edit-stop-status-btn--teal" onClick={() => onStatus("Assigned")}>
            Resume · go to collection
          </button>
          <button type="button" className="edit-stop-status-btn edit-stop-status-btn--teal" onClick={() => onStatus("Picked Up")}>
            Resume · collected
          </button>
          <button type="button" className="edit-stop-status-btn edit-stop-status-btn--teal" onClick={() => onStatus("In Transit")}>
            Resume · en route to deliver
          </button>
        </div>
      </section>
      {confirmDialog}
      </>
    );
  }

  if (status === "Delivered") {
    if (variant === "panel") {
      return (
        <>
        <section className={sectionClass}>
          <WorkflowProgress current={3} />
          <div className="workflow-panel__content workflow-panel__content--done">
            <strong>Delivered</strong>
            <p>Parcel handed to recipient.</p>
          </div>
          <p className="edit-stop-hint">Marked complete. Reopen only if this was a mistake.</p>
          <div className="edit-stop-status-grid edit-stop-status-grid--stack">
            <button type="button" className="edit-stop-status-btn edit-stop-status-btn--teal" onClick={() => onReactivate(false)}>
              Reopen at collection
            </button>
            <button type="button" className="edit-stop-status-btn edit-stop-status-btn--teal" onClick={() => onReactivate(true)}>
              Reopen en route to delivery
            </button>
          </div>
        </section>
        {confirmDialog}
        </>
      );
    }
    return (
      <>
      <section className={sectionClass}>
        <h3 className={titleClass}>Workflow</h3>
        <ol className="edit-stop-workflow">
          {STEPS.map((step, i) => (
            <li key={step.status} className="edit-stop-workflow__item edit-stop-workflow__item--done">
              <span className="edit-stop-workflow__num">{i + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="edit-stop-hint">This job is complete. Reopen only if you marked it done by mistake.</p>
        <div className="edit-stop-status-grid edit-stop-status-grid--reactivate">
          <button type="button" className="edit-stop-status-btn edit-stop-status-btn--teal" onClick={() => onReactivate(false)}>
            Reopen at collection
          </button>
          <button type="button" className="edit-stop-status-btn edit-stop-status-btn--teal" onClick={() => onReactivate(true)}>
            Reopen en route to delivery
          </button>
        </div>
      </section>
      {confirmDialog}
      </>
    );
  }

  if (variant === "panel" && current >= 0) {
    const step = STEPS[current];
    const panelText = PANEL_STEP_TEXT[step.status];
    return (
      <>
      <section className={sectionClass}>
        <WorkflowProgress current={current} />
        <div className="workflow-panel__content">
          <div className="workflow-panel__head">
            <strong>{panelText.title}</strong>
            <p>{panelText.detail}</p>
          </div>
          <StepActions step={step} stepIdx={current} compact {...actionProps} />
        </div>
        <button
          type="button"
          className="edit-stop-status-btn edit-stop-status-btn--warn edit-stop-status-btn--wide workflow-panel__delayed"
          onClick={() => requestStatus("Delayed")}
        >
          Report delay
        </button>
      </section>
      {confirmDialog}
      </>
    );
  }

  return (
    <>
    <section className={sectionClass}>
      <h3 className={titleClass}>Workflow</h3>
      <ol className="edit-stop-workflow">
        {STEPS.map((step, i) => {
          const done = current > i;
          const active = current === i;
          const pending = current < i;
          let itemClass = "edit-stop-workflow__item";
          if (done) itemClass += " edit-stop-workflow__item--done";
          if (active) itemClass += " edit-stop-workflow__item--active";
          if (pending) itemClass += " edit-stop-workflow__item--pending";

          return (
            <li key={step.status} className={itemClass}>
              <span className="edit-stop-workflow__num">{done ? "✓" : i + 1}</span>
              <div className="edit-stop-workflow__body">
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
                {i === 0 && (
                  <p className="edit-stop-workflow__addr">
                    <small>Collection</small> {pickupAddress}
                  </p>
                )}
                {i === 2 && (
                  <p className="edit-stop-workflow__addr">
                    <small>Delivery</small> {deliveryAddress}
                  </p>
                )}
                {active && (
                  <StepActions step={step} stepIdx={i} {...actionProps} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="edit-stop-status-btn edit-stop-status-btn--warn edit-stop-status-btn--wide"
        style={{ marginTop: "0.5rem" }}
        onClick={() => requestStatus("Delayed")}
      >
        Mark failed / delayed
      </button>
    </section>
    {confirmDialog}
    </>
  );
}
