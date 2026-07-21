import { createFileRoute } from "@tanstack/react-router";
import { MemberRegistrationForm } from "@/modules/members/member-registration-form";

export const Route = createFileRoute("/app/students/new")({
  component: NewStudentPage,
});

function NewStudentPage() {
  return (
    <MemberRegistrationForm
      kind="student"
      title="New student"
      backTo="/app/students"
      successTo="/app/students"
      createEndpoint="/users"
      createLabel="Create student"
      stylesTitle="Interested styles"
      stylesSummaryLabel="interests"
      stepSubtitles={[
        "Register a student at your studio.",
        "Select the dance styles they're interested in.",
      ]}
    />
  );
}
