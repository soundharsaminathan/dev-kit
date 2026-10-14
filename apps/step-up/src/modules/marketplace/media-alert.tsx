import { StatusBanner } from "@/modules/ui/status-banner";
import type { MarketplaceMediaAlert } from "./controls";

type MarketplaceMediaAlertBannerProps = {
  alert: MarketplaceMediaAlert | null;
};

export function MarketplaceMediaAlertBanner({
  alert,
}: MarketplaceMediaAlertBannerProps) {
  if (!alert) return null;
  return (
    <div data-testid={`marketplace-media-alert-${alert.kind.toLowerCase()}`}>
      <StatusBanner
        tone="warning"
        role="alert"
        title={alert.objectName}
        meta={alert.message}
      />
    </div>
  );
}
