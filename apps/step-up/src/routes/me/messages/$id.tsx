import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessagesPage } from "@/modules/chat/messages-page";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

export const Route = createFileRoute("/me/messages/$id")({
  component: MemberConversationPage,
});

function MemberConversationPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  return (
    <RequireStudioFeature feature="chat">
      <MessagesPage
        conversationId={id}
        onSelect={(next) =>
          void navigate({ to: "/me/messages/$id", params: { id: next } })
        }
        onBack={() => void navigate({ to: "/me/messages" })}
      />
    </RequireStudioFeature>
  );
}
