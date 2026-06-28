import {
  type TransitionEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type OverlayExitState = "open" | "closing" | "closed";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function getReducedMotionMediaQuery() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY);
}

function subscribeReducedMotion(onChange: () => void) {
  const mediaQuery = getReducedMotionMediaQuery();
  if (!mediaQuery) {
    return () => {};
  }

  mediaQuery.addEventListener("change", onChange);
  return () => {
    mediaQuery.removeEventListener("change", onChange);
  };
}

function getReducedMotionSnapshot() {
  return getReducedMotionMediaQuery()?.matches ?? false;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

export function useOverlayExit(isOpen: boolean, durationMs = 200) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const exitDurationMs = prefersReducedMotion ? 0 : durationMs;
  const [isRendered, setIsRendered] = useState(isOpen);
  const [dataState, setDataState] = useState<OverlayExitState>(
    isOpen ? "open" : "closed",
  );
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isOpen) {
      setIsRendered(true);
      setDataState("open");
      return;
    }

    if (!isRendered) {
      setDataState("closed");
      return;
    }

    setDataState("closing");

    if (exitDurationMs === 0) {
      setIsRendered(false);
      setDataState("closed");
      return;
    }

    closeTimerRef.current = setTimeout(() => {
      setIsRendered(false);
      setDataState("closed");
    }, exitDurationMs);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen, isRendered, exitDurationMs]);

  const onTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (dataState !== "closing") {
      return;
    }

    if (exitDurationMs === 0) {
      return;
    }

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsRendered(false);
    setDataState("closed");
  };

  return {
    isRendered,
    dataState,
    onTransitionEnd,
    exitDurationMs,
  };
}
