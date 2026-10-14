import { createFileRoute } from "@tanstack/react-router";
import { TrainersExplorePage } from "@/modules/trainers/trainers-explore-page";

export const Route = createFileRoute("/app/trainers/")({
  component: TrainersPage,
});

function TrainersPage() {
  return <TrainersExplorePage variant="app" />;
}
