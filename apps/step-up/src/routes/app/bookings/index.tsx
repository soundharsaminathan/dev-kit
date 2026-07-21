import { Badge } from "@dev-ui/components/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
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

function BookingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

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
      setActiveId(null);
      setStartsAt("");
      setEndsAt("");
      invalidateBookings();
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

  const activeBooking =
    sortedBookings.find((booking) => booking.id === activeId) ?? null;

  const openReview = (booking: Booking) => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setActiveId(booking.id);
    setStartsAt(toLocalInputValue(start));
    setEndsAt(toLocalInputValue(end));
  };

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
            <div className={staff.list}>
              {filtered.map((booking) => (
                <PressableCard key={booking.id} asDiv>
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>
                        {booking.student?.name ?? booking.studentId}
                      </span>
                      <Badge variant={STATUS_VARIANT[booking.status]}>
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
                    ) : null}
                    {booking.status === "PENDING" ? (
                      <div className={staff.rowActions}>
                        <TouchButton
                          size="md"
                          variant="primary"
                          onClick={() => openReview(booking)}
                        >
                          Review
                        </TouchButton>
                      </div>
                    ) : null}
                  </div>
                </PressableCard>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <AppBottomSheet
        isOpen={Boolean(activeBooking)}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
        title={
          activeBooking
            ? `Review ${activeBooking.student?.name ?? "booking"}`
            : "Review booking"
        }
      >
        {activeBooking ? (
          <div className={staff.sheetStack}>
            <p className={staff.rowMeta}>
              {activeBooking.type.replaceAll("_", " ")}
              {activeBooking.notes ? ` · ${activeBooking.notes}` : ""}
            </p>
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
            <div className={staff.sheetActions}>
              <TouchButton
                variant="primary"
                fullWidth
                isPending={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    id: activeBooking.id,
                    status: "CONFIRMED",
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
                isPending={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    id: activeBooking.id,
                    status: "CONFIRMED",
                  })
                }
              >
                Confirm without time
              </TouchButton>
              <TouchButton
                variant="danger"
                fullWidth
                isPending={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    id: activeBooking.id,
                    status: "CANCELLED",
                  })
                }
              >
                Decline
              </TouchButton>
            </div>
          </div>
        ) : null}
      </AppBottomSheet>
    </Screen>
  );
}
