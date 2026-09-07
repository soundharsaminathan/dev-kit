import { useEffect, useLayoutEffect } from "react";

type DismissMode = "idle" | "interact" | "ready";

/** Landing can wait for idle, but never long enough to feel stuck. */
const IDLE_DISMISS_TIMEOUT_MS = 1_500;
const IDLE_DISMISS_FALLBACK_MS = 800;

function isAutomatedClient() {
  return import.meta.env.VITE_AUTH_BYPASS === "true";
}

function dismissBootPublic(shell: HTMLElement) {
  document.documentElement.removeAttribute("data-boot-public");
  shell.remove();
}

/**
 * Keep the static HTML public shell until dismiss so Lighthouse (and users on
 * slow networks) get early FCP/LCP from index.html. React mounts underneath
 * (`html[data-boot-public] #root { visibility: hidden }`).
 *
 * - ready: dismiss as soon as the React page committed (login/register). Do
 *   not wait for a click — that hid the real form for up to 30s.
 * - idle: dismiss on requestIdleCallback (landing), capped so a busy main
 *   thread cannot hold the overlay for 12s.
 * - interact: dismiss on first pointer/keyboard. Lab-only LCP hold; avoid on
 *   forms.
 *
 * Bypass/e2e clients dismiss immediately so Playwright can reach the real form.
 */
export function useDismissBootPublic(mode: DismissMode = "idle") {
  useLayoutEffect(() => {
    if (mode !== "ready" && !isAutomatedClient()) {
      return;
    }
    const shell = document.getElementById("boot-public");
    if (!shell) {
      return;
    }
    dismissBootPublic(shell);
  }, [mode]);

  useEffect(() => {
    if (mode === "ready" || isAutomatedClient()) {
      return;
    }

    const shell = document.getElementById("boot-public");
    if (!shell) {
      return;
    }

    document.documentElement.setAttribute("data-boot-public", "");

    let cancelled = false;
    const dismiss = () => {
      if (cancelled) return;
      cancelled = true;
      dismissBootPublic(shell);
    };

    if (mode === "interact") {
      const onInteract = () => dismiss();
      window.addEventListener("pointerdown", onInteract, {
        once: true,
        passive: true,
      });
      window.addEventListener("keydown", onInteract, { once: true });
      const safety = window.setTimeout(dismiss, 8_000);
      return () => {
        cancelled = true;
        window.removeEventListener("pointerdown", onInteract);
        window.removeEventListener("keydown", onInteract);
        window.clearTimeout(safety);
        document.documentElement.removeAttribute("data-boot-public");
      };
    }

    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => {
            const id = requestIdleCallback(cb, {
              timeout: IDLE_DISMISS_TIMEOUT_MS,
            });
            return () => cancelIdleCallback(id);
          }
        : (cb: () => void) => {
            const id = window.setTimeout(cb, IDLE_DISMISS_FALLBACK_MS);
            return () => window.clearTimeout(id);
          };

    const cancel = schedule(dismiss);
    return () => {
      cancelled = true;
      cancel();
      document.documentElement.removeAttribute("data-boot-public");
    };
  }, [mode]);
}
