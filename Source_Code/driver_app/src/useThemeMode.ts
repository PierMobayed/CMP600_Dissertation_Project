import { useEffect, useState } from "react";
import { getThemeFromDom, type ThemeMode } from "./theme";

export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeFromDom());

  useEffect(() => {
    const sync = () => setMode(getThemeFromDom());
    window.addEventListener("cmp600-theme-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cmp600-theme-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return mode;
}
