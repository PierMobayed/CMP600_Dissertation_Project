/** External navigation deep links (Google Maps, Waze) — same pattern as courier apps like Delm8. */

export function buildGoogleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
  opts?: { originLat?: number; originLng?: number },
): string {
  const p = new URLSearchParams();
  p.set("api", "1");
  p.set("travelmode", "driving");
  p.set("destination", `${destLat},${destLng}`);
  if (opts?.originLat != null && opts?.originLng != null) {
    p.set("origin", `${opts.originLat},${opts.originLng}`);
  }
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

export function buildWazeNavigateUrl(lat: number, lng: number): string {
  return `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}
