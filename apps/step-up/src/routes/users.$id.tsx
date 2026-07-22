import { Button } from "@dev-ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@dev-ui/components/empty";
import { Text } from "@dev-ui/components/text";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { MEMBER_ROLES } from "@/lib/constants";
import { PublicShell } from "@/modules/layout/public-shell";
import { PostGrid } from "@/modules/social/post-grid";
import { ProfileHeader } from "@/modules/social/profile-header";
import type { SocialProfile } from "@/modules/social/types";
import { useFollowMutations } from "@/modules/social/use-follow";
import { ApiState } from "@/modules/ui/api-state";
import { TouchButton } from "@/modules/ui/touch-button";

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

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    if (user && MEMBER_ROLES.includes(user.role)) {
      void navigate({ to: "/me/profile" });
      return;
    }
    void navigate({ to: "/app/profile" });
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

  return (
    <section className="page-narrow stack">
      <TouchButton variant="quiet" size="sm" onClick={goBack}>
        Back
      </TouchButton>
      <ApiState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        data={query.data}
        emptyTitle="Profile not found"
        emptyDescription="This profile is unavailable."
      >
        {(profile) => (
          <>
            <ProfileHeader
              profile={profile}
              followPending={isPendingFor(id)}
              onFollow={() =>
                follow(
                  id,
                  profile.profileVisibility === "PRIVATE"
                    ? "requested"
                    : "following",
                )
              }
              onUnfollow={() => unfollow(id)}
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

            {profile.canViewContent ? (
              profile.posts.length > 0 ? (
                <PostGrid posts={profile.posts} />
              ) : (
                <Empty>
                  <EmptyTitle>No posts yet</EmptyTitle>
                  <EmptyDescription>
                    {profile.isOwnProfile
                      ? "Share your first photo from the feed."
                      : "This profile has not posted yet."}
                  </EmptyDescription>
                </Empty>
              )
            ) : (
              <Empty>
                <EmptyTitle>This account is private</EmptyTitle>
                <EmptyDescription>
                  Follow this account to see their photos.
                </EmptyDescription>
              </Empty>
            )}
          </>
        )}
      </ApiState>
    </section>
  );
}
