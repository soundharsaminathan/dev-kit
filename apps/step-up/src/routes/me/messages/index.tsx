import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessagesPage } from "@/modules/chat/messages-page";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

export const Route = createFileRoute("/me/messages/")({
  component: MemberMessagesPage,
});

function MemberMessagesPage() {
  const navigate = useNavigate();

  return (
    <RequireStudioFeature feature="chat">
      <MessagesPage
        onSelect={(id) =>
          void navigate({ to: "/me/messages/$id", params: { id } })
        }
        onBack={() => void navigate({ to: "/me/messages" })}
      />
    </RequireStudioFeature>
  );
}
