import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { IdeShell } from "@/shell/IdeShell";
import { useIde } from "@/state/IdeContext";

export const Route = createFileRoute("/agent")({
  component: AgentPage,
});

function AgentPage() {
  return (
    <>
      <OpenAgentOnMount />
      <IdeShell />
    </>
  );
}

function OpenAgentOnMount() {
  const { openAgent } = useIde();
  useEffect(() => {
    openAgent();
  }, [openAgent]);
  return null;
}
