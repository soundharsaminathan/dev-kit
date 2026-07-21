import { Badge } from "@dev-ui/components/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./bookings.module.scss";

type Booking = {
  id: string;
  type: string;
  status: string;
  studentId: string;
  notes?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  sessionId?: string | null;
  student?: { id: string; name: string; email: string } | null;
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | undefined
> = {
  CONFIRMED: "success",
  COMPLETED: "info",
  PENDING: "warning",
  CANCELLED: "danger",
};

export const Route = createFileRoute("/app/bookings/")({
  component: BookingsPage,
});

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultReviewWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    startsAt: toLocalInputValue(start),
    endsAt: toLocalInputValue(end),
  };
}

function BookingMedia({ name }: { name: string }) {
  return (
    <span className={staff.bentoInitial} aria-hidden>
      {name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

function BookingReviewPanel({
  booking,
  isPending,
  onConfirm,
  onDecline,
}: {
  booking: Booking;
  isPending: boolean;
  onConfirm: (times?: { startsAt: string; endsAt: string }) => void;
  onDecline: () => void;
}) {
  const defaults = defaultReviewWindow();
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);

  const studentName = booking.student?.name ?? booking.studentId;
  const typeLabel = booking.type.replaceAll("_", " ");

  return (
    <div className={styles.body}>
      <div className={styles.block}>
        <p className={styles.blockLabel}>Status</p>
        <div className={styles.statusRow}>
          <Badge appearance="subtle" variant={STATUS_VARIANT[booking.status]}>
            {booking.status}
          </Badge>
        </div>
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel}>Request</p>
        <p className={styles.blockValue}>{typeLabel}</p>
      </div>

      {booking.student?.email ? (
        <div className={styles.block}>
          <p className={styles.blockLabel}>Student</p>
          <p className={styles.blockValue}>
            {studentName}
            <br />
            {booking.student.email}
          </p>
        </div>
      ) : null}

      {booking.notes ? (
        <div className={styles.block}>
          <p className={styles.blockLabel}>Notes</p>
          <p className={styles.blockValue}>{booking.notes}</p>
        </div>
      ) : null}

      {booking.startsAt && booking.endsAt ? (
        <div className={styles.block}>
          <p className={styles.blockLabel}>Scheduled</p>
          <p className={styles.blockValue}>
            {new Date(booking.startsAt).toLocaleString()} –{" "}
            {new Date(booking.endsAt).toLocaleTimeString()}
          </p>
        </div>
      ) : null}

      {booking.status === "PENDING" ? (
        <div className={styles.review}>
          <FormInput
            label="Starts at"
            type="datetime-local"
            value={startsAt}
            onChange={setStartsAt}
          />
          <FormInput
            label="Ends at"
            type="datetime-local"
            value={endsAt}
            onChange={setEndsAt}
          />
          <div className={styles.reviewActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isPending={isPending}
              onClick={() =>
                onConfirm({
                  startsAt: new Date(startsAt).toISOString(),
                  endsAt: new Date(endsAt).toISOString(),
                })
              }
            >
              Confirm with time
            </TouchButton>
            <TouchButton
              variant="default"
              fullWidth
              isPending={isPending}
              onClick={() => onConfirm()}
            >
              Confirm without time
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={isPending}
              onClick={onDecline}
            >
              Decline
            </TouchButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BookingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("ALL");
  const [gridKey, setGridKey] = useState(0);

  const bookings = useQuery({
    queryKey: ["bookings", "studio", STUDIO_ID],
    queryFn: () => api.get<Booking[]>(`/bookings/studio/${STUDIO_ID}`),
  });

  const invalidateBookings = () => {
    void queryClient.invalidateQueries({
      queryKey: ["bookings", "studio", STUDIO_ID],
    });
    void queryClient.invalidateQueries({ queryKey: ["calendar"] });
  };

  const updateStatus = useMutation({
    mutationFn: (values: {
      id: string;
      status: string;
      startsAt?: string;
      endsAt?: string;
    }) =>
      api.patch<Booking>(`/bookings/${values.id}/status`, {
        status: values.status,
        ...(values.startsAt && values.endsAt
          ? { startsAt: values.startsAt, endsAt: values.endsAt }
          : {}),
      }),
    onSuccess: () => {
      invalidateBookings();
      setGridKey((key) => key + 1);
    },
  });

  const sortedBookings = useMemo(() => {
    const items = bookings.data ?? [];
    return [...items].sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (a.status !== "PENDING" && b.status === "PENDING") return 1;
      return 0;
    });
  }, [bookings.data]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return sortedBookings;
    return sortedBookings.filter((booking) => booking.status === filter);
  }, [sortedBookings, filter]);

  const pendingCount = sortedBookings.filter(
    (booking) => booking.status === "PENDING",
  ).length;

  const items: ExpandableBentoItem[] = useMemo(
    () =>
      filtered.map((booking) => {
        const studentName = booking.student?.name ?? booking.studentId;
        const typeLabel = booking.type.replaceAll("_", " ");
        const subtitleParts = [typeLabel, booking.status];
        if (booking.notes) subtitleParts.push(booking.notes);

        return {
          id: booking.id,
          title: studentName,
          subtitle: subtitleParts.join(" · "),
          description: booking.notes
            ? `${typeLabel} · ${booking.notes}`
            : typeLabel,
          media: <BookingMedia name={studentName} />,
          content: (
            <BookingReviewPanel
              booking={booking}
              isPending={updateStatus.isPending}
              onConfirm={(times) =>
                updateStatus.mutate({
                  id: booking.id,
                  status: "CONFIRMED",
                  ...times,
                })
              }
              onDecline={() =>
                updateStatus.mutate({
                  id: booking.id,
                  status: "CANCELLED",
                })
              }
            />
          ),
        };
      }),
    [filtered, updateStatus.isPending, updateStatus.mutate],
  );

  return (
    <Screen
      title="Bookings"
      subtitle={
        pendingCount > 0
          ? `${pendingCount} pending approval`
          : "Review trial, open seat, and private requests."
      }
      actions={
        <TouchButton variant="primary" size="md">
          <Link to="/app/bookings/new">Add</Link>
        </TouchButton>
      }
    >
      <PullToRefresh onRefresh={() => bookings.refetch()}>
        <div className={staff.section}>
          <FilterChipRow
            chips={[
              { id: "ALL", label: "All" },
              { id: "PENDING", label: "Pending" },
              { id: "CONFIRMED", label: "Confirmed" },
              { id: "CANCELLED", label: "Declined" },
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
              description="Bookings created for this studio will appear here."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/bookings/new">Add booking</Link>
                </TouchButton>
              }
            />
          ) : null}

          {filtered.length > 0 ? (
            <ExpandableBentoGrid
              key={gridKey}
              items={items}
              aria-label="Booking requests"
            />
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
