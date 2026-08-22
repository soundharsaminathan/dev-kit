import { createFileRoute, redirect } from "@tanstack/react-router";
import { StudioDanceStylesFormPage } from "@/modules/settings/studio-dance-styles-form-page";

export const Route = createFileRoute("/app/settings/styles")({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== "OWNER") {
      throw redirect({ to: "/app/settings/profile" });
    }
  },
  component: StudioDanceStylesFormPage,
});
