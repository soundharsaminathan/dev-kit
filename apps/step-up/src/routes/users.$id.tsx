import { Button } from "@dev-ui/components/button";
import { Text } from "@dev-ui/components/text";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { MEMBER_ROLES } from "@/lib/constants";
import type { ChatConversation } from "@/modules/chat/types";
import { AppShell } from "@/modules/layout/app-shell";
import { PublicShell } from "@/modules/layout/public-shell";
import { ProfileHeader } from "@/modules/social/profile-header";
import { ProfileSkeleton } from "@/modules/social/profile-skeleton";
import { ProfileTabs } from "@/modules/social/profile-tabs";
import type { SocialProfile } from "@/modules/social/types";
import { useFollowMutations } from "@/modules/social/use-follow";
import { ApiState } from "@/modules/ui/api-state";
import { Screen } from "@/modules/ui/screen";
import styles from "./users.$id.module.scss";

export const Route = createFileRoute("/users/$id")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { id } = Route.useParams();
  const api = useApi();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const { follow, unfollow, isPendingFor } = useFollowMutations();

  const query = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api.get<SocialProfile>(`/users/${id}/profile`),
    enabled: Boolean(user),
  });

  const messageMutation = useMutation({
    mutationFn: () =>
      api.post<ChatConversation>("/chat/conversations", {
        type: "DM",
        memberIds: [id],
      }),
    onSuccess: (conversation) => {
      if (!user) return;
      const to = MEMBER_ROLES.includes(user.role)
        ? "/me/messages/$id"
        : "/app/messages/$id";
      void navigate({ to, params: { id: conversation.id } });
    },
  });

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    if (user && MEMBER_ROLES.includes(user.role)) {
      void navigate({ to: "/me/trainers" });
      return;
    }
    void navigate({ to: "/app/trainers" });
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <PublicShell>
        <section className="page-narrow stack">
          <Text>Sign in to view profiles.</Text>
          <Button variant="primary" onClick={() => navigate({ to: "/login" })}>
            Sign in
          </Button>
        </section>
      </PublicShell>
    );
  }

  const batchDetailTo = MEMBER_ROLES.includes(user.role)
    ? ("/me/batches/$id" as const)
    : ("/app/batches/$id" as const);
  const shellVariant = MEMBER_ROLES.includes(user.role) ? "me" : "app";

  return (
    <AppShell variant={shellVariant}>
      <Screen title={query.data?.name ?? "Profile"} showBack onBack={goBack}>
        {query.isLoading ? <ProfileSkeleton /> : null}
        {!query.isLoading ? (
          <ApiState
            isLoading={false}
            isError={query.isError}
            error={query.error}
            data={query.data}
            emptyTitle="Profile not found"
            emptyDescription="This profile is unavailable."
          >
            {(profile) => (
              <div className={styles.root}>
                <ProfileHeader
                  profile={profile}
                  followPending={isPendingFor(id)}
                  messagePending={messageMutation.isPending}
                  onFollow={() =>
                    follow(
                      id,
                      profile.profileVisibility === "PRIVATE"
                        ? "requested"
                        : "following",
                    )
                  }
                  onUnfollow={() => unfollow(id)}
                  onMessage={
                    profile.isOwnProfile
                      ? undefined
                      : () => messageMutation.mutate()
                  }
                  onEdit={
                    profile.isOwnProfile
                      ? () => {
                          void navigate({
                            to:
                              user.role === "STUDENT" || user.role === "PARENT"
                                ? "/me/profile/edit"
                                : "/app/profile",
                          });
                        }
                      : undefined
                  }
                />

                <ProfileTabs profile={profile} detailTo={batchDetailTo} />
              </div>
            )}
          </ApiState>
        ) : null}
      </Screen>
    </AppShell>
  );
}
