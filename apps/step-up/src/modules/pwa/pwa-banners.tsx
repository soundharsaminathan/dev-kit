import { useRegisterSW } from "virtual:pwa-register/react";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import styles from "./pwa-banners.module.scss";

export function PwaBanners() {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW() {
      // Registration success — no UI needed.
    },
    onRegisterError() {
      // SW registration failures should not block the app.
    },
  });

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowBackOnline(true);
      void queryClient.invalidateQueries();
      const timer = window.setTimeout(() => setShowBackOnline(false), 3200);
      return () => window.clearTimeout(timer);
    }
  }, [online, queryClient]);

  if (!online) {
    return (
      <div className={styles.stack} role="status">
        <div className={`${styles.banner} ${styles.offline}`}>
          <p className={styles.message}>
            You’re offline. Viewing the cached shell — data needs a connection.
          </p>
        </div>
      </div>
    );
  }

  if (!showBackOnline && !needRefresh) {
    return null;
  }

  return (
    <div className={styles.stack}>
      {showBackOnline ? (
        <div className={`${styles.banner} ${styles.online}`} role="status">
          <p className={styles.message}>Back online. Refreshing data…</p>
        </div>
      ) : null}

      {needRefresh ? (
        <div className={`${styles.banner} ${styles.update}`} role="status">
          <p className={styles.message}>Update available</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              onClick={() => setNeedRefresh(false)}
            >
              Later
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.actionPrimary}`}
              onClick={() => void updateServiceWorker(true)}
            >
              Reload
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
