import { createFileRoute, redirect } from "@tanstack/react-router";
import { StudioBrandingPage } from "@/modules/settings/studio-branding-page";

export const Route = createFileRoute("/app/settings/branding")({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== "OWNER") {
      throw redirect({ to: "/app/settings/profile" });
    }
  },
  component: StudioBrandingPage,
});
