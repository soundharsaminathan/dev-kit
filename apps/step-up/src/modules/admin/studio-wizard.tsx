import { Button } from "@dev-ui/components/button";
import { Label } from "@dev-ui/components/field";
import { ThemeColorPanel } from "@dev-ui/components/theme-editor";
import { useToastContext } from "@dev-ui/components/toast";
import { useTheme } from "@dev-ui/core";
import { type ThemeDraft, themeDraftToDefinition } from "@dev-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { PasswordInput } from "@/modules/ui/password-input";
import { StudioPaymentsFields } from "./studio-payments-fields";
import styles from "./studio-wizard.module.scss";

const STEPS = ["Details", "Theme", "Payments"] as const;

type CreateStudioResult = {
  id: string;
  name: string;
  owner: { id: string; email: string; name: string };
  ownerProvisioned: boolean;
  temporaryPassword: string | null;
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

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let value = "Su-";
  for (const byte of bytes) {
    value += alphabet[byte % alphabet.length];
  }
  return value;
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
  const [temporaryPassword, setTemporaryPassword] = useState(() =>
    generateTemporaryPassword(),
  );
  const [draft, setDraft] = useState<ThemeDraft>(() =>
    brandThemeToDraft(studio?.brandTheme, studio?.name ?? "Studio brand"),
  );
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreateStudioResult | null>(
    null,
  );

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
    name.trim().length > 0 &&
    (isCreate
      ? ownerEmail.trim().length > 0 && temporaryPassword.trim().length >= 8
      : true);

  const stepIsValid = [detailsValid, true, true] as const;

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

  const createMutation = useMutation({
    mutationFn: async (options: { includePayments: boolean }) => {
      const created = await api.post<CreateStudioResult>("/studios", {
        name: name.trim(),
        ownerEmail: ownerEmail.trim(),
        temporaryPassword: temporaryPassword.trim(),
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
      setCreatedResult(result);
      void queryClient.invalidateQueries({ queryKey: ["admin", "studios"] });
      toast({
        title: "Studio created",
        description: result.setupHint
          ? result.setupHint
          : `${result.name} was provisioned successfully.`,
        variant: "success",
      });
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
  const progressPct = ((step + 1) / STEPS.length) * 100;

  if (createdResult) {
    const passwordToShare =
      createdResult.temporaryPassword ?? temporaryPassword;
    return (
      <section className={`page stack ${styles.create}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.brandMark}>
              <span className={styles.brandDot} aria-hidden />
              Step Up · Admin
            </p>
            <h1 className={styles.heroTitle}>Studio ready</h1>
            <p className={styles.heroDescription}>
              {createdResult.name} is live. Share these credentials with the
              owner — they’ll change the password on first login.
            </p>
          </div>
        </header>

        <div className={styles.wizard}>
          <div className={`${styles.panel} ${styles.successPanel}`}>
            <div className={styles.panelHeader}>
              <p className={styles.eyebrow}>Owner access</p>
              <h2>Temporary login</h2>
            </div>
            <div className={styles.credentialList}>
              <div className={styles.credentialRow}>
                <div>
                  <p className={styles.credentialLabel}>Email</p>
                  <p className={styles.credentialValue}>
                    {createdResult.owner.email}
                  </p>
                </div>
                <Button
                  variant="quiet"
                  type="button"
                  onClick={() =>
                    void copyText("Email", createdResult.owner.email)
                  }
                >
                  Copy
                </Button>
              </div>
              <div className={styles.credentialRow}>
                <div>
                  <p className={styles.credentialLabel}>Temporary password</p>
                  <p
                    className={styles.credentialValue}
                    data-testid="studio-temp-password"
                  >
                    {passwordToShare}
                  </p>
                </div>
                <Button
                  variant="quiet"
                  type="button"
                  onClick={() =>
                    void copyText("Temporary password", passwordToShare)
                  }
                >
                  Copy
                </Button>
              </div>
            </div>
            <p className={styles.help}>
              This password is shown once here. The owner must set a new
              password before using the studio app.
            </p>
            <div className={styles.actions}>
              <Button
                variant="primary"
                type="button"
                onClick={() => void navigate({ to: "/admin" })}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`page stack ${styles.create}`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.brandMark}>
            <span className={styles.brandDot} aria-hidden />
            Step Up · Admin
          </p>
          <h1 className={styles.heroTitle}>
            {isCreate ? "New studio" : "Edit studio"}
          </h1>
          <p className={styles.heroDescription}>
            {isCreate
              ? "Provision a tenant — details, brand theme, and optional payments — in a focused few steps."
              : "Update studio details, branding, and payments."}
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button as={Link} to="/admin" variant="quiet">
            Cancel
          </Button>
        </div>
      </header>

      <div
        className={styles.progressMeter}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-label="Studio setup progress"
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className={styles.wizard}>
        <nav className={styles.steps} aria-label="Studio setup steps">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={styles.step}
              data-active={index === step || undefined}
              data-complete={index < step || undefined}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </nav>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.eyebrow}>
              Step {step + 1} of {STEPS.length}
            </p>
            <h2>{STEPS[step]}</h2>
          </div>

          {step === 0 ? (
            <div className={styles.formGrid}>
              <div className={styles.fullWidth}>
                <FormInput
                  label="Studio name"
                  value={name}
                  onChange={setName}
                  required
                  autoComplete="organization"
                />
              </div>
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
                  <div className={`${styles.fullWidth} ${styles.tempPassword}`}>
                    <Label data-required="true">Temporary password</Label>
                    <div className={styles.tempPasswordRow}>
                      <PasswordInput
                        name="temporaryPassword"
                        value={temporaryPassword}
                        onChange={setTemporaryPassword}
                        autoComplete="new-password"
                        required
                      />
                      <Button
                        variant="quiet"
                        type="button"
                        onClick={() =>
                          setTemporaryPassword(generateTemporaryPassword())
                        }
                      >
                        Regenerate
                      </Button>
                    </div>
                    <p className={styles.help}>
                      Shared with the owner once. They must change it on first
                      login.
                    </p>
                  </div>
                </>
              ) : (
                <p className={styles.ownerMeta}>
                  Owner {studio?.owner?.name ?? "—"} ·{" "}
                  {studio?.owner?.email ?? "—"}
                </p>
              )}
              <div className={styles.fullWidth}>
                <FormInput
                  label="Address"
                  value={address}
                  onChange={setAddress}
                  autoComplete="street-address"
                />
              </div>
              <div className={styles.fullWidth}>
                <FormInput
                  label="Contact"
                  value={contact}
                  onChange={setContact}
                  autoComplete="tel"
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className={styles.themeStep}>
              <div className={styles.themeCard}>
                <p className={styles.themeCardTitle}>Colors</p>
                <p className={styles.themeCardDesc}>
                  Pick the studio palette. The preview updates live.
                </p>
                <div className={styles.themeToolbar}>
                  <Button
                    variant="default"
                    type="button"
                    onClick={() => setMode(mode === "light" ? "dark" : "light")}
                  >
                    Preview {mode === "light" ? "dark" : "light"}
                  </Button>
                </div>
                <ThemeColorPanel value={draft} onChange={setDraft} />
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
            </div>
          ) : null}

          {step === 2 ? (
            <div className={styles.paymentsStep}>
              <StudioPaymentsFields
                className={styles.paymentsCard}
                titleClassName={styles.paymentsCardTitle}
                descClassName={styles.paymentsCardDesc}
                razorpayKeyId={razorpayKeyId}
                razorpayKeySecret={razorpayKeySecret}
                savedKeyId={studio?.settings?.razorpayKeyId ?? ""}
                configured={Boolean(studio?.settings?.razorpayConfigured)}
                onKeyIdChange={setRazorpayKeyId}
                onKeySecretChange={setRazorpayKeySecret}
              />
            </div>
          ) : null}

          {formError ? <p className={styles.error}>{formError}</p> : null}

          <div className={styles.actions}>
            {step > 0 ? (
              <Button
                variant="quiet"
                type="button"
                isDisabled={pending}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                type="button"
                data-testid="studio-wizard-next"
                isDisabled={!stepIsValid[step]}
                onClick={() => setStep(step + 1)}
              >
                Continue
              </Button>
            ) : isCreate ? (
              <>
                <Button
                  variant="default"
                  type="button"
                  data-testid="studio-wizard-skip-create"
                  isPending={pending}
                  isDisabled={!detailsValid}
                  onClick={() =>
                    createMutation.mutate({ includePayments: false })
                  }
                >
                  Skip & create
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  data-testid="studio-wizard-create"
                  isPending={pending}
                  isDisabled={!detailsValid}
                  onClick={() =>
                    createMutation.mutate({ includePayments: true })
                  }
                >
                  Create studio
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                type="button"
                data-testid="studio-wizard-save"
                isPending={pending}
                isDisabled={!detailsValid}
                onClick={() => updateMutation.mutate()}
              >
                Save changes
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
