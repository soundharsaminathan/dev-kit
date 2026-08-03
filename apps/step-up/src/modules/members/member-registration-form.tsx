import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import type { AgeRange, Gender } from "@/lib/constants";
import { setLastLoginIdentifier } from "@/lib/last-login";
import { useStudioId } from "@/lib/use-studio-id";
import { AGE_RANGES, GENDERS } from "@/modules/onboarding/options";
import { StyleSpreePicker } from "@/modules/styles/style-spree-picker";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import formStyles from "./member-registration-form.module.scss";

const STEPS = ["Details", "Dance styles"] as const;
const NO_BATCH = "__none__";

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

type StudioBatchOption = {
  id: string;
  name: string;
  active: boolean;
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
  const studioId = useStudioId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("MemberRegistrationForm");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [styles, setStyles] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);

  const allowBatchEnrollment = kind === "student";

  const batchesQuery = useQuery({
    queryKey: ["studio-batches", studioId, "active"],
    queryFn: () =>
      api.get<StudioBatchOption[]>(
        `/batches/studio/${studioId}?activeOnly=true`,
      ),
    enabled: allowBatchEnrollment,
  });

  const activeBatches = useMemo(
    () => (batchesQuery.data ?? []).filter((batch) => batch.active),
    [batchesQuery.data],
  );

  const stepIsValid = useMemo(
    () => [
      Boolean(name.trim() && email.trim() && gender && ageRange),
      styles.length > 0,
    ],
    [ageRange, email, gender, name, styles.length],
  );

  const createMember = useMutation({
    mutationFn: () =>
      api.post<CreatedMember>(createEndpoint, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        gender,
        ageRange,
        styles,
        ...(allowBatchEnrollment && batchId ? { batchId, isTrial } : {}),
      }),
    onSuccess: async (created) => {
      setLastLoginIdentifier(created.email);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["studio-members", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-funnel", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-directory", studioId],
        }),
        batchId
          ? queryClient.invalidateQueries({ queryKey: ["batch", batchId] })
          : Promise.resolve(),
      ]);
      toast({
        title: `${kind === "trainer" ? "Trainer" : "Student"} created`,
        description: `${created.name} was added to the studio.`,
        variant: "success",
      });
      await navigate({ to: successTo });
    },
    onError: (error) => {
      toast({
        title: `Couldn’t create ${kind}`,
        description:
          error instanceof Error
            ? error.message
            : `The ${kind} could not be created.`,
        variant: "error",
      });
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
            <div className={formStyles.fieldBlock}>
              <p className={formStyles.fieldLabel}>Gender</p>
              <div className={formStyles.chipGrid}>
                {GENDERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={formStyles.chip}
                    data-selected={gender === option.id ? "true" : undefined}
                    onClick={() => setGender(option.id)}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
            </div>
            <div className={formStyles.fieldBlock}>
              <p className={formStyles.fieldLabel}>Age range</p>
              <div className={formStyles.chipGrid}>
                {AGE_RANGES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={formStyles.chip}
                    data-selected={ageRange === option.id ? "true" : undefined}
                    onClick={() => setAgeRange(option.id)}
                  >
                    {option.label} · {option.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={`${staff.softPanel} ${formStyles.stylesPanel}`}>
            <StyleSpreePicker
              value={styles}
              onChange={setStyles}
              title={stylesTitle}
              summaryLabel={stylesSummaryLabel}
            />
            {allowBatchEnrollment ? (
              <div
                className={formStyles.batchField}
                data-testid="optional-batch-enrollment"
              >
                <Select
                  label="Enroll in batch (optional)"
                  placeholder={
                    batchesQuery.isLoading
                      ? "Loading batches…"
                      : "Don't enroll yet"
                  }
                  selectedKey={batchId ?? NO_BATCH}
                  onSelectionChange={(key) => {
                    const value = String(key);
                    const nextBatchId = value === NO_BATCH ? null : value;
                    setBatchId(nextBatchId);
                    if (!nextBatchId) setIsTrial(false);
                  }}
                >
                  <SelectTrigger data-testid="optional-batch-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem id={NO_BATCH} textValue="Don't enroll yet">
                      Don't enroll yet
                    </SelectItem>
                    {activeBatches.map((batch) => (
                      <SelectItem
                        key={batch.id}
                        id={batch.id}
                        textValue={batch.name}
                      >
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {batchId ? (
                  <Checkbox isSelected={isTrial} onChange={setIsTrial}>
                    Enroll as trial (next 2 sessions)
                  </Checkbox>
                ) : null}
                <p className={formStyles.batchHint}>
                  Skip this to leave the student in Signed in only. A full
                  enrollment makes them Active; a trial grants the next 2
                  sessions only.
                </p>
              </div>
            ) : null}
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
