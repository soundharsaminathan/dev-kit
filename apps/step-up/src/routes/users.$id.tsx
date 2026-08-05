import { Button } from "@dev-ui/components/button";
import { Text } from "@dev-ui/components/text";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import type { AuthUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { ADMIN_ROLES, MEMBER_ROLES } from "@/lib/constants";
import type { ChatConversation } from "@/modules/chat/types";
import { AppShell } from "@/modules/layout/app-shell";
import { PublicShell } from "@/modules/layout/public-shell";
import { TemporaryCredentialsPanel } from "@/modules/members/temporary-credentials-panel";
import { ProfileHeader } from "@/modules/social/profile-header";
import { ProfileSkeleton } from "@/modules/social/profile-skeleton";
import { ProfileTabs } from "@/modules/social/profile-tabs";
import type { SocialProfile } from "@/modules/social/types";
import { useFollowMutations } from "@/modules/social/use-follow";
import { ApiState } from "@/modules/ui/api-state";
import { AppSheet } from "@/modules/ui/app-sheet";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./users.$id.module.scss";

export const Route = createFileRoute("/users/$id")({
  component: UserProfilePage,
});

type TemporaryCredentials = {
  email: string;
  temporaryPassword: string;
};

function UserProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <GuestProfileGate />;
  }

  return <AuthedUserProfile user={user} />;
}

function GuestProfileGate() {
  const navigate = useNavigate();
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

function AuthedUserProfile({ user }: { user: AuthUser }) {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate();
  const router = useRouter();
  const { toast } = useToastContext("UserProfilePage");
  const { follow, unfollow, isPendingFor } = useFollowMutations();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCredentials, setResetCredentials] =
    useState<TemporaryCredentials | null>(null);

  const query = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api.get<SocialProfile>(`/users/${id}/profile`),
  });

  const messageMutation = useMutation({
    mutationFn: () =>
      api.post<ChatConversation>("/chat/conversations", {
        type: "DM",
        memberIds: [id],
      }),
    onSuccess: (conversation) => {
      const to = MEMBER_ROLES.includes(user.role)
        ? "/me/messages/$id"
        : "/app/messages/$id";
      void navigate({ to, params: { id: conversation.id } });
    },
  });

  const resetPassword = useMutation({
    mutationFn: () => {
      if (!user.studioId) {
        throw new Error("Studio is required");
      }
      return api.post<TemporaryCredentials>(
        `/users/studio/${user.studioId}/trainers/${id}/reset-password`,
        {},
      );
    },
    onSuccess: (result) => {
      setResetCredentials({
        email: result.email,
        temporaryPassword: result.temporaryPassword,
      });
      toast({
        title: "Temporary password ready",
        description: "Share it once — shown only on this screen.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t reset password",
        description:
          error instanceof Error
            ? error.message
            : "Could not generate a temporary password.",
        variant: "error",
      });
    },
  });

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} copied`,
        variant: "success",
      });
    } catch {
      toast({
        title: `Couldn’t copy ${label.toLowerCase()}`,
        variant: "error",
      });
    }
  }

  function closeResetSheet() {
    setResetOpen(false);
    setResetCredentials(null);
  }

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    if (MEMBER_ROLES.includes(user.role)) {
      void navigate({ to: "/me/trainers" });
      return;
    }
    void navigate({ to: "/app/trainers" });
  };

  const batchDetailTo = MEMBER_ROLES.includes(user.role)
    ? ("/me/batches/$id" as const)
    : ("/app/batches/$id" as const);
  const shellVariant = MEMBER_ROLES.includes(user.role) ? "me" : "app";
  const canResetTrainerPassword =
    ADMIN_ROLES.includes(user.role) &&
    Boolean(user.studioId) &&
    query.data?.role === "TRAINER" &&
    query.data.studioId === user.studioId &&
    !query.data.isOwnProfile;

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
                  onResetPassword={
                    canResetTrainerPassword
                      ? () => {
                          setResetCredentials(null);
                          setResetOpen(true);
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

      <AppSheet
        isOpen={resetOpen}
        onOpenChange={(open) => {
          if (!open) closeResetSheet();
        }}
        title={
          resetCredentials ? "Temporary password" : "Reset trainer password"
        }
      >
        <div className={staff.sheetStack}>
          {resetCredentials ? (
            <>
              <TemporaryCredentialsPanel
                email={resetCredentials.email}
                temporaryPassword={resetCredentials.temporaryPassword}
                eyebrow="Trainer access"
                helpText="This password is shown once. The trainer must set a new password on first login."
                onCopy={(label, value) => void copyText(label, value)}
              />
              <div className={staff.sheetActions}>
                <TouchButton
                  variant="primary"
                  fullWidth
                  data-testid="reset-trainer-password-done"
                  onClick={closeResetSheet}
                >
                  Done
                </TouchButton>
              </div>
            </>
          ) : (
            <>
              <p className={staff.rowMeta}>
                Generate a new temporary password for “{query.data?.name}”?
                Their current password will stop working, and they’ll need to
                change this one on next login.
              </p>
              {resetPassword.isError ? (
                <ErrorState
                  description={
                    resetPassword.error instanceof Error
                      ? resetPassword.error.message
                      : "Could not reset password."
                  }
                />
              ) : null}
              <div className={staff.sheetActions}>
                <TouchButton
                  variant="default"
                  fullWidth
                  isDisabled={resetPassword.isPending}
                  onClick={closeResetSheet}
                >
                  Cancel
                </TouchButton>
                <TouchButton
                  variant="primary"
                  fullWidth
                  isPending={resetPassword.isPending}
                  data-testid="confirm-reset-trainer-password"
                  onClick={() => resetPassword.mutate()}
                >
                  Generate temporary password
                </TouchButton>
              </div>
            </>
          )}
        </div>
      </AppSheet>
    </AppShell>
  );
}
