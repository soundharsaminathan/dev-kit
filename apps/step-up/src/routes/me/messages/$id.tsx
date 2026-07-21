import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessagesPage } from "@/modules/chat/messages-page";

export const Route = createFileRoute("/me/messages/$id")({
  component: MemberConversationPage,
});

function MemberConversationPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  return (
    <MessagesPage
      conversationId={id}
      onSelect={(next) =>
        void navigate({ to: "/me/messages/$id", params: { id: next } })
      }
      onBack={() => void navigate({ to: "/me/messages" })}
    />
  );
}
