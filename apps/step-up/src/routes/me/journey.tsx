import { createFileRoute } from "@tanstack/react-router";
import { JourneyPage } from "@/modules/me/journey/journey-page";

export const Route = createFileRoute("/me/journey")({
  component: JourneyPage,
});
