import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { setLastLoginIdentifier } from "@/lib/last-login";
import { StyleSpreePicker } from "@/modules/styles/style-spree-picker";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import formStyles from "./member-registration-form.module.scss";

const STEPS = ["Details", "Dance styles"] as const;

type MemberRegistrationFormProps = {
  kind: "trainer" | "student";
  title: string;
  backTo: string;
  successTo: string;
  createEndpoint: string;
  createLabel: string;
  stylesTitle: string;
  stylesSummaryLabel: string;
  stepSubtitles: [string, string];
};

type CreatedMember = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

export function MemberRegistrationForm({
  kind,
  title,
  backTo,
  successTo,
  createEndpoint,
  createLabel,
  stylesTitle,
  stylesSummaryLabel,
  stepSubtitles,
}: MemberRegistrationFormProps) {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [styles, setStyles] = useState<string[]>([]);

  const stepIsValid = useMemo(
    () => [Boolean(name.trim() && email.trim()), styles.length > 0],
    [email, name, styles.length],
  );

  const createMember = useMutation({
    mutationFn: () =>
      api.post<CreatedMember>(createEndpoint, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        styles,
      }),
    onSuccess: async (created) => {
      setLastLoginIdentifier(created.email);
      await queryClient.invalidateQueries({
        queryKey: ["studio-members", STUDIO_ID],
      });
      await navigate({ to: successTo });
    },
  });

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    void navigate({ to: backTo });
  }

  return (
    <>
      <Screen
        title={title}
        subtitle={stepSubtitles[step]}
        showBack
        onBack={handleBack}
        paddedCta
      >
        <div className={formStyles.steps} aria-hidden>
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`${formStyles.step} ${
                index === step
                  ? formStyles.stepActive
                  : index < step
                    ? formStyles.stepComplete
                    : ""
              }`}
            />
          ))}
        </div>
        <p className={formStyles.stepLabel}>
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        {step === 0 ? (
          <div className={staff.softPanel}>
            <FormInput label="Name" value={name} onChange={setName} />
            <FormInput
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <FormInput
              label="Mobile number"
              type="tel"
              value={phone}
              onChange={setPhone}
            />
          </div>
        ) : (
          <div className={`${staff.softPanel} ${formStyles.stylesPanel}`}>
            <StyleSpreePicker
              value={styles}
              onChange={setStyles}
              title={stylesTitle}
              summaryLabel={stylesSummaryLabel}
            />
          </div>
        )}

        {createMember.isError ? (
          <p className={formStyles.error}>
            {createMember.error instanceof Error
              ? createMember.error.message
              : `The ${kind} could not be created.`}
          </p>
        ) : null}
      </Screen>

      <StickyCtaBar
        secondary={
          <TouchButton variant="quiet" fullWidth onClick={handleBack}>
            {step > 0 ? "Back" : "Cancel"}
          </TouchButton>
        }
      >
        {step < STEPS.length - 1 ? (
          <TouchButton
            variant="primary"
            fullWidth
            onClick={() => setStep(step + 1)}
            isDisabled={!stepIsValid[step]}
          >
            Continue
          </TouchButton>
        ) : (
          <TouchButton
            variant="primary"
            fullWidth
            onClick={() => createMember.mutate()}
            isPending={createMember.isPending}
            isDisabled={!stepIsValid[step]}
          >
            {createLabel}
          </TouchButton>
        )}
      </StickyCtaBar>
    </>
  );
}
