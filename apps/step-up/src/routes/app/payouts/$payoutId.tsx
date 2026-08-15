import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { ADMIN_ROLES } from "@/lib/constants";
import { useAuth } from "@/lib/use-auth";
import payoutsStyles from "@/modules/payouts/payouts.module.scss";
import {
  formatPayoutAmount,
  formatPayoutPeriod,
  type TrainerPayoutDetail,
} from "@/modules/payouts/types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { PageHeader } from "@/modules/ui/page-header";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

function formatSessionDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status: TrainerPayoutDetail["status"]) {
  if (status === "PAID") return "success" as const;
  if (status === "SENT") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "neutral" as const;
}

export const Route = createFileRoute("/app/payouts/$payoutId")({
  component: PayoutDetailPage,
});

function PayoutDetailPage() {
  const { payoutId } = Route.useParams();
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("PayoutDetailPage");
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;
  const [editOpen, setEditOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");

  const payoutQuery = useQuery({
    queryKey: ["payout", payoutId],
    queryFn: () => api.get<TrainerPayoutDetail>(`/payouts/${payoutId}`),
    enabled: Boolean(payoutId),
  });

  const payout = payoutQuery.data;

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["payout", payoutId] });
    void queryClient.invalidateQueries({ queryKey: ["payouts"] });
  }

  const sendPayout = useMutation({
    mutationFn: () => api.patch(`/payouts/${payoutId}/send`),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Payout sent",
        description: "The trainer has been notified.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t send payout",
        description:
          error instanceof Error ? error.message : "Could not send payout.",
        variant: "error",
      });
    },
  });

  const markPaid = useMutation({
    mutationFn: () => api.patch(`/payouts/${payoutId}/paid`),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Payout paid",
        description: "Marked as paid.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t mark paid",
        description:
          error instanceof Error ? error.message : "Could not mark paid.",
        variant: "error",
      });
    },
  });

  const saveDraft = useMutation({
    mutationFn: () =>
      api.patch(`/payouts/${payoutId}`, {
        amount: amountDraft.trim() ? Number(amountDraft) : undefined,
        notes: notesDraft.trim() ? notesDraft.trim() : undefined,
      }),
    onSuccess: () => {
      setEditOpen(false);
      invalidate();
      toast({
        title: "Payout updated",
        description: "Draft changes saved.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t update payout",
        description:
          error instanceof Error ? error.message : "Could not update payout.",
        variant: "error",
      });
    },
  });

  if (payoutQuery.isError) {
    return (
      <ErrorState
        description={
          payoutQuery.error instanceof Error
            ? payoutQuery.error.message
            : "Could not load this payout."
        }
        action={
          <TouchButton variant="primary" onClick={() => payoutQuery.refetch()}>
            Try again
          </TouchButton>
        }
      />
    );
  }

  if (!payout) {
    return (
      <div className={`page ${staff.section}`}>
        <SkeletonBlock height="2rem" width="60%" />
        <SkeletonBlock height="6rem" radius="var(--radius-2xl)" />
      </div>
    );
  }

  const actions = isAdmin ? (
    payout.status === "DRAFT" ? (
      <>
        <TouchButton
          variant="default"
          onClick={() => {
            setAmountDraft(payout.amount?.toString() ?? "");
            setNotesDraft(payout.notes ?? "");
            setEditOpen(true);
          }}
          data-testid="edit-payout"
        >
          Edit
        </TouchButton>
        <TouchButton
          variant="primary"
          isPending={sendPayout.isPending}
          onClick={() => sendPayout.mutate()}
          data-testid="send-payout"
        >
          Send payout
        </TouchButton>
      </>
    ) : payout.status === "SENT" ? (
      <TouchButton
        variant="primary"
        isPending={markPaid.isPending}
        onClick={() => markPaid.mutate()}
        data-testid="mark-payout-paid"
      >
        Mark paid
      </TouchButton>
    ) : null
  ) : null;

  return (
    <section className="page">
      <PageHeader
        title={payout.trainerName}
        description={`${formatPayoutPeriod(payout.periodStart)} payout`}
        actions={
          actions ? <div className={staff.headerActions}>{actions}</div> : null
        }
      />

      <div className={staff.section}>
        <div className={payoutsStyles.statGrid}>
          <div className={payoutsStyles.statTile}>
            <span className={payoutsStyles.statLabel}>Status</span>
            <span
              className={payoutsStyles.statusChip}
              data-tone={statusTone(payout.status)}
            >
              {payout.status}
            </span>
          </div>
          <div className={payoutsStyles.statTile}>
            <span className={payoutsStyles.statLabel}>Sessions</span>
            <span className={payoutsStyles.statValue}>
              {payout.sessionCount}
            </span>
          </div>
          <div className={payoutsStyles.statTile}>
            <span className={payoutsStyles.statLabel}>Amount</span>
            <span className={payoutsStyles.statValue}>
              {formatPayoutAmount(payout.amount)}
            </span>
          </div>
          <div className={payoutsStyles.statTile}>
            <span className={payoutsStyles.statLabel}>Period</span>
            <span className={payoutsStyles.statValue}>
              {formatPayoutPeriod(payout.periodStart)}
            </span>
          </div>
        </div>

        {payout.notes ? <p className={staff.rowMeta}>{payout.notes}</p> : null}

        <p className={staff.sectionTitle}>Sessions</p>
        {payout.sessions.length === 0 ? (
          <EmptyState
            title="No sessions"
            description="This payout has no linked sessions yet."
          />
        ) : (
          <div className={staff.attentionBody}>
            {payout.sessions.map((session) => (
              <div
                key={session.id}
                className={payoutsStyles.sessionRow}
                data-testid={`payout-session-${session.id}`}
              >
                <span className={payoutsStyles.sessionBody}>
                  <span className={payoutsStyles.sessionTitle}>
                    {session.batchName}
                  </span>
                  <span className={payoutsStyles.sessionMeta}>
                    {formatSessionDateTime(session.startsAt)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <AppSheet
        isOpen={editOpen}
        onOpenChange={setEditOpen}
        title="Edit payout"
      >
        <div className={staff.sheetStack}>
          <FormInput
            label="Amount (₹)"
            type="number"
            min={0}
            inputMode="decimal"
            value={amountDraft}
            onChange={setAmountDraft}
            placeholder="Enter amount"
          />
          <FormInput
            label="Notes"
            value={notesDraft}
            onChange={setNotesDraft}
            placeholder="Optional note for the trainer"
          />
          <div className={staff.sheetActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isPending={saveDraft.isPending}
              data-testid="save-payout"
              onClick={() => saveDraft.mutate()}
            >
              Save
            </TouchButton>
            <TouchButton
              variant="quiet"
              fullWidth
              isDisabled={saveDraft.isPending}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </section>
  );
}
