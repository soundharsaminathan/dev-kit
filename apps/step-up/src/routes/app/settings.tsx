import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
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
};

type Studio = {
  id: string;
  name: string;
  address: string;
  contact: string;
  settings: StudioSettings | null;
};

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const studioQuery = useQuery({
    queryKey: ["studio", STUDIO_ID],
    queryFn: () => api.get<Studio>(`/studios/${STUDIO_ID}`),
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [graceDays, setGraceDays] = useState("");
  const [expireAlertDays, setExpireAlertDays] = useState("");
  const [platformFeePercent, setPlatformFeePercent] = useState("");

  const updateStudio = useMutation({
    mutationFn: () =>
      api.patch(`/studios/${STUDIO_ID}`, {
        name: name || studioQuery.data?.name,
        address: address || studioQuery.data?.address,
        contact: contact || studioQuery.data?.contact,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["studio", STUDIO_ID] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", STUDIO_ID],
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
      } = {
        graceDays: Number(graceDays || (settings?.graceDays ?? 3)),
        expireAlertDays: Number(
          expireAlertDays || (settings?.expireAlertDays ?? 7),
        ),
      };

      if (user?.role === "OWNER") {
        payload.platformFeePercent = Number(
          platformFeePercent || (settings?.platformFeePercent ?? 5),
        );
      }

      return api.patch(`/studios/${STUDIO_ID}/settings`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["studio", STUDIO_ID] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", STUDIO_ID],
      });
    },
  });

  const saving = updateStudio.isPending || updateSettings.isPending;

  function saveAll() {
    updateStudio.mutate();
    updateSettings.mutate();
  }

  return (
    <>
      <Screen
        title="Studio settings"
        subtitle="Update studio profile and billing preferences."
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
              {user?.role === "OWNER" ? (
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
