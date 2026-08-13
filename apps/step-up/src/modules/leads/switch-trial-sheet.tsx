import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import { formatTrialWhen, type Lead, type TrialSlot } from "./types";

type SwitchTrialSheetProps = {
  lead: Lead | null;
  studioId: string;
  onOpenChange: (open: boolean) => void;
};

export function SwitchTrialSheet({
  lead,
  studioId,
  onOpenChange,
}: SwitchTrialSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("SwitchTrialSheet");
  const isOpen = Boolean(lead);
  const booking = lead?.trialBooking ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    booking?.sessionId ?? null,
  );
  const leadKey = lead?.id ?? null;
  const [lastLeadKey, setLastLeadKey] = useState(leadKey);
  if (leadKey !== lastLeadKey) {
    setLastLeadKey(leadKey);
    setSelectedSessionId(booking?.sessionId ?? null);
  }

  const slotsQuery = useQuery({
    queryKey: ["trial-slots", studioId],
    queryFn: () => api.get<TrialSlot[]>(`/sessions/studio/${studioId}/trial`),
    enabled: isOpen,
  });

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  const switchMutation = useMutation({
    mutationFn: (sessionId: string) => {
      if (!booking) {
        throw new Error("No trial booking to update");
      }
      return api.patch(`/bookings/${booking.id}/status`, {
        status: booking.status,
        sessionId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
      toast({
        title: "Trial session updated",
        variant: "success",
      });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t switch session",
        description:
          error instanceof Error ? error.message : "Try another session.",
        variant: "error",
      });
    },
  });

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={lead ? `Switch trial · ${lead.name}` : "Switch trial"}
      size="tall"
    >
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
            <TouchButton variant="primary" onClick={() => slotsQuery.refetch()}>
              Try again
            </TouchButton>
          }
        />
      ) : null}

      {!slotsQuery.isLoading && !slotsQuery.isError && slots.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No upcoming sessions"
          description="Add batch sessions to offer trial times."
        />
      ) : null}

      {slots.length > 0 ? (
        <div className={styles.slotList}>
          {slots.map((slot) => (
            <button
              key={slot.sessionId}
              type="button"
              className={styles.slotButton}
              data-selected={
                selectedSessionId === slot.sessionId ? "true" : undefined
              }
              data-testid={`switch-trial-slot-${slot.sessionId}`}
              onClick={() => setSelectedSessionId(slot.sessionId)}
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

      <div className={styles.actions}>
        <TouchButton
          variant="primary"
          fullWidth
          isPending={switchMutation.isPending}
          isDisabled={
            !selectedSessionId ||
            selectedSessionId === booking?.sessionId ||
            switchMutation.isPending
          }
          data-testid="switch-trial-confirm"
          onClick={() => {
            if (selectedSessionId) switchMutation.mutate(selectedSessionId);
          }}
        >
          Save session
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
