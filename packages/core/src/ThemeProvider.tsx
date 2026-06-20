import type { ThemeMode } from "@dev-ui/tokens";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ThemeContextValue {
  preset: string;
  mode: ThemeMode;
  setPreset: (preset: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "theme-preset";
const MODE_STORAGE_KEY = "theme-mode";

/**
 * Get the root element (document.documentElement)
 */
function getRootElement(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("ThemeProvider can only be used in a browser environment");
  }
  return document.documentElement;
}

/**
 * Get system preference for dark mode
 */
function getSystemPreference(): ThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme preset name */
  defaultPreset?: string;
  /** Default theme mode */
  defaultMode?: ThemeMode | "system";
  /** Storage key prefix (for multiple apps) */
  storageKeyPrefix?: string;
}

/**
 * ThemeProvider component
 * Manages theme preset and mode selection, persisting to localStorage
 */
export function ThemeProvider({
  children,
  defaultPreset = "modern-minimal",
  defaultMode = "system",
  storageKeyPrefix = "",
}: ThemeProviderProps) {
  const storagePresetKey = storageKeyPrefix
    ? `${storageKeyPrefix}-${THEME_STORAGE_KEY}`
    : THEME_STORAGE_KEY;
  const storageModeKey = storageKeyPrefix
    ? `${storageKeyPrefix}-${MODE_STORAGE_KEY}`
    : MODE_STORAGE_KEY;

  // Initialize state from localStorage or defaults
  const [preset, setPresetState] = useState<string>(() => {
    if (typeof window === "undefined") {
      return defaultPreset;
    }
    return localStorage.getItem(storagePresetKey) || defaultPreset;
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return defaultMode === "system" ? getSystemPreference() : defaultMode;
    }
    const stored = localStorage.getItem(storageModeKey);
    if (stored === "system") {
      return getSystemPreference();
    }
    return (
      (stored as ThemeMode) ||
      (defaultMode === "system" ? getSystemPreference() : defaultMode)
    );
  });

  // Apply theme attributes to root element
  useEffect(() => {
    const root = getRootElement();
    root.setAttribute("data-theme-preset", preset);
    root.setAttribute("data-theme-mode", mode);
  }, [preset, mode]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const stored = localStorage.getItem(storageModeKey);
      if (stored === "system" || (!stored && defaultMode === "system")) {
        setModeState(getSystemPreference());
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [defaultMode, storageModeKey]);

  const setPreset = useCallback(
    (newPreset: string) => {
      setPresetState(newPreset);
      if (typeof window !== "undefined") {
        localStorage.setItem(storagePresetKey, newPreset);
      }
    },
    [storagePresetKey],
  );

  const setMode = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageModeKey, newMode);
      }
    },
    [storageModeKey],
  );

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  const value: ThemeContextValue = {
    preset,
    mode,
    setPreset,
    setMode,
    toggleMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
