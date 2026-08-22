import { useStudioId } from "@/lib/use-studio-id";
import { StudioFeaturesPanel } from "./studio-features-panel";

export function StudioFeaturesSettingsPage() {
  const studioId = useStudioId();
  return <StudioFeaturesPanel studioId={studioId} />;
}
