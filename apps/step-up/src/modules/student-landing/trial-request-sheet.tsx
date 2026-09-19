import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import { fetchDiscoverTrialSlots } from "./api";
import { STUDENT_TRIAL } from "./content";
import styles from "./trial-request-sheet.module.scss";
import type { DiscoverTrialSlot } from "./types";

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

export function TrialRequestSheet({
  open,
  onOpenChange,
  studioId,
  studioName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  studioName: string;
}) {
  const navigate = useNavigate();
  const api = useApi();
  const { user, signUp, signInWithGoogle } = useAuth();
  const [sessionId, setSessionId] = useState<string>("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [forChild, setForChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ["discover-trial-slots", studioId],
    queryFn: () => fetchDiscoverTrialSlots(studioId),
    enabled: open,
    staleTime: 30_000,
  });

  const slots = slotsQuery.data ?? [];
  const selected = slots.find((slot) => slot.sessionId === sessionId) ?? null;
  const needsAccount = !user;

  const recap = useMemo(() => {
    if (!selected) return studioName;
    return [selected.batchName, formatSlot(selected), selected.styleBadge]
      .filter(Boolean)
      .join(" · ");
  }, [selected, studioName]);

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

  return (
    <AppSheet
      isOpen={open}
      onOpenChange={onOpenChange}
      title={STUDENT_TRIAL.sheetTitle}
      size="tall"
    >
      <div className={styles.body}>
        <p className={styles.recap}>{recap}</p>

        <fieldset className={styles.fieldset}>
          <legend>{STUDENT_TRIAL.pickSlot}</legend>
          {slotsQuery.isLoading ? (
            <p className={styles.hint}>Loading slots…</p>
          ) : null}
          {slots.length === 0 && !slotsQuery.isLoading ? (
            <p className={styles.hint}>{STUDENT_TRIAL.noSlots}</p>
          ) : null}
          <div className={styles.slots}>
            {slots.map((slot) => (
              <button
                key={slot.sessionId}
                type="button"
                className={styles.slot}
                data-active={sessionId === slot.sessionId || undefined}
                onClick={() => setSessionId(slot.sessionId)}
              >
                <strong>{slot.batchName}</strong>
                <span>{formatSlot(slot)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
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

        <TouchButton
          variant="primary"
          fullWidth
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
          isDisabled={mutation.isPending || slotsQuery.isLoading}
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
      </div>
    </AppSheet>
  );
}
