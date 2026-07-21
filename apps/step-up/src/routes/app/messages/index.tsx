import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessagesPage } from "@/modules/chat/messages-page";

export const Route = createFileRoute("/app/messages/")({
  component: AppMessagesPage,
});

function AppMessagesPage() {
  const navigate = useNavigate();

  return (
    <MessagesPage
      onSelect={(id) =>
        void navigate({ to: "/app/messages/$id", params: { id } })
      }
      onBack={() => void navigate({ to: "/app/messages" })}
    />
  );
}
