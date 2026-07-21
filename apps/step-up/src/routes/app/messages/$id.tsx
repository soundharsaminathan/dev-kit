import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessagesPage } from "@/modules/chat/messages-page";

export const Route = createFileRoute("/app/messages/$id")({
  component: AppConversationPage,
});

function AppConversationPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  return (
    <MessagesPage
      conversationId={id}
      onSelect={(next) =>
        void navigate({ to: "/app/messages/$id", params: { id: next } })
      }
      onBack={() => void navigate({ to: "/app/messages" })}
    />
  );
}
