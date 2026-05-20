import type { RunStopRow } from "./App";
import { StopActionsPanel } from "./StopActionsPanel";
import type { StopJob } from "./stopJob";
import type { StopLoadState } from "./stopLoadState";
import { SwipeStopShell } from "./SwipeStopShell";
import { StopNotesPanel } from "./StopSwipeActions";

function pillClass(status: string): string {
  const slug = status.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "default";
  return `pill pill--${slug}`;
}

function isPriorityOption(opt: string): boolean {
  return opt === "Express" || opt === "SameDay" || opt === "WhiteGlove";
}

type Props = {
  row: RunStopRow;
  job: StopJob;
  load: StopLoadState;
  active: boolean;
  isNext: boolean;
  isDone: boolean;
  legUpcoming: boolean;
  onHold?: boolean;
  actionable: boolean;
  note: string;
  onSelect: () => void;
  onNoteChange: (v: string) => void;
  onNoteSave: () => void;
  onEdit: () => void;
  onStatus: (status: string) => void;
  onLoadOne: () => void;
  onLoadAll: () => void;
  onReactivate: (asInTransit: boolean) => void;
};

export function StopListRow({
  row,
  job,
  load,
  active,
  isNext,
  isDone,
  legUpcoming,
  onHold,
  actionable,
  note,
  onSelect,
  onNoteChange,
  onNoteSave,
  onEdit,
  onStatus,
  onLoadOne,
  onLoadAll,
  onReactivate,
}: Props) {
  let cardMod = "";
  if (onHold) cardMod = "stop-card--on-hold";
  else if (isDone) cardMod = "stop-card--done";
  else if (active) cardMod = "stop-card--active";
  else if (isNext) cardMod = "stop-card--next";
  else if (legUpcoming) cardMod = "stop-card--upcoming";

  const isCollection = row.phase === "collect";
  const phaseLabel = isCollection ? "Collection" : "Delivery";
  const phaseClass = isCollection ? "pill pill--collection" : "pill pill--delivery-leg";
  const phaseCardMod = isCollection ? "stop-card--collection" : "stop-card--delivery";

  const left = (
    <StopActionsPanel
      job={job}
      load={load}
      phase={row.phase}
      actionable={actionable}
      onStatus={onStatus}
      onLoadOne={onLoadOne}
      onLoadAll={onLoadAll}
      onReactivate={onReactivate}
    />
  );
  const right = (
    <StopNotesPanel
      variant="fill"
      shipmentId={row.shipmentId}
      destination={row.destination}
      note={note}
      onChange={onNoteChange}
    />
  );

  return (
    <li
      className={`courier-list-item courier-list-item--swipe ${phaseCardMod} ${cardMod}`.trim()}
      data-shipment-id={row.shipmentId}
      data-stop-key={row.stopKey}
    >
      <SwipeStopShell
        className="swipe-stop--list"
        leftActions={left}
        rightPanel={right}
        closePanel={isDone}
        onEditStop={onEdit}
        onNotesSave={onNoteSave}
      >
        <div
          className="courier-list-main"
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect();
            }
          }}
        >
          <div className="courier-list-body stop-card-layout">
            <div className="stop-card-meta-row">
              <span className="stop-card-meta-item">
                Dist: <strong>{row.distMi.toFixed(2)} mi</strong>
              </span>
              <span className="stop-card-meta-item stop-card-meta-item--eta">
                {isDone ? (
                  <>Completed</>
                ) : (
                  <>
                    ETA: <strong>{row.etaLabel}</strong>
                  </>
                )}
              </span>
            </div>

            <div className="stop-card-badges">
              <span className="stop-badge stop-badge--num">{row.order}</span>
              <span className="stop-badge stop-badge--id">{row.shipmentId}</span>
              {!isDone && actionable && load.parcelTotal > 0 && (
                <span className="stop-badge stop-badge--van">
                  {load.loadedCount}/{load.parcelTotal}
                </span>
              )}
              {isPriorityOption(row.deliveryOption) && !isDone && (
                <span className="pill pill--priority">Prm</span>
              )}
              <span className={phaseClass}>{phaseLabel}</span>
              {onHold ? (
                <span className="pill pill--on-hold">On hold</span>
              ) : (
                !isDone && <span className={pillClass(row.status)}>{row.status}</span>
              )}
              {isDone ? <span className="pill pill--done">Done</span> : null}
            </div>

            <p className="stop-addr stop-addr--leg">{row.destination}</p>
            <p className="stop-addr-secondary">
              {row.phase === "collect"
                ? `Then deliver: ${row.deliveryAddress}`
                : `From collection: ${row.pickupAddress}`}
            </p>

            {note.trim() ? <p className="stop-note-preview">{note.trim()}</p> : null}
          </div>
        </div>
      </SwipeStopShell>
    </li>
  );
}
