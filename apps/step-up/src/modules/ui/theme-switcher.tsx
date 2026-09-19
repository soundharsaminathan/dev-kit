import { cn, useThemeOptional } from "@dev-ui/core";
import { THEME_MODE_STORAGE_KEY, type ThemeMode } from "@dev-ui/tokens";
import { useCallback, useState } from "react";
import { MoonIcon, SunIcon } from "@/modules/marketing/icons";
import styles from "./theme-switcher.module.scss";

const COPY = {
  label: "Theme",
  light: "Light",
  dark: "Dark",
  toLight: "Switch to light theme",
  toDark: "Switch to dark theme",
} as const;

function readDocumentMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme-mode");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function writeDocumentMode(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme-mode", mode);
  localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
}

function applyMode(mode: ThemeMode, commit: (next: ThemeMode) => void) {
  writeDocumentMode(mode);
  commit(mode);
}

type ThemeSwitcherProps = {
  variant?: "compact" | "segmented";
  className?: string | undefined;
};

export function ThemeSwitcher({
  variant = "compact",
  className,
}: ThemeSwitcherProps) {
  const theme = useThemeOptional();
  const [fallbackMode, setFallbackMode] = useState(readDocumentMode);
  const mode = theme?.mode ?? fallbackMode;

  const setMode = useCallback(
    (next: ThemeMode) => {
      applyMode(next, (value) => {
        theme?.setMode(value);
        setFallbackMode(value);
      });
    },
    [theme],
  );

  if (variant === "segmented") {
    return (
      <fieldset className={cn(styles.segmented, className)} data-mode={mode}>
        <legend className={styles.legend}>{COPY.label}</legend>
        <div className={styles.track}>
          <span className={styles.thumb} aria-hidden />
          <button
            type="button"
            className={styles.option}
            aria-pressed={mode === "light"}
            onClick={() => setMode("light")}
          >
            <SunIcon className={styles.optionIcon} />
            {COPY.light}
          </button>
          <button
            type="button"
            className={styles.option}
            aria-pressed={mode === "dark"}
            onClick={() => setMode("dark")}
          >
            <MoonIcon className={styles.optionIcon} />
            {COPY.dark}
          </button>
        </div>
      </fieldset>
    );
  }

  const toDark = mode === "light";
  return (
    <button
      type="button"
      className={cn(styles.compact, className)}
      aria-label={toDark ? COPY.toDark : COPY.toLight}
      onClick={() => setMode(toDark ? "dark" : "light")}
    >
      {toDark ? (
        <MoonIcon className={styles.compactIcon} />
      ) : (
        <SunIcon className={styles.compactIcon} />
      )}
    </button>
  );
}
