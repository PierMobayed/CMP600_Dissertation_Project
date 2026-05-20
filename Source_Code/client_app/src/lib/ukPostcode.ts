/** Client-side UK postcode helpers (mirror backend normalisation). */

export function formatUkPostcode(raw: string): string | null {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const m = cleaned.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  if (!m) return null;
  return `${m[1]} ${m[2]}`;
}

export function looksLikePostcodeInput(raw: string): boolean {
  const cleaned = raw.replace(/\s/g, "");
  return /^[A-Za-z]{1,2}\d[A-Za-z\d]?\d?[A-Za-z]{0,2}$/i.test(cleaned);
}

export function buildFullAddress(line: string, postcode: string): string {
  const pc = formatUkPostcode(postcode) ?? postcode.trim();
  const l = line.trim();
  if (l && pc) return `${l}, ${pc}`;
  if (pc) return pc;
  return l;
}
