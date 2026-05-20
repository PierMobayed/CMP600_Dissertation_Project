import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { ThemeMode } from "./theme";

type Coord = { lat: number; lng: number };
type Coord3 = { lat: number; lng: number; altMeters: number };

/** MapLibre GL styles with road-centric vector layers (similar feel to consumer navigation apps). */
const STYLE_GL: Record<ThemeMode, string> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

export function RouteMap3D({
  coordinates,
  coordinates3D,
  theme,
}: {
  coordinates: Coord[];
  coordinates3D: Coord3[] | undefined;
  theme: ThemeMode;
}) {
  const line = useMemo(
    () =>
      ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: coordinates.map((c) => [c.lng, c.lat]),
        },
      }),
    [coordinates]
  );

  const c0 = coordinates[0];
  const cN = coordinates[coordinates.length - 1] ?? c0;
  const bearing = useMemo(() => {
    if (!c0 || !cN) return 0;
    const y = Math.sin(((cN.lng - c0.lng) * Math.PI) / 180) * Math.cos((cN.lat * Math.PI) / 180);
    const x =
      Math.cos((c0.lat * Math.PI) / 180) * Math.sin((cN.lat * Math.PI) / 180) -
      Math.sin((c0.lat * Math.PI) / 180) * Math.cos((cN.lat * Math.PI) / 180) * Math.cos(((cN.lng - c0.lng) * Math.PI) / 180);
    return (Math.atan2(y, x) * 180) / Math.PI;
  }, [c0, cN]);

  if (!c0) return null;

  const maxAlt = coordinates3D?.length
    ? Math.max(...coordinates3D.map((p) => p.altMeters))
    : 0;

  const lineColor = theme === "dark" ? "#5eead4" : "#0d9488";
  const lineOutline = theme === "dark" ? "#134e4a" : "#ccfbf1";

  return (
    <div>
      <div className="map-wrap map-wrap-3d" style={{ marginTop: "0.5rem" }}>
        <Map
          key={theme}
          mapStyle={STYLE_GL[theme]}
          initialViewState={{
            longitude: cN.lng,
            latitude: cN.lat,
            zoom: 14.2,
            pitch: 68,
            bearing,
          }}
          maxPitch={85}
          style={{ width: "100%", height: "100%" }}
          reuseMaps
        >
          <Source id="route-outline" type="geojson" data={line}>
            <Layer
              id="route-3d-line-outline"
              type="line"
              paint={{
                "line-color": lineOutline,
                "line-width": 10,
                "line-opacity": 0.9,
                "line-blur": 0.5,
              }}
            />
          </Source>
          <Source id="route-3d" type="geojson" data={line}>
            <Layer
              id="route-3d-line"
              type="line"
              paint={{
                "line-color": lineColor,
                "line-width": 5,
                "line-opacity": 0.98,
              }}
            />
          </Source>
        </Map>
      </div>
      <p className="text-muted nav-3d-hint">
        Tilted vector preview (Google Maps–style perspective). For live driving, use{" "}
        <strong>Open in Google Maps</strong> below — your phone uses GPS; we only send the destination coordinates.
      </p>
      {coordinates3D && coordinates3D.length > 0 && (
        <div className="elev-profile" aria-label="Simulated elevation profile">
          <span className="elev-profile-label">Simulated elevation (m)</span>
          <div className="elev-bars">
            {coordinates3D.map((p, i) => (
              <div
                key={i}
                className="elev-bar"
                style={{ height: `${Math.min(100, (p.altMeters / Math.max(maxAlt, 1)) * 100)}%` }}
                title={`${p.altMeters.toFixed(0)} m`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
