import { Badge } from "@dev-ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
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
  batch?: { id: string; name: string } | null;
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

export const Route = createFileRoute("/me/bookings")({
  component: MeBookingsPage,
});

function MeBookingsPage() {
  const api = useApi();
  const { studentId } = useActiveStudentContext();
  const [filter, setFilter] = useState("ALL");

  const bookings = useQuery({
    queryKey: ["bookings", "student", studentId],
    queryFn: () => api.get<Booking[]>(`/bookings/student/${studentId}`),
    enabled: Boolean(studentId),
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

  return (
    <Screen
      title="My bookings"
      subtitle={
        pendingCount > 0
          ? `${pendingCount} waiting for studio confirmation`
          : "Track trial, open seat, and private requests."
      }
      showBack
      backTo="/me"
    >
      <PullToRefresh onRefresh={() => bookings.refetch()}>
        <div className={staff.section}>
          <FilterChipRow
            chips={[
              { id: "ALL", label: "All" },
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
                <PressableCard key={booking.id} asDiv>
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
    </Screen>
  );
}
