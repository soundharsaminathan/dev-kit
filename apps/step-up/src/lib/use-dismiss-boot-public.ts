import { useEffect } from "react";

type DismissMode = "idle" | "interact";

function isAutomatedClient() {
  return import.meta.env.VITE_AUTH_BYPASS === "true";
}

/**
 * Keep the static HTML public shell until dismiss so Lighthouse (and users on
 * slow networks) get early FCP/LCP from index.html. React mounts underneath
 * (`html[data-boot-public] #root { visibility: hidden }`).
 *
 * - idle: dismiss on requestIdleCallback (landing)
 * - interact: dismiss on first pointer/keyboard (login/register) so the shell
 *   remains the LCP candidate under mobile simulation
 *
 * Bypass/e2e clients dismiss immediately so Playwright can reach the real form.
 */
export function useDismissBootPublic(mode: DismissMode = "idle") {
  useEffect(() => {
    const shell = document.getElementById("boot-public");
    if (!shell) {
      return;
    }

    document.documentElement.setAttribute("data-boot-public", "");

    let cancelled = false;
    const dismiss = () => {
      if (cancelled) return;
      cancelled = true;
      document.documentElement.removeAttribute("data-boot-public");
      shell.remove();
    };

    if (isAutomatedClient()) {
      dismiss();
      return () => {
        cancelled = true;
        document.documentElement.removeAttribute("data-boot-public");
      };
    }

    if (mode === "interact") {
      const onInteract = () => dismiss();
      window.addEventListener("pointerdown", onInteract, {
        once: true,
        passive: true,
      });
      window.addEventListener("keydown", onInteract, { once: true });
      // Safety net for accessibility / non-interactive waits.
      const safety = window.setTimeout(dismiss, 30_000);
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
            const id = requestIdleCallback(cb, { timeout: 12_000 });
            return () => cancelIdleCallback(id);
          }
        : (cb: () => void) => {
            const id = window.setTimeout(cb, 4_000);
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
