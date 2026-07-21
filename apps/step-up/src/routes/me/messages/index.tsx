import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessagesPage } from "@/modules/chat/messages-page";

export const Route = createFileRoute("/me/messages/")({
  component: MemberMessagesPage,
});

function MemberMessagesPage() {
  const navigate = useNavigate();

  return (
    <MessagesPage
      onSelect={(id) =>
        void navigate({ to: "/me/messages/$id", params: { id } })
      }
      onBack={() => void navigate({ to: "/me/messages" })}
    />
  );
}
