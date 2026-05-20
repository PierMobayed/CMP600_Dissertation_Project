import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";

type Props = {
  host: HTMLElement | null;
};

/** Zoom +/- rendered into the side toolbar (must be a child of MapContainer). */
export function MapZoomPortal({ host }: Props) {
  const map = useMap();
  if (!host) return null;

  return createPortal(
    <>
      <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => map.zoomIn()}>
        +
      </button>
      <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => map.zoomOut()}>
        −
      </button>
    </>,
    host,
  );
}
