import { createFileRoute } from "@tanstack/react-router";
import { TrainersExplorePage } from "@/modules/trainers/trainers-explore-page";

export const Route = createFileRoute("/me/trainers/")({
  component: StudentTrainersPage,
});

function StudentTrainersPage() {
  return <TrainersExplorePage variant="me" />;
}
