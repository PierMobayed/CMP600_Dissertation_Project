import { EditStopWorkflow } from "./EditStopWorkflow";
import type { StopJob } from "./stopJob";
import type { StopLoadState } from "./stopLoadState";

type Props = {
  job: StopJob;
  load: StopLoadState;
  phase: "collect" | "deliver";
  actionable: boolean;
  onStatus: (status: string) => void;
  onLoadOne: () => void;
  onLoadAll: () => void;
  onReactivate: (asInTransit: boolean) => void;
};

export function StopActionsPanel({
  job,
  load,
  phase,
  actionable,
  onStatus,
  onLoadOne,
  onLoadAll,
  onReactivate,
}: Props) {
  if (!actionable) {
    return (
      <div className="stop-actions-panel stop-actions-panel--scheduled">
        <p className="stop-leg-hint">
          {phase === "deliver"
            ? "Scheduled delivery — complete the collection leg for this parcel first."
            : "This collection is later on your route."}
        </p>
      </div>
    );
  }

  return (
    <div className="stop-actions-panel">
      <EditStopWorkflow
        variant="panel"
        status={job.status}
        pickupAddress={job.pickupAddress}
        deliveryAddress={job.deliveryAddress}
        pickupLat={job.pickupLat}
        pickupLng={job.pickupLng}
        deliveryLat={job.deliveryLat}
        deliveryLng={job.deliveryLng}
        load={load}
        onStatus={onStatus}
        onLoadOne={onLoadOne}
        onLoadAll={onLoadAll}
        onReactivate={onReactivate}
      />
    </div>
  );
}
