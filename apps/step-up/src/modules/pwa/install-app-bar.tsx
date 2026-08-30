import { useEffect, useState } from "react";
import { usePwaInstall } from "@/lib/pwa-install";
import styles from "./install-app-bar.module.scss";

const DISMISS_KEY = "step-up-pwa-install-bar-dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

type InstallAppBarProps = {
  onVisibleChange?: (visible: boolean) => void;
};

export function InstallAppBar({ onVisibleChange }: InstallAppBarProps) {
  const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [busy, setBusy] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  const visible = !isStandalone && !dismissed && (canInstall || isIos);

  useEffect(() => {
    onVisibleChange?.(visible);
  }, [onVisibleChange, visible]);

  if (!visible) {
    return null;
  }

  async function handleInstall() {
    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setDismissed(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures — dismiss still applies for this session.
    }
  }

  return (
    <section
      className={styles.bar}
      aria-label="Install classa"
      data-install-bar="true"
    >
      <div className={styles.copy}>
        <p className={styles.title}>Install classa</p>
        <p className={styles.hint}>
          {iosHint
            ? "Tap Share in Safari, then Add to Home Screen."
            : "Faster launch and a full-screen app experience."}
        </p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={handleDismiss}>
          Not now
        </button>
        {canInstall ? (
          <button
            type="button"
            className={`${styles.action} ${styles.actionPrimary}`}
            disabled={busy}
            onClick={() => void handleInstall()}
          >
            {busy ? "Opening…" : "Install"}
          </button>
        ) : null}
        {isIos && !canInstall ? (
          <button
            type="button"
            className={`${styles.action} ${styles.actionPrimary}`}
            onClick={() => setIosHint((open) => !open)}
          >
            {iosHint ? "Got it" : "How"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
