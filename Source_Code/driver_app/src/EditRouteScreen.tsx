import { useEffect, useState } from "react";
import {
  formatDisplayDateTime,
  formatStopTime,
  ROUTING_STRATEGY_LABEL,
  toLocalIso,
  type RouteLocationOption,
  type RouteSettings,
} from "./routeSettings";

type PickerMode = null | "startFrom" | "finishAt" | "stopTime";

type Props = {
  open: boolean;
  initial: RouteSettings;
  locationOptions: RouteLocationOption[];
  onClose: () => void;
  onSave: (settings: RouteSettings) => void;
};

const STOP_MINUTE_CHOICES = [2, 4, 5, 8, 10, 15, 20, 30];

export function EditRouteScreen({ open, initial, locationOptions, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<RouteSettings>(initial);
  const [picker, setPicker] = useState<PickerMode>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setPicker(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const startLoc = locationOptions.find((o) => o.id === draft.startFromId) ?? locationOptions[0];
  const finishLoc = locationOptions.find((o) => o.id === draft.finishAtId) ?? locationOptions[0];

  function savePickerLocation(id: string) {
    if (picker === "startFrom") setDraft((d) => ({ ...d, startFromId: id }));
    if (picker === "finishAt") setDraft((d) => ({ ...d, finishAtId: id }));
    setPicker(null);
  }

  return (
    <div className="edit-route-screen" role="dialog" aria-modal="true" aria-labelledby="edit-route-heading">
      <header className="edit-route-header">
        <button type="button" className="edit-route-back" onClick={onClose} aria-label="Back">
          ‹
        </button>
        <span className="edit-route-header-title">Edit Route</span>
        <button
          type="button"
          className="edit-route-help"
          title="Route settings are stored on this device for the prototype run."
          aria-label="Help"
        >
          ?
        </button>
      </header>

      <div className="edit-route-body">
        <h1 id="edit-route-heading" className="edit-route-title">
          Edit Route
        </h1>

        <div className="edit-route-field">
          <label htmlFor="route-name">Name</label>
          <input
            id="route-name"
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>

        <div className="edit-route-field edit-route-field--row">
          <div>
            <span className="edit-route-label">
              Start time
              <span className="field-hint" title="When you plan to leave the depot">
                ?
              </span>
            </span>
            <span className="edit-route-value">{formatDisplayDateTime(draft.startTimeIso)}</span>
          </div>
          <label className="edit-route-icon-btn" title="Pick start time">
            <input
              type="datetime-local"
              className="edit-route-datetime-input"
              value={toLocalIso(new Date(draft.startTimeIso))}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const parsed = new Date(v);
                if (!Number.isNaN(parsed.getTime())) {
                  setDraft((d) => ({ ...d, startTimeIso: parsed.toISOString() }));
                }
              }}
            />
            <span aria-hidden>🕐</span>
          </label>
        </div>

        <button type="button" className="edit-route-field edit-route-field--link" onClick={() => setPicker("startFrom")}>
          <div>
            <span className="edit-route-label">
              Start from:
              <span className="field-hint" title="Depot or first point of the run">
                ?
              </span>
            </span>
            <span className="edit-route-value edit-route-value--truncate">{startLoc?.label ?? "—"}</span>
          </div>
          <span className="edit-route-chevron" aria-hidden>
            ›
          </span>
        </button>

        <button type="button" className="edit-route-field edit-route-field--link" onClick={() => setPicker("finishAt")}>
          <div>
            <span className="edit-route-label">
              Finish at:
              <span className="field-hint" title="Where you finish the run (often same as start)">
                ?
              </span>
            </span>
            <span className="edit-route-value edit-route-value--truncate">{finishLoc?.label ?? "—"}</span>
          </div>
          <span className="edit-route-chevron" aria-hidden>
            ›
          </span>
        </button>

        <button type="button" className="edit-route-field edit-route-field--link" onClick={() => setPicker("stopTime")}>
          <div>
            <span className="edit-route-label">
              Stop time
              <span className="field-hint" title="Service time at each delivery stop">
                ?
              </span>
            </span>
            <span className="edit-route-value">{formatStopTime(draft.stopMinutes)}</span>
          </div>
          <span className="edit-route-chevron" aria-hidden>
            ›
          </span>
        </button>

        <div className="edit-route-field edit-route-field--readonly">
          <span className="edit-route-label">Routing strategy</span>
          <span className="edit-route-value edit-route-value--strategy">{ROUTING_STRATEGY_LABEL}</span>
        </div>

        <label className="edit-route-default">
          <input
            type="checkbox"
            checked={draft.markAsDefault}
            onChange={(e) => setDraft((d) => ({ ...d, markAsDefault: e.target.checked }))}
          />
          Mark as default
        </label>
      </div>

      <div className="edit-route-footer">
        <button type="button" className="edit-route-btn edit-route-btn--cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="edit-route-btn edit-route-btn--save"
          onClick={() => onSave(draft)}
        >
          Save
        </button>
      </div>

      {picker === "startFrom" || picker === "finishAt" ? (
        <div className="edit-route-picker" role="dialog" aria-label="Choose location">
          <header className="edit-route-picker-head">
            <button type="button" onClick={() => setPicker(null)}>
              Cancel
            </button>
            <strong>{picker === "startFrom" ? "Start from" : "Finish at"}</strong>
            <span />
          </header>
          <ul className="edit-route-picker-list">
            {locationOptions.map((opt) => {
              const selected =
                picker === "startFrom" ? draft.startFromId === opt.id : draft.finishAtId === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    className={selected ? "picker-row picker-row--selected" : "picker-row"}
                    onClick={() => savePickerLocation(opt.id)}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {picker === "stopTime" ? (
        <div className="edit-route-picker" role="dialog" aria-label="Stop time">
          <header className="edit-route-picker-head">
            <button type="button" onClick={() => setPicker(null)}>
              Cancel
            </button>
            <strong>Stop time</strong>
            <button type="button" onClick={() => setPicker(null)}>
              Done
            </button>
          </header>
          <ul className="edit-route-picker-list">
            {STOP_MINUTE_CHOICES.map((min) => (
              <li key={min}>
                <button
                  type="button"
                  className={draft.stopMinutes === min ? "picker-row picker-row--selected" : "picker-row"}
                  onClick={() => {
                    setDraft((d) => ({ ...d, stopMinutes: min }));
                    setPicker(null);
                  }}
                >
                  {formatStopTime(min)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
