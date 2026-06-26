import {
  type IconPackModule,
  IconProvider,
  type IconTheme,
} from "@dev-ui/icons";
import {
  ACTIVE_THEME_STORAGE_KEY,
  type CustomTheme,
  createCustomThemeId,
  getBuiltInThemeIds,
  loadCustomThemes,
  resolveTheme,
  resolveThemeById,
  saveCustomThemes,
  THEME_MODE_STORAGE_KEY,
  type ThemeDefinition,
  type ThemeMode,
  themeToCss,
} from "@dev-ui/tokens";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

const CUSTOM_STYLE_ID = "dev-ui-theme-overrides";

type ModePreference = ThemeMode | "system";

export interface ThemeContextValue {
  theme: string;
  mode: ThemeMode;
  themes: ThemeDefinition[];
  customThemes: CustomTheme[];
  liveTheme: ThemeDefinition | null;
  setTheme: (themeId: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setLiveTheme: (definition: ThemeDefinition | null) => void;
  saveCustomTheme: (
    theme: Omit<CustomTheme, "id" | "createdAt"> & { id?: string },
  ) => CustomTheme;
  deleteCustomTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getRootElement(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("ThemeProvider can only be used in a browser environment");
  }
  return document.documentElement;
}

function getSystemPreference(): ThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVE_THEME_STORAGE_KEY) || "default";
}

function readModePreference(defaultMode: ThemeMode | "system"): ModePreference {
  if (typeof window === "undefined") {
    return defaultMode === "system" ? "system" : defaultMode;
  }
  const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
  if (stored === "system" || stored === "light" || stored === "dark") {
    return stored;
  }
  return defaultMode === "system" ? "system" : defaultMode;
}

function applyThemeStyleSheet(_themeId: string, css: string | null): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(CUSTOM_STYLE_ID);
  if (!css) {
    existing?.remove();
    return;
  }

  const style =
    existing ??
    Object.assign(document.createElement("style"), { id: CUSTOM_STYLE_ID });
  style.textContent = css;
  if (!existing) {
    document.head.appendChild(style);
  }
}

function applyCustomThemeStyles(
  themeId: string,
  customThemes: CustomTheme[],
): void {
  if (!themeId.startsWith("custom-")) {
    applyThemeStyleSheet(themeId, null);
    return;
  }

  const resolved = resolveThemeById(themeId, customThemes);
  applyThemeStyleSheet(themeId, themeToCss(resolved, themeId));
}

function applyLiveThemeStyles(definition: ThemeDefinition): void {
  const resolved = resolveTheme(definition);
  applyThemeStyleSheet(definition.id, themeToCss(resolved, definition.id));
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  defaultMode?: ThemeMode | "system";
  storageKeyPrefix?: string;
  icons?: IconTheme | undefined;
  initialIconPack?: IconPackModule | undefined;
}

export function ThemeProvider({
  children,
  defaultTheme = "default",
  defaultMode = "system",
  icons,
  initialIconPack,
}: ThemeProviderProps) {
  const builtInIds = useMemo(() => getBuiltInThemeIds(), []);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() =>
    typeof window === "undefined" ? [] : loadCustomThemes(),
  );
  const [liveTheme, setLiveTheme] = useState<ThemeDefinition | null>(null);

  const [theme, setThemeState] = useState<string>(() => {
    const stored = readStoredTheme();
    return stored || defaultTheme;
  });

  const [modePreference, setModePreference] = useState<ModePreference>(() =>
    readModePreference(defaultMode),
  );
  const [systemMode, setSystemMode] = useState<ThemeMode>(() =>
    getSystemPreference(),
  );

  const mode: ThemeMode =
    modePreference === "system" ? systemMode : modePreference;

  const themes = useMemo<ThemeDefinition[]>(() => {
    const builtIn = builtInIds.map((id) => resolveThemeById(id, customThemes));
    return [...builtIn, ...customThemes];
  }, [builtInIds, customThemes]);

  useLayoutEffect(() => {
    const root = getRootElement();
    const activeThemeId = liveTheme?.id ?? theme;
    root.setAttribute("data-theme", activeThemeId);
    root.setAttribute("data-theme-mode", mode);

    if (liveTheme) {
      applyLiveThemeStyles(liveTheme);
    } else {
      applyCustomThemeStyles(theme, customThemes);
    }

    localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, theme);
  }, [theme, mode, customThemes, liveTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (modePreference === "system") {
        setSystemMode(getSystemPreference());
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [modePreference]);

  const setTheme = useCallback((themeId: string) => {
    setThemeState(themeId);
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModePreference(newMode);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  const saveCustomTheme = useCallback(
    (
      input: Omit<CustomTheme, "id" | "createdAt"> & { id?: string },
    ): CustomTheme => {
      const saved: CustomTheme = {
        ...input,
        id: input.id?.startsWith("custom-")
          ? (input.id as CustomTheme["id"])
          : createCustomThemeId(),
        createdAt: new Date().toISOString(),
      };
      setCustomThemes((current) => {
        const next = [...current.filter((item) => item.id !== saved.id), saved];
        saveCustomThemes(next);
        return next;
      });
      return saved;
    },
    [],
  );

  const deleteCustomTheme = useCallback((themeId: string) => {
    setCustomThemes((current) => {
      const next = current.filter((item) => item.id !== themeId);
      saveCustomThemes(next);
      return next;
    });
    setThemeState((current) => (current === themeId ? "default" : current));
  }, []);

  const value: ThemeContextValue = {
    theme,
    mode,
    themes,
    customThemes,
    liveTheme,
    setTheme,
    setMode,
    toggleMode,
    setLiveTheme,
    saveCustomTheme,
    deleteCustomTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <IconProvider icons={icons} initialPack={initialIconPack}>
        {children}
      </IconProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
