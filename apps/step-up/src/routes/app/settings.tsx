import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { BrandingPanel } from "@/modules/branding/branding-panel";
import type { StudioBrandThemePayload } from "@/modules/branding/types";
import { InstallAppPanel } from "@/modules/pwa/install-app-panel";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";

type StudioSettings = {
  graceDays: number;
  expireAlertDays: number;
  platformFeePercent: number;
  razorpayKeyId?: string | null;
  razorpayConfigured?: boolean;
};

type Studio = {
  id: string;
  name: string;
  address: string;
  contact: string;
  logoUrl?: string | null;
  brandTheme?: StudioBrandThemePayload | null;
  settings: StudioSettings | null;
};

type StaffInvite = {
  id: string;
  email: string;
  role: "STAFF" | "TRAINER";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
  inviteUrl?: string;
};

export const Route = createFileRoute("/app/settings")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: SettingsPage,
});

function SettingsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === "OWNER";

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const invitesQuery = useQuery({
    queryKey: ["staff-invites", studioId],
    queryFn: () => api.get<StaffInvite[]>(`/staff-invites/studio/${studioId}`),
    enabled: user?.role === "OWNER" || user?.role === "STAFF",
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [graceDays, setGraceDays] = useState("");
  const [expireAlertDays, setExpireAlertDays] = useState("");
  const [platformFeePercent, setPlatformFeePercent] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"STAFF" | "TRAINER">("STAFF");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const updateStudio = useMutation({
    mutationFn: () =>
      api.patch(`/studios/${studioId}`, {
        name: name || studioQuery.data?.name,
        address: address || studioQuery.data?.address,
        contact: contact || studioQuery.data?.contact,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
    },
  });

  const updateSettings = useMutation({
    mutationFn: () => {
      const settings = studioQuery.data?.settings;
      const payload: {
        graceDays: number;
        expireAlertDays: number;
        platformFeePercent?: number;
        razorpayKeyId?: string;
        razorpayKeySecret?: string;
      } = {
        graceDays: Number(graceDays || (settings?.graceDays ?? 3)),
        expireAlertDays: Number(
          expireAlertDays || (settings?.expireAlertDays ?? 7),
        ),
      };

      if (isOwner) {
        payload.platformFeePercent = Number(
          platformFeePercent || (settings?.platformFeePercent ?? 5),
        );
        if (razorpayKeyId.trim()) {
          payload.razorpayKeyId = razorpayKeyId.trim();
        }
        if (razorpayKeySecret.trim()) {
          payload.razorpayKeySecret = razorpayKeySecret.trim();
        }
      }

      return api.patch(`/studios/${studioId}/settings`, payload);
    },
    onSuccess: () => {
      setRazorpayKeySecret("");
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
    },
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
    },
  });

  const revokeInvite = useMutation({
    mutationFn: (id: string) => api.post(`/staff-invites/${id}/revoke`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["staff-invites", studioId],
      });
    },
  });

  const saving = updateStudio.isPending || updateSettings.isPending;

  function saveAll() {
    updateStudio.mutate();
    updateSettings.mutate();
  }

  const pendingInvites = (invitesQuery.data ?? []).filter(
    (invite) => invite.status === "PENDING",
  );

  return (
    <>
      <Screen
        title="Studio settings"
        subtitle="Update studio profile, branding, payments, and team invites."
        paddedCta
      >
        {studioQuery.isLoading ? (
          <div className={staff.sheetStack}>
            <SkeletonBlock height="10rem" radius="var(--radius-2xl)" />
            <SkeletonBlock height="8rem" radius="var(--radius-2xl)" />
          </div>
        ) : null}

        {studioQuery.isError ? (
          <ErrorState
            description={
              studioQuery.error instanceof Error
                ? studioQuery.error.message
                : "Unable to load studio settings."
            }
            action={
              <TouchButton
                variant="primary"
                onClick={() => studioQuery.refetch()}
              >
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {studioQuery.isFetched && !studioQuery.data ? (
          <EmptyState
            title="Studio not found"
            description="Unable to load studio settings."
          />
        ) : null}

        <div className={staff.section}>
          <InstallAppPanel />
        </div>

        {studioQuery.data ? (
          <div className={staff.section}>
            <div className={staff.softPanel}>
              <p className={staff.panelTitle}>Profile</p>
              <p className={staff.panelDesc}>{studioQuery.data.name}</p>
              <FormInput
                label="Name"
                value={name || studioQuery.data.name}
                onChange={setName}
              />
              <FormInput
                label="Address"
                value={address || studioQuery.data.address}
                onChange={setAddress}
              />
              <FormInput
                label="Contact"
                value={contact || studioQuery.data.contact}
                onChange={setContact}
              />
            </div>

            {isOwner ? (
              <BrandingPanel
                studioName={studioQuery.data.name}
                logoUrl={studioQuery.data.logoUrl ?? null}
                brandTheme={studioQuery.data.brandTheme ?? null}
              />
            ) : null}

            <div className={staff.softPanel}>
              <p className={staff.panelTitle}>Billing settings</p>
              <p className={staff.panelDesc}>
                Grace period, expiry alerts, and platform fee
              </p>
              <FormInput
                label="Grace days"
                type="number"
                value={
                  graceDays || String(studioQuery.data.settings?.graceDays ?? 3)
                }
                onChange={setGraceDays}
              />
              <FormInput
                label="Expire alert days"
                type="number"
                value={
                  expireAlertDays ||
                  String(studioQuery.data.settings?.expireAlertDays ?? 7)
                }
                onChange={setExpireAlertDays}
              />
              {isOwner ? (
                <FormInput
                  label="Platform fee percent"
                  type="number"
                  value={
                    platformFeePercent ||
                    String(studioQuery.data.settings?.platformFeePercent ?? 5)
                  }
                  onChange={setPlatformFeePercent}
                />
              ) : null}
            </div>

            {isOwner ? (
              <div className={staff.softPanel}>
                <p className={staff.panelTitle}>Payments</p>
                <p className={staff.panelDesc}>
                  {studioQuery.data.settings?.razorpayConfigured
                    ? "Using studio Razorpay keys"
                    : "Using env keys or demo checkout when unset"}
                </p>
                <FormInput
                  label="Razorpay key ID"
                  value={
                    razorpayKeyId ||
                    studioQuery.data.settings?.razorpayKeyId ||
                    ""
                  }
                  onChange={setRazorpayKeyId}
                  placeholder="rzp_live_…"
                  autoComplete="off"
                />
                <FormInput
                  label="Razorpay key secret"
                  type="password"
                  value={razorpayKeySecret}
                  onChange={setRazorpayKeySecret}
                  placeholder="Leave blank to keep current"
                  autoComplete="new-password"
                />
              </div>
            ) : null}

            {user?.role === "OWNER" || user?.role === "STAFF" ? (
              <div className={staff.softPanel}>
                <p className={staff.panelTitle}>Team invites</p>
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

                {invitesQuery.isLoading ? (
                  <SkeletonBlock height="4rem" radius="var(--radius-xl)" />
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
            ) : null}
          </div>
        ) : null}
      </Screen>

      {studioQuery.data ? (
        <StickyCtaBar>
          <TouchButton
            variant="primary"
            fullWidth
            onClick={saveAll}
            isPending={saving}
          >
            Save settings
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}
