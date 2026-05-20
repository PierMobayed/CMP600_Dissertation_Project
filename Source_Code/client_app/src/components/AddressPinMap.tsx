import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { fleetRasterTiles } from "../mapTiles";
import { useThemeMode } from "../useThemeMode";

type Variant = "collection" | "delivery";

type Props = {
  lat: number;
  lng: number;
  variant: Variant;
  label: string;
  /** Bumps only after a new address lookup — recentres map without resetting user zoom on pin drag. */
  recenterKey: number;
  onPositionChange: (lat: number, lng: number) => void;
};

const DEFAULT_ZOOM = 16;

/** Fly to a new geocode result; does not run when the user drags the pin. */
function MapRecenterOnLookup({
  lat,
  lng,
  recenterKey,
}: {
  lat: number;
  lng: number;
  recenterKey: number;
}) {
  const map = useMap();
  const seenKey = useRef(-1);

  useEffect(() => {
    if (recenterKey <= 0 || recenterKey === seenKey.current) return;
    seenKey.current = recenterKey;
    map.setView([lat, lng], DEFAULT_ZOOM, { animate: true });
  }, [recenterKey, lat, lng, map]);

  return null;
}

function DraggablePin({
  lat,
  lng,
  variant,
  onPositionChange,
}: {
  lat: number;
  lng: number;
  variant: Variant;
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const dragging = useRef(false);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<span class="book-pin book-pin--${variant}" title="${variant === "collection" ? "Collection" : "Delivery"}"></span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    [variant],
  );

  const eventHandlers = useMemo(
    () => ({
      dragstart() {
        dragging.current = true;
      },
      dragend() {
        dragging.current = false;
        const marker = markerRef.current;
        if (!marker) return;
        const pos = marker.getLatLng();
        onPositionChange(pos.lat, pos.lng);
      },
    }),
    [onPositionChange],
  );

  useEffect(() => {
    if (dragging.current) return;
    const marker = markerRef.current;
    if (!marker) return;
    const pos = marker.getLatLng();
    if (Math.abs(pos.lat - lat) > 1e-7 || Math.abs(pos.lng - lng) > 1e-7) {
      marker.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <Marker
      draggable
      position={[lat, lng]}
      icon={icon}
      ref={markerRef}
      eventHandlers={eventHandlers}
    />
  );
}

export function AddressPinMap({ lat, lng, variant, label, recenterKey, onPositionChange }: Props) {
  const themeMode = useThemeMode();
  const tiles = fleetRasterTiles(themeMode);

  return (
    <div className="address-pin-map" aria-label={`${label} map`}>
      <p className="address-pin-map-hint">
        Zoom in, then drag the pin for a precise {variant === "collection" ? "collection" : "delivery"} point.
      </p>
      <div className="address-pin-map-wrap map-wrap">
        <MapContainer
          center={[lat, lng]}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <ZoomControl position="topright" />
          <TileLayer key={themeMode} url={tiles.url} attribution={tiles.attribution} />
          <MapRecenterOnLookup lat={lat} lng={lng} recenterKey={recenterKey} />
          <DraggablePin lat={lat} lng={lng} variant={variant} onPositionChange={onPositionChange} />
        </MapContainer>
      </div>
    </div>
  );
}
