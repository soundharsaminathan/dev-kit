import { Badge } from "@dev-ui/components/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import {
  BatchDetailPreview,
  BookingWithoutBatchPreview,
} from "@/modules/discover/batch-detail-preview";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { BloomPanel } from "@/modules/ui/bloom-panel";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { FormInput } from "@/modules/ui/form-input";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type Booking = {
  id: string;
  type: string;
  status: string;
  notes?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  sessionId?: string | null;
  batch?: { id: string; name: string } | null;
};

type Session = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | undefined
> = {
  CONFIRMED: "success",
  COMPLETED: "info",
  PENDING: "warning",
  AWAITING_PAYMENT: "info",
  CANCELLED: "danger",
};

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const Route = createFileRoute("/me/bookings")({
  component: MeBookingsPage,
});

function MeBookingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { studentId } = useActiveStudentContext();
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const bookings = useQuery({
    queryKey: ["bookings", "student", studentId],
    queryFn: () => api.get<Booking[]>(`/bookings/student/${studentId}`),
    enabled: Boolean(studentId),
  });

  const sortedBookings = useMemo(() => {
    const items = bookings.data ?? [];
    const rank = (status: string) => {
      if (status === "AWAITING_PAYMENT") return 0;
      if (status === "PENDING") return 1;
      return 2;
    };
    return [...items].sort((a, b) => rank(a.status) - rank(b.status));
  }, [bookings.data]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return sortedBookings;
    return sortedBookings.filter((booking) => booking.status === filter);
  }, [sortedBookings, filter]);

  const awaitingPaymentCount = sortedBookings.filter(
    (booking) => booking.status === "AWAITING_PAYMENT",
  ).length;
  const pendingCount = sortedBookings.filter(
    (booking) => booking.status === "PENDING",
  ).length;

  const selected = useMemo(
    () => sortedBookings.find((booking) => booking.id === selectedId) ?? null,
    [selectedId, sortedBookings],
  );

  const canManage =
    selected?.status === "PENDING" || selected?.status === "CONFIRMED";
  const useSessionPicker = Boolean(selected?.batch?.id);

  const sessionsQuery = useQuery({
    queryKey: ["sessions", "batch", selected?.batch?.id],
    queryFn: () => api.get<Session[]>(`/sessions/batch/${selected!.batch!.id}`),
    enabled: Boolean(rescheduleOpen && selected?.batch?.id),
  });

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return (sessionsQuery.data ?? [])
      .filter(
        (session) =>
          session.status !== "CANCELLED" &&
          new Date(session.startsAt).getTime() > now &&
          session.id !== selected?.sessionId,
      )
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [sessionsQuery.data, selected?.sessionId]);

  async function invalidateBookings() {
    await queryClient.invalidateQueries({
      queryKey: ["bookings", "student", studentId],
    });
  }

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/bookings/${selected!.id}/cancel`, {}),
    onSuccess: async () => {
      await invalidateBookings();
      setConfirmCancel(false);
      setSelectedId(null);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (useSessionPicker) {
        return api.post(`/bookings/${selected!.id}/request-reschedule`, {
          sessionId,
        });
      }
      return api.post(`/bookings/${selected!.id}/request-reschedule`, {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
    },
    onSuccess: async () => {
      await invalidateBookings();
      setRescheduleOpen(false);
      setSelectedId(null);
    },
  });

  function openReschedule() {
    if (!selected) return;
    setSessionId("");
    setStartsAt(toLocalInputValue(selected.startsAt));
    setEndsAt(toLocalInputValue(selected.endsAt));
    setRescheduleOpen(true);
  }

  const rescheduleReady = useSessionPicker
    ? Boolean(sessionId)
    : Boolean(startsAt && endsAt && new Date(endsAt) > new Date(startsAt));

  return (
    <Screen
      title="My bookings"
      subtitle={
        awaitingPaymentCount > 0
          ? `${awaitingPaymentCount} awaiting payment`
          : pendingCount > 0
            ? `${pendingCount} waiting for studio confirmation`
            : undefined
      }
      showBack
      backTo="/me/profile"
    >
      <PullToRefresh onRefresh={() => bookings.refetch()}>
        <div className={staff.section}>
          <FilterChipRow
            chips={[
              { id: "ALL", label: "All" },
              { id: "AWAITING_PAYMENT", label: "Pay now" },
              { id: "PENDING", label: "Pending" },
              { id: "CONFIRMED", label: "Confirmed" },
              { id: "CANCELLED", label: "Cancelled" },
            ]}
            selected={[filter]}
            onToggle={(id) => setFilter(id)}
          />

          {bookings.isLoading ? <SkeletonCardList count={4} /> : null}

          {bookings.isError ? (
            <ErrorState
              description={
                bookings.error instanceof Error
                  ? bookings.error.message
                  : "Could not load bookings."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => bookings.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {bookings.data && filtered.length === 0 ? (
            <EmptyState
              title="No bookings"
              description="Requests you send from Discover appear here with their status."
              action={
                <TouchButton variant="primary">
                  <Link to="/me/book">Discover classes</Link>
                </TouchButton>
              }
            />
          ) : null}

          {filtered.length > 0 ? (
            <div className={staff.list}>
              {filtered.map((booking) => (
                <PressableCard
                  key={booking.id}
                  onClick={() => setSelectedId(booking.id)}
                >
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>
                        {booking.batch?.name ??
                          booking.type.replaceAll("_", " ")}
                      </span>
                      <Badge
                        appearance="subtle"
                        variant={STATUS_VARIANT[booking.status]}
                      >
                        {booking.status}
                      </Badge>
                    </div>
                    <p className={staff.rowMeta}>
                      {booking.type.replaceAll("_", " ")}
                      {booking.notes ? ` · ${booking.notes}` : ""}
                    </p>
                    {booking.startsAt && booking.endsAt ? (
                      <p className={staff.rowMeta}>
                        {new Date(booking.startsAt).toLocaleString()} –{" "}
                        {new Date(booking.endsAt).toLocaleTimeString()}
                      </p>
                    ) : booking.status === "AWAITING_PAYMENT" ? (
                      <p className={staff.rowMeta}>
                        Complete checkout within 10 minutes to keep your seat
                      </p>
                    ) : booking.status === "PENDING" ? (
                      <p className={staff.rowMeta}>
                        Waiting for the studio to confirm a time
                      </p>
                    ) : null}
                  </div>
                </PressableCard>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <BloomPanel
        isOpen={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setConfirmCancel(false);
          }
        }}
        title={selected?.batch?.name ?? selected?.type.replaceAll("_", " ")}
      >
        {selected?.status === "AWAITING_PAYMENT" ? (
          <div className={staff.section}>
            <p className={staff.rowMeta}>
              Your seat is held until the payment timer ends. Finish checkout to
              send the request to the studio.
            </p>
            <TouchButton variant="primary" fullWidth>
              <Link
                to="/me/checkout/$bookingId"
                params={{ bookingId: selected.id }}
              >
                Continue to payment
              </Link>
            </TouchButton>
          </div>
        ) : selected?.batch?.id ? (
          <BatchDetailPreview
            batchId={selected.batch.id}
            studentId={studentId}
            booking={selected}
            onOpenFull={() => setSelectedId(null)}
          />
        ) : selected ? (
          <BookingWithoutBatchPreview
            type={selected.type}
            notes={selected.notes}
          />
        ) : null}

        {canManage ? (
          <div className={staff.section}>
            {confirmCancel ? (
              <>
                <p className={staff.rowMeta}>
                  Cancel this booking? The studio will be notified.
                </p>
                {cancelMutation.isError ? (
                  <ErrorState
                    description={
                      cancelMutation.error instanceof Error
                        ? cancelMutation.error.message
                        : "Could not cancel booking."
                    }
                  />
                ) : null}
                <TouchButton
                  variant="danger"
                  fullWidth
                  isPending={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  Confirm cancel
                </TouchButton>
                <TouchButton
                  variant="quiet"
                  fullWidth
                  onClick={() => setConfirmCancel(false)}
                >
                  Keep booking
                </TouchButton>
              </>
            ) : (
              <>
                <TouchButton
                  variant="primary"
                  fullWidth
                  onClick={openReschedule}
                >
                  Reschedule
                </TouchButton>
                <TouchButton
                  variant="quiet"
                  fullWidth
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel booking
                </TouchButton>
              </>
            )}
          </div>
        ) : null}
      </BloomPanel>

      <AppSheet
        isOpen={rescheduleOpen}
        onOpenChange={(open) => {
          if (!open) setRescheduleOpen(false);
        }}
        title="Request reschedule"
      >
        <div className={staff.section}>
          <p className={staff.rowMeta}>
            {useSessionPicker
              ? "Pick another upcoming session. Confirmed bookings go back to pending for studio approval."
              : "Propose a new time. Confirmed bookings go back to pending for studio approval."}
          </p>

          {useSessionPicker ? (
            <>
              {sessionsQuery.isLoading ? <SkeletonCardList count={2} /> : null}
              {sessionsQuery.isError ? (
                <ErrorState
                  description={
                    sessionsQuery.error instanceof Error
                      ? sessionsQuery.error.message
                      : "Could not load sessions."
                  }
                />
              ) : null}
              {!sessionsQuery.isLoading && upcomingSessions.length === 0 ? (
                <EmptyState
                  title="No upcoming sessions"
                  description="Ask the studio to schedule another class time."
                />
              ) : null}
              {upcomingSessions.length > 0 ? (
                <div className={staff.list}>
                  {upcomingSessions.map((session) => (
                    <PressableCard
                      key={session.id}
                      onClick={() => setSessionId(session.id)}
                      data-selected={
                        sessionId === session.id ? "true" : undefined
                      }
                    >
                      <div className={staff.rowCard}>
                        <p className={staff.rowTitle}>
                          {new Date(session.startsAt).toLocaleString()}
                        </p>
                        <p className={staff.rowMeta}>
                          Until {new Date(session.endsAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </PressableCard>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <FormInput
                label="Starts"
                type="datetime-local"
                value={startsAt}
                onChange={setStartsAt}
              />
              <FormInput
                label="Ends"
                type="datetime-local"
                value={endsAt}
                onChange={setEndsAt}
              />
            </>
          )}

          {rescheduleMutation.isError ? (
            <ErrorState
              description={
                rescheduleMutation.error instanceof Error
                  ? rescheduleMutation.error.message
                  : "Could not request reschedule."
              }
            />
          ) : null}

          <TouchButton
            variant="primary"
            fullWidth
            isDisabled={!rescheduleReady}
            isPending={rescheduleMutation.isPending}
            onClick={() => rescheduleMutation.mutate()}
          >
            Submit request
          </TouchButton>
        </div>
      </AppSheet>
    </Screen>
  );
}
