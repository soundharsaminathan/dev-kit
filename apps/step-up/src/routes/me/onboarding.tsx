import { createFileRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "@/modules/onboarding/onboarding-wizard";

export const Route = createFileRoute("/me/onboarding")({
  component: MeOnboardingPage,
});

function MeOnboardingPage() {
  return <OnboardingWizard />;
}
