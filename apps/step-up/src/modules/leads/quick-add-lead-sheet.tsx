import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import type { AgeRange } from "@/lib/constants";
import { AGE_RANGES } from "@/modules/onboarding/options";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import { formatTrialWhen, type Lead, type TrialSlot } from "./types";

type QuickAddLeadSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
};

export function QuickAddLeadSheet({
  isOpen,
  onOpenChange,
  studioId,
}: QuickAddLeadSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("QuickAddLeadSheet");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setPhone("");
      setAgeRange(null);
      setSessionId(null);
    }
  }, [isOpen]);

  const slotsQuery = useQuery({
    queryKey: ["trial-slots", studioId],
    queryFn: () => api.get<TrialSlot[]>(`/sessions/studio/${studioId}/trial`),
    enabled: isOpen,
  });

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  const canSubmit = Boolean(name.trim() && phone.trim() && ageRange);

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Lead>(`/users/studio/${studioId}/leads`, {
        name: name.trim(),
        phone: phone.trim(),
        ageRange,
        ...(sessionId ? { sessionId } : {}),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["student-directory", studioId],
      });
      toast({
        title: "Lead added",
        description: created.trialBooking
          ? `${created.name} · trial booked for follow-up`
          : `${created.name} ready to call`,
        variant: "success",
      });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t add lead",
        description:
          error instanceof Error
            ? error.message
            : "Check the details and retry.",
        variant: "error",
      });
    },
  });

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Add lead"
      size="tall"
    >
      <div className={styles.formStack}>
        <FormInput
          label="Name"
          value={name}
          onChange={setName}
          autoComplete="name"
          data-testid="quick-add-lead-name"
        />
        <FormInput
          label="Mobile number"
          type="tel"
          value={phone}
          onChange={setPhone}
          autoComplete="tel"
          data-testid="quick-add-lead-phone"
        />

        <div className={styles.fieldBlock}>
          <p className={styles.fieldLabel}>Age range</p>
          <div className={styles.chipGrid}>
            {AGE_RANGES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.chip}
                data-selected={ageRange === option.id ? "true" : undefined}
                data-testid={`quick-add-age-${option.id}`}
                onClick={() => setAgeRange(option.id)}
              >
                {option.title}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldBlock}>
          <p className={styles.fieldLabel}>Trial session (optional)</p>
          {slotsQuery.isLoading ? (
            <p className={styles.slotMeta}>Loading sessions…</p>
          ) : null}
          {slotsQuery.isError ? (
            <ErrorState
              description={
                slotsQuery.error instanceof Error
                  ? slotsQuery.error.message
                  : "Could not load trial sessions."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => slotsQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}
          {!slotsQuery.isLoading &&
          !slotsQuery.isError &&
          slots.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No upcoming sessions"
              description="You can still add the lead and book a trial later."
            />
          ) : null}
          {slots.length > 0 ? (
            <div className={styles.slotList}>
              <button
                type="button"
                className={styles.slotButton}
                data-selected={sessionId === null ? "true" : undefined}
                onClick={() => setSessionId(null)}
              >
                <p className={styles.slotWhen}>No session yet</p>
                <p className={styles.slotMeta}>Call first, then pick a time</p>
              </button>
              {slots.map((slot) => (
                <button
                  key={slot.sessionId}
                  type="button"
                  className={styles.slotButton}
                  data-selected={
                    sessionId === slot.sessionId ? "true" : undefined
                  }
                  data-testid={`quick-add-slot-${slot.sessionId}`}
                  onClick={() => setSessionId(slot.sessionId)}
                >
                  <p className={styles.slotWhen}>
                    {formatTrialWhen(slot.startsAt)}
                  </p>
                  <p className={styles.slotMeta}>
                    {slot.batchName}
                    {slot.styleBadge ? ` · ${slot.styleBadge}` : ""}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.actions}>
        <TouchButton
          variant="primary"
          fullWidth
          isPending={createMutation.isPending}
          isDisabled={!canSubmit || createMutation.isPending}
          data-testid="quick-add-lead-submit"
          onClick={() => createMutation.mutate()}
        >
          Add lead
        </TouchButton>
        <TouchButton
          variant="quiet"
          fullWidth
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </TouchButton>
      </div>
    </AppSheet>
  );
}
