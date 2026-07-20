import { createFileRoute } from "@tanstack/react-router";
import { IdeShell } from "@/shell/IdeShell";

export const Route = createFileRoute("/")({
  component: PortfolioPage,
});

function PortfolioPage() {
  return <IdeShell />;
}
