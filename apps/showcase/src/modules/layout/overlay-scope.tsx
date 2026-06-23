import { OverlayProvider } from "@dev-ui/components/popover";
import { cn } from "@dev-ui/core";
import { UNSAFE_PortalProvider } from "@react-aria/overlays";
import { type ReactNode, useRef } from "react";
import styles from "./overlay-scope.module.scss";

export function OverlayScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  const portalRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn(styles.scope, className)}>
      <div
        ref={portalRef}
        className={styles.portalHost}
        data-showcase-overlay-root=""
      />
      <OverlayProvider>
        <UNSAFE_PortalProvider getContainer={() => portalRef.current}>
          <div className={styles.root}>{children}</div>
        </UNSAFE_PortalProvider>
      </OverlayProvider>
    </div>
  );
}
