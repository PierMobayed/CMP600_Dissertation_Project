import { useEffect, useRef } from "react";
import { buildGoogleMapsDirectionsUrl } from "./mapsLinks";
import type { RunStopRow } from "./App";

const NOTE_MAX_CHARS = 500;

type ActionProps = {
  row: RunStopRow;
  isDone: boolean;
  onDone: () => void;
  doneLabel?: string;
  showEditInPanel?: boolean;
  onEdit?: () => void;
};

export function StopSwipeLeftActions({
  row,
  isDone,
  onDone,
  doneLabel = "Done",
  showEditInPanel,
  onEdit,
}: ActionProps) {
  return (
    <div className="swipe-actions-primary">
      <a
        className="swipe-action swipe-action--nav"
        href={buildGoogleMapsDirectionsUrl(row.lat, row.lng)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Navigate
      </a>
      {!isDone && (
        <button type="button" className="swipe-action swipe-action--done" onClick={onDone}>
          {doneLabel}
        </button>
      )}
      {isDone && <p className="swipe-actions-hint">Use Edit stop below for more options.</p>}
      {showEditInPanel && onEdit && (
        <button type="button" className="swipe-action swipe-action--edit" onClick={onEdit}>
          Edit stop
        </button>
      )}
    </div>
  );
}

type NotesProps = {
  shipmentId: string;
  destination?: string;
  note: string;
  onChange: (v: string) => void;
  variant?: "sheet" | "fill";
  /** When fill: list = compact; float = grow to show full note in map card */
  fillContext?: "list" | "float";
};

export function StopNotesPanel({
  shipmentId,
  destination,
  note,
  onChange,
  variant = "sheet",
  fillContext = "list",
}: NotesProps) {
  const fieldId = `stop-note-${shipmentId}`;
  const ariaLabel = destination
    ? `Delivery notes for ${destination}`
    : `Delivery notes for ${shipmentId}`;

  const fillRef = useRef<HTMLTextAreaElement>(null);

  function resizeFill(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    if (fillContext === "float") {
      el.style.height = `${el.scrollHeight}px`;
      return;
    }
    const maxPx = Math.round(window.innerHeight * 0.28);
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
  }

  useEffect(() => {
    const el = fillRef.current;
    if (!el || variant !== "fill") return;
    resizeFill(el);
  }, [note, variant, fillContext]);

  if (variant === "fill") {
    return (
      <textarea
        ref={fillRef}
        id={fieldId}
        className={`stop-notes-fill stop-notes-fill--grow${fillContext === "float" ? " stop-notes-fill--float" : ""}`}
        aria-label={ariaLabel}
        value={note}
        onChange={(e) => {
          const v = e.target.value.slice(0, NOTE_MAX_CHARS);
          onChange(v);
          resizeFill(e.target);
        }}
        spellCheck
        autoComplete="off"
        enterKeyHint="done"
        placeholder="Gate code, safe place, customer instructions…"
      />
    );
  }

  const chars = note.length;
  const nearLimit = chars >= NOTE_MAX_CHARS * 0.9;

  return (
    <div className="stop-notes-compose">
      <div className="stop-notes-compose__header">
        <div className="stop-notes-compose__header-text">
          <span className="stop-notes-compose__eyebrow">Delivery notes</span>
          {destination ? <p className="stop-notes-compose__destination">{destination}</p> : null}
        </div>
        <span className="stop-notes-compose__badge">{shipmentId}</span>
      </div>

      <p className="stop-notes-compose__device" role="note">
        <span className="stop-notes-compose__device-icon" aria-hidden>
          &#9679;
        </span>
        Saved on this device only — not sent to dispatch
      </p>

      <div className="stop-notes-compose__field">
        <label className="stop-notes-compose__label" htmlFor={fieldId}>
          Instructions for this stop
        </label>
        <textarea
          id={fieldId}
          className="swipe-notes-input stop-notes-compose__input"
          value={note}
          onChange={(e) => onChange(e.target.value.slice(0, NOTE_MAX_CHARS))}
          rows={7}
          spellCheck
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Gate code, safe place, buzzer name, customer request…"
        />
        <div className="stop-notes-compose__meta">
          <span>Shown on this stop when you return to the list</span>
          <span className={`stop-notes-compose__count${nearLimit ? " stop-notes-compose__count--warn" : ""}`}>
            {chars}/{NOTE_MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );
}
