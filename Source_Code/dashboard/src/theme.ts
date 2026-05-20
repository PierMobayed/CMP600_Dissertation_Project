export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "cmp600-theme";

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  window.dispatchEvent(new Event("cmp600-theme-change"));
}

export function getThemeFromDom(): ThemeMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Call before React mounts. Respects saved preference or system scheme. */
export function initTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return saved;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const mode = prefersDark ? "dark" : "light";
  applyTheme(mode);
  return mode;
}
