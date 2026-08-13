import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { AppDrawer } from "@/modules/ui/app-drawer";
import { FormInput } from "@/modules/ui/form-input";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import {
  defaultSessionDateKey,
  FILTER_LABELS,
  formatTrialWhen,
  LEAD_DATE_FILTERS,
  type Lead,
  type LeadDateFilter,
  localDateKey,
  slotMatchesDate,
  type TrialSlot,
  trialHorizonDateKey,
} from "./types";

type SwitchTrialSheetProps = {
  lead: Lead | null;
  studioId: string;
  dateFilter?: LeadDateFilter | undefined;
  onOpenChange: (open: boolean) => void;
};

function presetDateKey(value: LeadDateFilter, now: Date) {
  return defaultSessionDateKey(value, now);
}

export function SwitchTrialSheet({
  lead,
  studioId,
  dateFilter = "all",
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
  const [now, setNow] = useState(() => new Date());
  const [dateKey, setDateKey] = useState<string | null>(() =>
    defaultSessionDateKey(dateFilter),
  );
  const leadKey = lead?.id ?? null;
  const [lastLeadKey, setLastLeadKey] = useState(leadKey);
  if (leadKey !== lastLeadKey) {
    const openedAt = new Date();
    setLastLeadKey(leadKey);
    setSelectedSessionId(booking?.sessionId ?? null);
    setNow(openedAt);
    setDateKey(defaultSessionDateKey(dateFilter, openedAt));
  }

  const minDate = localDateKey(now);
  const maxDate = trialHorizonDateKey(now);

  const slotsQuery = useQuery({
    queryKey: ["trial-slots", studioId],
    queryFn: () => api.get<TrialSlot[]>(`/sessions/studio/${studioId}/trial`),
    enabled: isOpen,
  });

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const visibleSlots = useMemo(
    () => slots.filter((slot) => slotMatchesDate(slot.startsAt, dateKey)),
    [dateKey, slots],
  );

  const selectedPreset = useMemo(() => {
    if (dateKey === null) return "all";
    if (dateKey === presetDateKey("today", now)) return "today";
    if (dateKey === presetDateKey("tomorrow", now)) return "tomorrow";
    return null;
  }, [dateKey, now]);

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
    <AppDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={lead ? `Switch trial · ${lead.name}` : "Switch trial"}
      toolbar={
        <div className={styles.dateFilter}>
          <div
            className={styles.filters}
            role="toolbar"
            aria-label="Session date"
          >
            {LEAD_DATE_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className={styles.filterChip}
                data-selected={selectedPreset === value ? "true" : undefined}
                data-testid={`switch-trial-filter-${value}`}
                onClick={() => setDateKey(presetDateKey(value, now))}
              >
                {FILTER_LABELS[value]}
              </button>
            ))}
          </div>
          <FormInput
            label="Date"
            type="date"
            value={dateKey ?? ""}
            min={minDate}
            max={maxDate}
            data-testid="switch-trial-date"
            onChange={(value) => setDateKey(value || null)}
          />
        </div>
      }
      footer={
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
      }
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

      {!slotsQuery.isLoading &&
      !slotsQuery.isError &&
      slots.length > 0 &&
      visibleSlots.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No sessions on this date"
          description="Pick another date to see more trial times."
        />
      ) : null}

      {visibleSlots.length > 0 ? (
        <div className={styles.slotList}>
          {visibleSlots.map((slot) => (
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
    </AppDrawer>
  );
}
