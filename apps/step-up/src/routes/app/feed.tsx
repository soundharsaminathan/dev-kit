import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "@/modules/social/feed-page";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

export const Route = createFileRoute("/app/feed")({
  component: AppFeedPage,
});

function AppFeedPage() {
  return (
    <RequireStudioFeature feature="feed">
      <FeedPage />
    </RequireStudioFeature>
  );
}
