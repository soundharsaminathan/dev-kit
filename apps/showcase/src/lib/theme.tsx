import { getThemePresetNames, type ThemePresetName } from "@dev-ui/tokens";
import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark";

const PRESET_STORAGE_KEY = "theme-preset";
const MODE_STORAGE_KEY = "theme-mode";

interface ThemeContextValue {
  preset: ThemePresetName;
  mode: ThemeMode;
  setPreset: (preset: ThemePresetName) => void;
  setMode: (mode: ThemeMode) => void;
  presets: ThemePresetName[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreset(): ThemePresetName {
  const stored = localStorage.getItem(PRESET_STORAGE_KEY);
  const presets = getThemePresetNames();
  if (stored && presets.includes(stored as ThemePresetName)) {
    return stored as ThemePresetName;
  }
  return "modern-minimal";
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

function applyTheme(preset: ThemePresetName, mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme-preset", preset);
  root.setAttribute("data-theme-mode", mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const presets = useMemo(() => getThemePresetNames(), []);
  const [preset, setPresetState] = useState<ThemePresetName>(readStoredPreset);
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  useLayoutEffect(() => {
    applyTheme(preset, mode);
    localStorage.setItem(PRESET_STORAGE_KEY, preset);
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [preset, mode]);

  const value = useMemo(
    () => ({
      preset,
      mode,
      presets,
      setPreset: setPresetState,
      setMode: setModeState,
    }),
    [preset, mode, presets],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function formatPresetLabel(preset: ThemePresetName): string {
  return preset
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
