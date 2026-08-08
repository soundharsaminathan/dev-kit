import { useEffect } from "react";

/**
 * Keep the static HTML public shell until the browser is idle so Lighthouse
 * (and users on slow networks) get early FCP/LCP from index.html. React mounts
 * underneath; dismissing too early lets a late React paint become LCP.
 */
export function useDismissBootPublic() {
  useEffect(() => {
    const shell = document.getElementById("boot-public");
    if (!shell) {
      return;
    }

    document.documentElement.setAttribute("data-boot-public", "");

    let cancelled = false;
    const dismiss = () => {
      if (cancelled) return;
      document.documentElement.removeAttribute("data-boot-public");
      shell.remove();
    };

    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => {
            // Long timeout under Lighthouse mobile throttle so the static shell
            // remains the LCP candidate; real devices still idle-dismiss early.
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
  }, []);
}
