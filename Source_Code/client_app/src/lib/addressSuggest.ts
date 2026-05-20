const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

export type AddressSuggestion = {
  id: string;
  label: string;
  line1: string;
  lat: number;
  lng: number;
};

export type AddressSuggestResult = {
  postcode: string;
  areaLabel?: string;
  provider?: string;
  preciseLookup?: boolean;
  suggestions: AddressSuggestion[];
};

export async function fetchAddressSuggestions(
  postcode: string,
  query = "",
): Promise<AddressSuggestResult> {
  const params = new URLSearchParams({ postcode: postcode.trim() });
  if (query.trim()) params.set("q", query.trim());
  const res = await fetch(`${API}/addresses/suggest?${params}`);
  if (!res.ok) {
    let msg = "Could not load addresses for this postcode.";
    try {
      const j = (await res.json()) as { detail?: { error?: { message?: string } } };
      msg = j.detail?.error?.message ?? msg;
    } catch {
      /* default */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<AddressSuggestResult>;
}
