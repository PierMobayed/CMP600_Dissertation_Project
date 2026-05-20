import { useEffect, useMemo, useRef, useState } from "react";
import { bestTrackMatch, findTrackMatches, normalizeTrackQuery, type TrackableOrder } from "../lib/trackSearch";

type Props = {
  orders: TrackableOrder[];
  selected: string | null;
  onTrack: (shipmentId: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
};

export function TrackSearchBar({ orders, selected, onTrack, query, onQueryChange }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = "track-suggestions";

  const normalized = normalizeTrackQuery(query);
  const matches = useMemo(() => findTrackMatches(orders, query), [orders, query]);
  const showSuggestions = open && normalized.length > 0 && matches.length > 0;

  useEffect(() => {
    if (selected) onQueryChange(selected);
  }, [selected]);

  function pick(shipmentId: string) {
    onQueryChange(shipmentId);
    onTrack(shipmentId);
    setOpen(false);
    setMessage({ type: "ok", text: `Showing tracking for ${shipmentId}.` });
    requestAnimationFrame(() => {
      document.getElementById(`parcel-${shipmentId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalized) {
      setMessage({ type: "err", text: "Enter a shipment or order reference (e.g. S2001)." });
      return;
    }
    const hit = bestTrackMatch(orders, query);
    if (!hit) {
      setMessage({
        type: "err",
        text: `No parcel found for “${query.trim()}”. Try S2001 or your order ID.`,
      });
      return;
    }
    pick(hit.shipmentId);
  }

  function onInputChange(value: string) {
    onQueryChange(value);
    setMessage(null);
    setOpen(true);
  }

  return (
    <section className="rm-track-panel" aria-labelledby="track-panel-title">
      <h2 id="track-panel-title" className="rm-track-title">
        Track a parcel
      </h2>
      <p className="rm-track-lead">
        Search by shipment ID, order ID, or address. Results update as you type.
      </p>

      <form className="rm-track-form" onSubmit={submit} role="search">
        <label className="rm-track-label" htmlFor="track-ref">
          Tracking reference
        </label>
        <div className="rm-track-field-wrap">
          <div className="rm-track-input-wrap">
          <input
            ref={inputRef}
            id="track-ref"
            className="rm-track-input"
            value={query}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 180)}
            placeholder="e.g. S2001 or O1001"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls={listId}
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              className="rm-track-clear"
              aria-label="Clear search"
              onClick={() => {
                onQueryChange("");
                setMessage(null);
                setOpen(false);
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          )}
          </div>
          <button type="submit" className="client-btn client-btn--primary rm-track-btn">
            Track
          </button>
        </div>

        {showSuggestions && (
          <ul id={listId} className="rm-track-suggestions" role="listbox">
            {matches.slice(0, 6).map((o) => (
              <li key={o.shipmentId} role="option" aria-selected={selected === o.shipmentId}>
                <button type="button" className="rm-track-suggestion" onMouseDown={() => pick(o.shipmentId)}>
                  <span className="rm-track-suggestion-id">{o.shipmentId}</span>
                  <span className="rm-track-suggestion-meta">
                    {o.orderId}
                    {o.status ? ` · ${o.status}` : ""}
                  </span>
                  <span className="rm-track-suggestion-addr">
                    {o.pickupAddress ?? "—"} → {o.deliveryAddress ?? o.destination ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {message && (
        <p
          className={
            message.type === "ok" ? "rm-track-feedback rm-track-feedback--ok" : "rm-track-feedback rm-track-feedback--err"
          }
          role="status"
        >
          {message.text}
        </p>
      )}

      {normalized && matches.length === 0 && !message && (
        <p className="rm-track-feedback rm-track-feedback--err" role="status">
          No matches for “{query.trim()}”.
        </p>
      )}

      {normalized && matches.length > 0 && !message && (
        <p className="rm-track-feedback rm-track-feedback--hint">
          {matches.length} parcel{matches.length === 1 ? "" : "s"} match — press Track or pick from the list.
        </p>
      )}
    </section>
  );
}
