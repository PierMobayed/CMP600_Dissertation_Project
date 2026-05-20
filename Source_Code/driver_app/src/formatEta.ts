/** Human-readable ETA for driver UI (parses ISO strings from API). */
export function formatDriverEta(value: string | null | undefined, fallback?: Date): string {
  if (value?.trim()) {
    const trimmed = value.trim();
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed) && looksLikeIsoDate(trimmed)) {
      return formatEtaDate(new Date(parsed));
    }
    return trimmed;
  }
  if (fallback && !Number.isNaN(fallback.getTime())) {
    return formatEtaDate(fallback);
  }
  return "—";
}

function looksLikeIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(s) || s.includes("T") && s.includes("Z");
}

function formatEtaDate(d: Date): string {
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
