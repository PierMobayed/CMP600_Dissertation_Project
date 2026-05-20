import type { AddressSuggestion } from "./addressSuggest";

/** Match house number or building name against suggestion rows. */
export function filterAddressSuggestions(
  suggestions: AddressSuggestion[],
  line: string,
): AddressSuggestion[] {
  const l = line.trim().toLowerCase();
  if (!l) return suggestions;

  const strict = suggestions.filter((s) => matchesAddressLine(s, l));
  return strict.length > 0 ? strict : suggestions;
}

export function matchesAddressLine(s: AddressSuggestion, lineLower: string): boolean {
  const label = s.label.toLowerCase();
  const line1 = (s.line1 || "").toLowerCase();
  if (label.includes(lineLower) || line1.includes(lineLower)) return true;

  if (/^\d+[a-z]?$/i.test(lineLower)) {
    const hn = lineLower.replace(/[a-z]$/, "");
    if (line1.startsWith(`${lineLower} `) || line1 === lineLower) return true;
    return new RegExp(`\\b${lineLower}\\b`).test(label);
  }

  const words = lineLower.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => label.includes(w));
}
