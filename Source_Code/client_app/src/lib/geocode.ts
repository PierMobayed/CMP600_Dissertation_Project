const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
  approximate?: boolean;
};

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({ address: address.trim() });
  const res = await fetch(`${API}/geocode?${params}`);
  if (!res.ok) {
    let msg = "Could not find that address.";
    try {
      const j = (await res.json()) as { detail?: { error?: { message?: string } } };
      msg = j.detail?.error?.message ?? msg;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<GeocodeResult>;
}

export function formatCoord(n: number): string {
  return n.toFixed(5);
}
