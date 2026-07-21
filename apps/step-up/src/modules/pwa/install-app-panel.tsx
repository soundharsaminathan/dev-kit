import { useState } from "react";
import { usePwaInstall } from "@/lib/pwa-install";
import staff from "@/modules/ui/staff.module.scss";
import { TouchButton } from "@/modules/ui/touch-button";

export function InstallAppPanel() {
  const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall();
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isStandalone) {
    return null;
  }

  if (!canInstall && !isIos) {
    return null;
  }

  async function handleInstall() {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={staff.softPanel}>
      <p className={staff.panelTitle}>Install app</p>
      <p className={staff.panelDesc}>
        Add Step Up to your home screen for a faster, full-screen experience.
      </p>
      {canInstall ? (
        <TouchButton
          variant="primary"
          onClick={() => void handleInstall()}
          isPending={busy}
        >
          Install Step Up
        </TouchButton>
      ) : null}
      {isIos ? (
        <>
          <TouchButton
            variant="default"
            onClick={() => setIosHint((open) => !open)}
          >
            {iosHint ? "Hide instructions" : "How to install on iPhone"}
          </TouchButton>
          {iosHint ? (
            <p className={staff.panelDesc}>
              Tap Share in Safari, then choose Add to Home Screen.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
