import L from "leaflet";
import { Marker, Popup } from "react-leaflet";

export function NumberedMarker({
  lat,
  lng,
  number,
  phase,
  variant,
  children,
  onSelect,
}: {
  lat: number;
  lng: number;
  number: number;
  phase: "collect" | "deliver";
  variant: "next" | "active" | "default" | "delivered";
  children?: React.ReactNode;
  onSelect?: () => void;
}) {
  const icon = L.divIcon({
    className: "",
    html: `<span class="numbered-pin numbered-pin--${phase} numbered-pin--${variant}" title="${phase === "collect" ? "Collection" : "Delivery"}">${number}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={onSelect ? { click: onSelect } : undefined}
    >
      {children ? <Popup>{children}</Popup> : null}
    </Marker>
  );
}
