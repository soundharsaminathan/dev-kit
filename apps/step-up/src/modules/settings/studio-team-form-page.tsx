import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { StaffInvite } from "./types";

export function StudioTeamFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioTeamFormPage");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"STAFF" | "TRAINER">("STAFF");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const invitesQuery = useQuery({
    queryKey: ["staff-invites", studioId],
    queryFn: () => api.get<StaffInvite[]>(`/staff-invites/studio/${studioId}`),
  });

  const createInvite = useMutation({
    mutationFn: () =>
      api.post<StaffInvite>("/staff-invites", {
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    onSuccess: (invite) => {
      setInviteEmail("");
      setLastInviteUrl(invite.inviteUrl ?? null);
      void queryClient.invalidateQueries({
        queryKey: ["staff-invites", studioId],
      });
      toast({
        title: "Invite sent",
        description: `Invite created for ${invite.email}.`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t send invite",
        description:
          error instanceof Error ? error.message : "Could not send invite.",
        variant: "error",
      });
    },
  });

  const revokeInvite = useMutation({
    mutationFn: (id: string) => api.post(`/staff-invites/${id}/revoke`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["staff-invites", studioId],
      });
      toast({
        title: "Invite revoked",
        description: "The pending invite was revoked.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t revoke invite",
        description:
          error instanceof Error ? error.message : "Could not revoke invite.",
        variant: "error",
      });
    },
  });

  const pendingInvites = (invitesQuery.data ?? []).filter(
    (invite) => invite.status === "PENDING",
  );

  return (
    <Screen
      title="Team invites"
      subtitle="Email a join link for staff or trainers."
      showBack
      backTo="/app/settings"
    >
      <div className={staff.softPanel}>
        <p className={staff.panelTitle}>Send invite</p>
        <p className={staff.panelDesc}>
          Email a join link for staff or trainers
        </p>
        <FormInput
          label="Email"
          type="email"
          value={inviteEmail}
          onChange={setInviteEmail}
          placeholder="teammate@studio.com"
        />
        <div className={staff.rowActions}>
          <TouchButton
            size="sm"
            variant={inviteRole === "STAFF" ? "primary" : "quiet"}
            onClick={() => setInviteRole("STAFF")}
          >
            Staff
          </TouchButton>
          <TouchButton
            size="sm"
            variant={inviteRole === "TRAINER" ? "primary" : "quiet"}
            onClick={() => setInviteRole("TRAINER")}
          >
            Trainer
          </TouchButton>
        </div>
        <TouchButton
          variant="primary"
          fullWidth
          isDisabled={!inviteEmail.trim()}
          isPending={createInvite.isPending}
          onClick={() => createInvite.mutate()}
        >
          Send invite
        </TouchButton>
        {createInvite.isError ? (
          <ErrorState
            description={
              createInvite.error instanceof Error
                ? createInvite.error.message
                : "Could not send invite."
            }
          />
        ) : null}
        {lastInviteUrl ? (
          <p className={staff.panelDesc}>
            Invite link: <code>{lastInviteUrl}</code>
          </p>
        ) : null}
      </div>

      <div className={staff.softPanel}>
        <p className={staff.panelTitle}>Pending invites</p>
        {invitesQuery.isLoading ? (
          <SkeletonBlock height="4rem" radius="var(--radius-xl)" />
        ) : null}
        {invitesQuery.isError ? (
          <ErrorState
            description={
              invitesQuery.error instanceof Error
                ? invitesQuery.error.message
                : "Unable to load invites."
            }
          />
        ) : null}
        {pendingInvites.length > 0 ? (
          <div className={staff.list}>
            {pendingInvites.map((invite) => (
              <div key={invite.id} className={staff.rowCard}>
                <p className={staff.rowTitle}>{invite.email}</p>
                <p className={staff.rowMeta}>
                  {invite.role} · expires{" "}
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </p>
                <TouchButton
                  size="sm"
                  variant="quiet"
                  isPending={revokeInvite.isPending}
                  onClick={() => revokeInvite.mutate(invite.id)}
                >
                  Revoke
                </TouchButton>
              </div>
            ))}
          </div>
        ) : (
          <p className={staff.panelDesc}>No pending invites.</p>
        )}
      </div>
    </Screen>
  );
}
