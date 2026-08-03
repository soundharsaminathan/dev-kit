import { ThemeEditorPanel } from "@dev-ui/components/theme-editor";
import { useToastContext } from "@dev-ui/components/toast";
import { useTheme } from "@dev-ui/core";
import { type ThemeDraft, themeDraftToDefinition } from "@dev-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import {
  brandThemeToDraft,
  defaultStudioBrandDraft,
  draftToBrandTheme,
} from "@/modules/branding/brand-theme";
import { BrandingPanel } from "@/modules/branding/branding-panel";
import type { StudioBrandThemePayload } from "@/modules/branding/types";
import type { Studio } from "@/modules/settings/types";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import { StudioPaymentsFields } from "./studio-payments-fields";
import styles from "./studio-wizard.module.scss";

const STEPS = ["Details", "Theme", "Payments"] as const;

type CreateStudioResult = {
  id: string;
  name: string;
  owner: { id: string; email: string; name: string };
  ownerProvisioned: boolean;
  setupHint: string | null;
};

export type StudioWizardStudio = Studio & {
  owner?: { id: string; email: string; name: string };
};

type StudioWizardProps =
  | { mode: "create" }
  | { mode: "edit"; studio: StudioWizardStudio };

function themesEqual(
  a: StudioBrandThemePayload,
  b: StudioBrandThemePayload,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function StudioWizard(props: StudioWizardProps) {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioWizard");
  const { setLiveTheme, mode, setMode } = useTheme();
  const isCreate = props.mode === "create";
  const studio = props.mode === "edit" ? props.studio : null;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(studio?.name ?? "");
  const [ownerEmail, setOwnerEmail] = useState(studio?.owner?.email ?? "");
  const [ownerName, setOwnerName] = useState(studio?.owner?.name ?? "");
  const [address, setAddress] = useState(studio?.address ?? "");
  const [contact, setContact] = useState(studio?.contact ?? "");
  const [draft, setDraft] = useState<ThemeDraft>(() =>
    brandThemeToDraft(studio?.brandTheme, studio?.name ?? "Studio brand"),
  );
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const defaultThemePayload = useMemo(
    () =>
      draftToBrandTheme(defaultStudioBrandDraft(name.trim() || "Studio brand")),
    [name],
  );

  useEffect(() => {
    if (!studio) return;
    setName(studio.name);
    setOwnerEmail(studio.owner?.email ?? "");
    setOwnerName(studio.owner?.name ?? "");
    setAddress(studio.address ?? "");
    setContact(studio.contact ?? "");
    setDraft(brandThemeToDraft(studio.brandTheme, studio.name));
  }, [studio]);

  const previewThemeId = studio?.id ? `studio-${studio.id}` : "studio-preview";

  useLayoutEffect(() => {
    if (step !== 1) return;
    setLiveTheme(themeDraftToDefinition(draft, previewThemeId));
  }, [draft, previewThemeId, setLiveTheme, step]);

  useEffect(() => {
    return () => {
      setLiveTheme(null);
    };
  }, [setLiveTheme]);

  const detailsValid =
    name.trim().length > 0 && (isCreate ? ownerEmail.trim().length > 0 : true);

  const stepIsValid = [detailsValid, true, true] as const;

  const createMutation = useMutation({
    mutationFn: async (options: { includePayments: boolean }) => {
      const created = await api.post<CreateStudioResult>("/studios", {
        name: name.trim(),
        ownerEmail: ownerEmail.trim(),
        ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      });

      const brandTheme = draftToBrandTheme(draft);
      if (!themesEqual(brandTheme, defaultThemePayload)) {
        await api.patch(`/studios/${created.id}`, { brandTheme });
      }

      if (options.includePayments) {
        const nextKeyId = razorpayKeyId.trim();
        const nextSecret = razorpayKeySecret.trim();
        if (nextSecret && !nextKeyId) {
          throw new Error(
            "Enter the Razorpay key ID together with the secret.",
          );
        }
        if (nextKeyId || nextSecret) {
          await api.patch(`/studios/${created.id}/settings`, {
            graceDays: 3,
            expireAlertDays: 7,
            platformFeePercent: 5,
            ...(nextKeyId ? { razorpayKeyId: nextKeyId } : {}),
            ...(nextSecret ? { razorpayKeySecret: nextSecret } : {}),
          });
        }
      }

      return created;
    },
    onSuccess: (result) => {
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "studios"] });
      toast({
        title: "Studio created",
        description: result.setupHint
          ? result.setupHint
          : `${result.name} was provisioned successfully.`,
        variant: "success",
      });
      void navigate({ to: "/admin" });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Could not create studio.";
      setFormError(message);
      toast({
        title: "Couldn’t create studio",
        description: message,
        variant: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!studio) {
        throw new Error("Studio missing");
      }

      await api.patch(`/studios/${studio.id}`, {
        name: name.trim(),
        address: address.trim(),
        contact: contact.trim(),
        brandTheme: draftToBrandTheme(draft),
      });

      const nextKeyId = razorpayKeyId.trim() || studio.settings?.razorpayKeyId;
      const nextSecret = razorpayKeySecret.trim();
      if (nextSecret && !nextKeyId) {
        throw new Error("Enter the Razorpay key ID together with the secret.");
      }

      const paymentsTouched =
        Boolean(razorpayKeyId.trim()) || Boolean(nextSecret);
      if (paymentsTouched) {
        await api.patch(`/studios/${studio.id}/settings`, {
          graceDays: studio.settings?.graceDays ?? 3,
          expireAlertDays: studio.settings?.expireAlertDays ?? 7,
          platformFeePercent: studio.settings?.platformFeePercent ?? 5,
          ...(nextKeyId ? { razorpayKeyId: nextKeyId } : {}),
          ...(nextSecret ? { razorpayKeySecret: nextSecret } : {}),
        });
      }
    },
    onSuccess: () => {
      setFormError(null);
      setRazorpayKeySecret("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "studios"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "studio", studio?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["studio", studio?.id],
      });
      toast({
        title: "Studio updated",
        description: "Studio details, theme, and payments were saved.",
        variant: "success",
      });
      void navigate({ to: "/admin" });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Could not update studio.";
      setFormError(message);
      toast({
        title: "Couldn’t update studio",
        description: message,
        variant: "error",
      });
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Screen
        title={isCreate ? "Create studio" : "Edit studio"}
        subtitle={
          isCreate
            ? "Provision a tenant studio with theme and optional payments."
            : "Update studio details, branding, and payments."
        }
        showBack
        backTo="/admin"
        paddedCta
      >
        <div className={styles.steps} aria-hidden>
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`${styles.step} ${
                index === step
                  ? styles.stepActive
                  : index < step
                    ? styles.stepComplete
                    : ""
              }`}
            />
          ))}
        </div>
        <p className={styles.stepLabel}>
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        {formError ? <ErrorState description={formError} /> : null}

        {step === 0 ? (
          <section className={staff.section}>
            <FormInput
              label="Studio name"
              value={name}
              onChange={setName}
              required
              autoComplete="organization"
            />
            {isCreate ? (
              <>
                <FormInput
                  label="Owner email"
                  type="email"
                  value={ownerEmail}
                  onChange={setOwnerEmail}
                  required
                  autoComplete="email"
                />
                <FormInput
                  label="Owner name"
                  value={ownerName}
                  onChange={setOwnerName}
                  autoComplete="name"
                />
              </>
            ) : (
              <p className={styles.ownerMeta}>
                Owner {studio?.owner?.name ?? "—"} ·{" "}
                {studio?.owner?.email ?? "—"}
              </p>
            )}
            <FormInput
              label="Address"
              value={address}
              onChange={setAddress}
              autoComplete="street-address"
            />
            <FormInput
              label="Contact"
              value={contact}
              onChange={setContact}
              autoComplete="tel"
            />
          </section>
        ) : null}

        {step === 1 ? (
          <section className={`${staff.section} ${styles.themePreview}`}>
            <div className={staff.softPanel}>
              <p className={staff.panelTitle}>Theme</p>
              <p className={staff.panelDesc}>
                Match the owner branding theme editor. Preview updates live.
              </p>
              <div className={styles.steps}>
                <TouchButton
                  variant="default"
                  onClick={() => setMode(mode === "light" ? "dark" : "light")}
                >
                  Preview {mode === "light" ? "dark" : "light"}
                </TouchButton>
              </div>
              <ThemeEditorPanel value={draft} onChange={setDraft} />
            </div>
            {studio ? (
              <div className={styles.assetsBlock}>
                <BrandingPanel
                  studioId={studio.id}
                  studioName={name.trim() || studio.name}
                  logoUrl={studio.logoUrl}
                  heroMobileUrl={studio.heroMobileUrl}
                  heroDesktopUrl={studio.heroDesktopUrl}
                  brandTheme={studio.brandTheme}
                  showTheme={false}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 2 ? (
          <StudioPaymentsFields
            razorpayKeyId={razorpayKeyId}
            razorpayKeySecret={razorpayKeySecret}
            savedKeyId={studio?.settings?.razorpayKeyId ?? ""}
            configured={Boolean(studio?.settings?.razorpayConfigured)}
            onKeyIdChange={setRazorpayKeyId}
            onKeySecretChange={setRazorpayKeySecret}
          />
        ) : null}
      </Screen>

      <StickyCtaBar
        secondary={
          <TouchButton
            variant="default"
            fullWidth
            isDisabled={pending}
            onClick={() => {
              if (step > 0) {
                setStep(step - 1);
                return;
              }
              void navigate({ to: "/admin" });
            }}
          >
            {step > 0 ? "Back" : "Cancel"}
          </TouchButton>
        }
      >
        {step < STEPS.length - 1 ? (
          <TouchButton
            variant="primary"
            fullWidth
            data-testid="studio-wizard-next"
            isDisabled={!stepIsValid[step]}
            onClick={() => setStep(step + 1)}
          >
            Next
          </TouchButton>
        ) : isCreate ? (
          <>
            <TouchButton
              variant="default"
              fullWidth
              data-testid="studio-wizard-skip-create"
              isPending={pending}
              isDisabled={!detailsValid}
              onClick={() => createMutation.mutate({ includePayments: false })}
            >
              Skip & create
            </TouchButton>
            <TouchButton
              variant="primary"
              fullWidth
              data-testid="studio-wizard-create"
              isPending={pending}
              isDisabled={!detailsValid}
              onClick={() => createMutation.mutate({ includePayments: true })}
            >
              Create studio
            </TouchButton>
          </>
        ) : (
          <TouchButton
            variant="primary"
            fullWidth
            data-testid="studio-wizard-save"
            isPending={pending}
            isDisabled={!detailsValid}
            onClick={() => updateMutation.mutate()}
          >
            Save changes
          </TouchButton>
        )}
      </StickyCtaBar>
    </>
  );
}
