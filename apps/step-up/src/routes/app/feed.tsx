import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "@/modules/social/feed-page";

export const Route = createFileRoute("/app/feed")({
  component: AppFeedPage,
});

function AppFeedPage() {
  return <FeedPage />;
}
