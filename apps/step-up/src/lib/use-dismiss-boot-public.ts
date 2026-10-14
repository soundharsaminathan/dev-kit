import { useLayoutEffect } from "react";

/**
 * Remove the static HTML public shell as soon as React has committed.
 * Never hide the live tree — covering a mounted login form until click
 * left users staring at a non-interactive page.
 */
export function useDismissBootPublic() {
  useLayoutEffect(() => {
    const shell = document.getElementById("boot-public");
    if (!shell) {
      return;
    }
    document.documentElement.removeAttribute("data-boot-public");
    shell.remove();
  }, []);
}
