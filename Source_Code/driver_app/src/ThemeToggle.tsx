import { useCallback, useState } from "react";
import { applyTheme, getThemeFromDom, type ThemeMode } from "./theme";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(getThemeFromDom);

  const toggle = useCallback(() => {
    const next: ThemeMode = mode === "light" ? "dark" : "light";
    applyTheme(next);
    setMode(next);
  }, [mode]);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={mode === "light" ? "Activate dark theme" : "Activate light theme"}
      aria-pressed={mode === "dark"}
    >
      <span className="theme-toggle-label">{mode === "light" ? "Dark theme" : "Light theme"}</span>
      <span className="theme-toggle-short" aria-hidden>
        {mode === "light" ? "●○" : "○●"}
      </span>
    </button>
  );
}
