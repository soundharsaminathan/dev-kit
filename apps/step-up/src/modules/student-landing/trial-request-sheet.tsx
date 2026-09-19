import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { TouchButton } from "@/modules/ui/touch-button";
import { fetchDiscoverTrialSlots } from "./api";
import { STUDENT_TRIAL } from "./content";
import styles from "./trial-request-sheet.module.scss";
import type { DiscoverTrialSlot } from "./types";

const SLOT_SKELETON_KEYS = [
  "trial-slot-0",
  "trial-slot-1",
  "trial-slot-2",
] as const;

function TrialSlotsSkeleton() {
  return (
    <div
      className={styles.slots}
      role="status"
      aria-busy="true"
      aria-label={STUDENT_TRIAL.loadingSlots}
    >
      {SLOT_SKELETON_KEYS.map((key) => (
        <div key={key} className={styles.slotSkeleton} aria-hidden>
          <SkeletonBlock height="1rem" width="55%" radius="4px" />
          <SkeletonBlock height="0.75rem" width="35%" radius="4px" />
        </div>
      ))}
    </div>
  );
}

type TrialStep = "slot" | "register";

function formatSlot(slot: DiscoverTrialSlot) {
  const start = new Date(slot.startsAt);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
}

function validatePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

function groupSlotsByBatch(slots: DiscoverTrialSlot[]) {
  const groups: Array<{
    batchId: string;
    batchName: string;
    slots: DiscoverTrialSlot[];
  }> = [];
  const indexById = new Map<string, number>();

  for (const slot of slots) {
    const existing = indexById.get(slot.batchId);
    if (existing == null) {
      indexById.set(slot.batchId, groups.length);
      groups.push({
        batchId: slot.batchId,
        batchName: slot.batchName,
        slots: [slot],
      });
      continue;
    }
    groups[existing]?.slots.push(slot);
  }

  return groups;
}

export function TrialRequestSheet({
  open,
  onOpenChange,
  studioId,
  studioName,
  batchId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  studioName: string;
  batchId?: string | null;
}) {
  const navigate = useNavigate();
  const api = useApi();
  const { user, signUp, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<TrialStep>("slot");
  const [sessionId, setSessionId] = useState<string>("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [forChild, setForChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState("");
  const registerRef = useRef<HTMLFieldSetElement>(null);
  const nextOpenKey = open ? `${studioId}:${batchId ?? ""}` : "";

  if (nextOpenKey !== openKey) {
    setOpenKey(nextOpenKey);
    setStep("slot");
    setSessionId("");
    setPhone("");
    setPassword("");
    setForChild(false);
    setChildName("");
    setError(null);
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }

  const slotsQuery = useQuery({
    queryKey: ["discover-trial-slots", studioId],
    queryFn: () => fetchDiscoverTrialSlots(studioId),
    enabled: open,
    staleTime: 30_000,
  });

  const slots = useMemo(() => {
    const all = slotsQuery.data ?? [];
    if (!batchId) return all;
    return all.filter((slot) => slot.batchId === batchId);
  }, [batchId, slotsQuery.data]);

  const sections = useMemo(() => groupSlotsByBatch(slots), [slots]);
  const selected = slots.find((slot) => slot.sessionId === sessionId) ?? null;
  const needsAccount = !user;
  const slotsLoading = slotsQuery.isLoading;

  useEffect(() => {
    if (!open || sessionId || slots.length !== 1) return;
    const only = slots[0];
    if (only) setSessionId(only.sessionId);
  }, [open, sessionId, slots]);

  useEffect(() => {
    if (step !== "register") return;
    const field = registerRef.current?.querySelector<HTMLInputElement>("input");
    field?.focus();
  }, [step]);

  const recap = useMemo(() => {
    if (!selected) {
      const onlyBatch = sections.length === 1 ? sections[0]?.batchName : null;
      return onlyBatch ?? studioName;
    }
    return [selected.batchName, formatSlot(selected), selected.styleBadge]
      .filter(Boolean)
      .join(" · ");
  }, [sections, selected, studioName]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (needsAccount) {
        if (name.trim().length < 2) throw new Error("Enter your name");
        if (!validatePhone(phone))
          throw new Error("Enter a valid phone number");
        if (!email.trim()) throw new Error("Enter your email");
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
      } else if (!validatePhone(phone)) {
        throw new Error("Enter a valid phone number");
      }

      if (slots.length > 0 && !sessionId) {
        throw new Error("Pick a trial slot");
      }

      let studentId = user?.id;
      let studioForUser = user?.studioId;
      if (needsAccount) {
        const created = await signUp(email.trim(), password, name.trim(), {
          studioId,
        });
        studentId = created.id;
        studioForUser = created.studioId;
        try {
          await api.patch("/users/me", { phone: phone.trim() });
        } catch {
          /* phone is also copied into the booking notes */
        }
      }

      const notes = [
        `Phone: ${phone.trim()}`,
        forChild && childName.trim() ? `Child: ${childName.trim()}` : null,
      ]
        .filter(Boolean)
        .join(". ");

      if (!studentId) throw new Error("Could not create your account");
      if (sessionId) {
        await api.post("/bookings", {
          studioId: studioForUser || studioId,
          studentId,
          type: "TRIAL",
          sessionId,
          notes,
        });
      }
    },
    onSuccess: () => {
      onOpenChange(false);
      void navigate({ to: sessionId ? "/me/bookings" : "/me" });
    },
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not request this trial",
      );
    },
  });

  const onGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle({ asNewStudent: true, studioId });
    } catch {
      setError("Google sign in failed");
    }
  };

  const goToRegister = () => {
    setError(null);
    if (slots.length > 0 && !sessionId) {
      setError("Pick a trial slot");
      return;
    }
    setStep("register");
  };

  return (
    <AppSheet
      isOpen={open}
      onOpenChange={onOpenChange}
      title={
        step === "register"
          ? STUDENT_TRIAL.registerTitle
          : STUDENT_TRIAL.sheetTitle
      }
      size="tall"
    >
      <div className={styles.body}>
        <p className={styles.step} aria-live="polite">
          {step === "register"
            ? STUDENT_TRIAL.stepRegister
            : STUDENT_TRIAL.stepSlot}
        </p>
        <p className={styles.recap}>{recap}</p>

        {step === "slot" ? (
          <>
            <fieldset className={styles.fieldset}>
              <legend>{STUDENT_TRIAL.pickSlot}</legend>
              {slotsLoading ? <TrialSlotsSkeleton /> : null}
              {slots.length === 0 && !slotsLoading ? (
                <p className={styles.hint}>{STUDENT_TRIAL.noSlots}</p>
              ) : null}
              {slotsLoading ? null : (
                <div className={styles.sections}>
                  {sections.map((section) => (
                    <div key={section.batchId} className={styles.section}>
                      {sections.length > 1 ? (
                        <p className={styles.sectionTitle}>
                          {section.batchName}
                        </p>
                      ) : null}
                      <div className={styles.slots}>
                        {section.slots.map((slot) => (
                          <button
                            key={slot.sessionId}
                            type="button"
                            className={styles.slot}
                            aria-label={[
                              section.batchName,
                              formatSlot(slot),
                              slot.styleBadge,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                            data-active={
                              sessionId === slot.sessionId || undefined
                            }
                            onClick={() => setSessionId(slot.sessionId)}
                          >
                            <strong>{formatSlot(slot)}</strong>
                            {slot.styleBadge ? (
                              <span>{slot.styleBadge}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            {error ? <p className={styles.error}>{error}</p> : null}

            <TouchButton
              variant="primary"
              fullWidth
              onClick={goToRegister}
              isDisabled={slotsLoading}
            >
              {STUDENT_TRIAL.continue}
            </TouchButton>
          </>
        ) : (
          <>
            <fieldset ref={registerRef} className={styles.fieldset}>
              <legend>{STUDENT_TRIAL.yourDetails}</legend>
              {needsAccount ? (
                <FormInput
                  label={STUDENT_TRIAL.name}
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  required
                />
              ) : null}
              <FormInput
                label={STUDENT_TRIAL.phone}
                value={phone}
                onChange={setPhone}
                type="tel"
                autoComplete="tel"
                required
              />
              {needsAccount ? (
                <>
                  <FormInput
                    label={STUDENT_TRIAL.email}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    autoComplete="email"
                    required
                  />
                  <FormInput
                    label={STUDENT_TRIAL.password}
                    value={password}
                    onChange={setPassword}
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </>
              ) : null}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={forChild}
                  onChange={(event) => setForChild(event.target.checked)}
                />
                {STUDENT_TRIAL.childToggle}
              </label>
              {forChild ? (
                <FormInput
                  label={STUDENT_TRIAL.childName}
                  value={childName}
                  onChange={setChildName}
                  autoComplete="off"
                />
              ) : null}
            </fieldset>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <TouchButton
                variant="primary"
                fullWidth
                onClick={() => {
                  setError(null);
                  mutation.mutate();
                }}
                isDisabled={mutation.isPending}
              >
                {STUDENT_TRIAL.submit}
              </TouchButton>
              {needsAccount ? (
                <TouchButton
                  variant="default"
                  fullWidth
                  onClick={() => void onGoogle()}
                >
                  {STUDENT_TRIAL.google}
                </TouchButton>
              ) : null}
              <TouchButton
                variant="quiet"
                fullWidth
                onClick={() => {
                  setError(null);
                  setStep("slot");
                }}
              >
                {STUDENT_TRIAL.backStep}
              </TouchButton>
            </div>
          </>
        )}
      </div>
    </AppSheet>
  );
}
