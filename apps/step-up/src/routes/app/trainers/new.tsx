import { createFileRoute } from "@tanstack/react-router";
import { MemberRegistrationForm } from "@/modules/members/member-registration-form";

export const Route = createFileRoute("/app/trainers/new")({
  component: NewTrainerPage,
});

function NewTrainerPage() {
  return (
    <MemberRegistrationForm
      kind="trainer"
      title="New trainer"
      backTo="/app/trainers"
      successTo="/app/trainers"
      createEndpoint="/users/trainers"
      createLabel="Create trainer"
      stylesTitle="Styles they teach"
      stylesSummaryLabel="styles"
      stepSubtitles={[
        "Register a trainer at your studio.",
        "Select every style they teach.",
      ]}
    />
  );
}
