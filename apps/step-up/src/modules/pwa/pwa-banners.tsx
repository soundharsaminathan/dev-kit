import { useRegisterSW } from "virtual:pwa-register/react";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  StatusBanner,
  StatusBannerAction,
  StatusBannerActions,
  StatusBannerStack,
} from "@/modules/ui/status-banner";

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
      <StatusBannerStack zIndex={40}>
        <StatusBanner
          tone="offline"
          title="You’re offline. Viewing the cached shell — data needs a connection."
        />
      </StatusBannerStack>
    );
  }

  if (!showBackOnline && !needRefresh) {
    return null;
  }

  return (
    <StatusBannerStack zIndex={40}>
      {showBackOnline ? (
        <StatusBanner tone="online" title="Back online. Refreshing data…" />
      ) : null}

      {needRefresh ? (
        <StatusBanner
          tone="update"
          title="Update available"
          action={
            <StatusBannerActions>
              <StatusBannerAction onClick={() => setNeedRefresh(false)}>
                Later
              </StatusBannerAction>
              <StatusBannerAction
                primary
                onClick={() => void updateServiceWorker(true)}
              >
                Reload
              </StatusBannerAction>
            </StatusBannerActions>
          }
        />
      ) : null}
    </StatusBannerStack>
  );
}
