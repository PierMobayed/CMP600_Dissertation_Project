import type { AddressSuggestion } from "../lib/addressSuggest";
import { filterAddressSuggestions } from "../lib/addressMatch";
import { formatCoord } from "../lib/geocode";
import { formatUkPostcode } from "../lib/ukPostcode";
import { AddressPinMap } from "./AddressPinMap";

export type GeoPinState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; lat: number; lng: number; displayName: string; approximate?: boolean }
  | { status: "error"; message: string };

function AddressGeoStatus({ state }: { state: GeoPinState }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return <p className="geo-hint geo-hint--loading">Looking up on map…</p>;
  }
  if (state.status === "error") {
    return <p className="geo-hint geo-hint--error">{state.message}</p>;
  }
  return (
    <p className={`geo-hint ${state.approximate ? "geo-hint--warn" : "geo-hint--ok"}`}>
      On map: {formatCoord(state.lat)}, {formatCoord(state.lng)}
      <span className="geo-hint-detail"> · {state.displayName}</span>
      {state.approximate && (
        <span className="geo-hint-detail">
          {" "}
          · Approximate position — pick an address from the list if shown, or drag the pin to your door.
        </span>
      )}
    </p>
  );
}

type Props = {
  title: string;
  lead: string;
  variant: "collection" | "delivery";
  mapLabel: string;
  postcode: string;
  line: string;
  onPostcodeChange: (value: string) => void;
  onLineChange: (value: string) => void;
  onPostcodeBlur: () => void;
  onLineFocus: () => void;
  onLineBlur: () => void;
  preciseLookup: boolean;
  suggestions: AddressSuggestion[];
  suggestionsLoading: boolean;
  suggestionsOpen: boolean;
  areaLabel?: string;
  onPickSuggestion: (item: AddressSuggestion) => void;
  geo: GeoPinState;
  mapKey: number;
  recenterKey: number;
  onPinMove: (lat: number, lng: number) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  lat: string;
  lng: string;
  onLatChange: (value: string) => void;
  onLngChange: (value: string) => void;
};

export function AddressStepForm({
  title,
  lead,
  variant,
  mapLabel,
  postcode,
  line,
  onPostcodeChange,
  onLineChange,
  onPostcodeBlur,
  onLineFocus,
  onLineBlur,
  preciseLookup,
  suggestions,
  suggestionsLoading,
  suggestionsOpen,
  areaLabel,
  onPickSuggestion,
  geo,
  mapKey,
  recenterKey,
  onPinMove,
  showAdvanced,
  onToggleAdvanced,
  lat,
  lng,
  onLatChange,
  onLngChange,
}: Props) {
  const pcHint = formatUkPostcode(postcode);
  const filtered = filterAddressSuggestions(suggestions, line);

  return (
    <div className="book-panel">
      <h2 className="book-panel-title">{title}</h2>
      <p className="book-panel-lead">{lead}</p>

      <label className="client-field">
        <span className="client-field-label">Postcode</span>
        <input
          value={postcode}
          onChange={(e) => onPostcodeChange(e.target.value)}
          onBlur={onPostcodeBlur}
          placeholder="e.g. LS10 4HJ"
          autoComplete="postal-code"
          required
        />
        {pcHint && postcode.trim() !== pcHint && (
          <span className="client-field-hint">Will use {pcHint}</span>
        )}
      </label>

      <label className="client-field address-line-field">
        <span className="client-field-label">House number or building name</span>
            <input
              value={line}
              onChange={(e) => onLineChange(e.target.value)}
              onFocus={onLineFocus}
              onBlur={onLineBlur}
              placeholder="e.g. 14 or Acme House"
              autoComplete="address-line1"
            />
        {suggestionsLoading && <p className="geo-hint geo-hint--loading">Finding addresses…</p>}
        {!suggestionsLoading && areaLabel && suggestions.length === 0 && !line.trim() && (
          <p className="client-field-hint">{areaLabel} — enter your house number or building name.</p>
        )}
        {!suggestionsLoading && line.trim() && suggestions.length === 0 && (
          <p className="client-field-hint">
            No exact match in our map data — we will place the pin as close as we can; drag it to your door if needed.
          </p>
        )}
        {!suggestionsLoading && !line.trim() && suggestions.length > 0 && (
          <p className="client-field-hint">Pick your address from the list, or type your house number.</p>
        )}
        {suggestionsOpen && filtered.length > 0 && (
          <ul className="address-suggest-list" role="listbox" aria-label="Address suggestions">
            {filtered.slice(0, 20).map((s) => (
              <li key={s.id}>
                <button type="button" className="address-suggest-item" onClick={() => onPickSuggestion(s)}>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>

      <AddressGeoStatus state={geo} />
      {geo.status === "ok" && (
        <AddressPinMap
          key={`${variant}-map-${mapKey}`}
          lat={geo.lat}
          lng={geo.lng}
          recenterKey={recenterKey}
          variant={variant}
          label={mapLabel}
          onPositionChange={onPinMove}
        />
      )}

      <button type="button" className="client-link-btn" onClick={onToggleAdvanced}>
        {showAdvanced ? "Hide" : "Show"} advanced coordinates (optional)
      </button>
      {showAdvanced && (
        <div className="book-advanced">
          <div className="coord-row">
            <label className="client-field">
              <span className="client-field-label">Latitude</span>
              <input value={lat} onChange={(e) => onLatChange(e.target.value)} placeholder="51.52" />
            </label>
            <label className="client-field">
              <span className="client-field-label">Longitude</span>
              <input value={lng} onChange={(e) => onLngChange(e.target.value)} placeholder="-0.10" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
