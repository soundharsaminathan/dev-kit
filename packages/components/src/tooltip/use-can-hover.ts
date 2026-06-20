import { useSyncExternalStore } from "react";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function getMediaQuery() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }

  return window.matchMedia(HOVER_QUERY);
}

function subscribe(onChange: () => void) {
  const mediaQuery = getMediaQuery();
  if (!mediaQuery) {
    return () => {};
  }

  mediaQuery.addEventListener("change", onChange);
  return () => {
    mediaQuery.removeEventListener("change", onChange);
  };
}

function getSnapshot() {
  return getMediaQuery()?.matches ?? true;
}

function getServerSnapshot() {
  return true;
}

export function useCanHover() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
