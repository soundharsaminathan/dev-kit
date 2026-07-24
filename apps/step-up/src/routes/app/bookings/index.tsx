import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import { BookingDetailDrawer } from "@/modules/bookings/booking-detail-drawer";
import {
  isBookingForTrainer,
  type StudioBooking,
} from "@/modules/bookings/types";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/app/bookings/")({
  component: BookingsPage,
});

function BookingMedia({ name }: { name: string }) {
  return (
    <span className={staff.bentoInitial} aria-hidden>
      {name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

function BookingsPage() {
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTrainer = user?.role === "TRAINER";
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bookings = useQuery({
    queryKey: ["bookings", "studio", STUDIO_ID],
    queryFn: () => api.get<StudioBooking[]>(`/bookings/studio/${STUDIO_ID}`),
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
      api.patch<StudioBooking>(`/bookings/${values.id}/status`, {
        status: values.status,
        ...(values.startsAt && values.endsAt
          ? { startsAt: values.startsAt, endsAt: values.endsAt }
          : {}),
      }),
    onSuccess: () => {
      invalidateBookings();
      setSelectedId(null);
    },
  });

  const scopedBookings = useMemo(() => {
    const items = bookings.data ?? [];
    if (!isTrainer || !user?.id) return items;
    return items.filter((booking) => isBookingForTrainer(booking, user.id));
  }, [bookings.data, isTrainer, user?.id]);

  const sortedBookings = useMemo(() => {
    return [...scopedBookings].sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (a.status !== "PENDING" && b.status === "PENDING") return 1;
      return 0;
    });
  }, [scopedBookings]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return sortedBookings;
    return sortedBookings.filter((booking) => booking.status === filter);
  }, [sortedBookings, filter]);

  const pendingCount = sortedBookings.filter(
    (booking) => booking.status === "PENDING",
  ).length;

  const selected =
    filtered.find((booking) => booking.id === selectedId) ??
    scopedBookings.find((booking) => booking.id === selectedId) ??
    null;

  return (
    <Screen
      title="Bookings"
      subtitle={
        pendingCount > 0
          ? `${pendingCount} pending approval`
          : isTrainer
            ? "Review requests for your batches."
            : "Review trial, open seat, and private requests."
      }
      actions={
        !isTrainer ? (
          <TouchButton variant="primary" size="md">
            <Link to="/app/bookings/new">Add</Link>
          </TouchButton>
        ) : undefined
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
              description={
                isTrainer
                  ? "Pending requests for your batches will appear here."
                  : "Bookings created for this studio will appear here."
              }
              action={
                !isTrainer ? (
                  <TouchButton variant="primary">
                    <Link to="/app/bookings/new">Add booking</Link>
                  </TouchButton>
                ) : undefined
              }
            />
          ) : null}

          {filtered.length > 0 ? (
            <ul className={staff.list} aria-label="Booking requests">
              {filtered.map((booking) => {
                const studentName = booking.student?.name ?? booking.studentId;
                const typeLabel = booking.type.replaceAll("_", " ");
                const subtitleParts = [
                  typeLabel,
                  booking.batch?.name,
                  booking.status,
                ].filter(Boolean);
                if (booking.notes) subtitleParts.push(booking.notes);

                return (
                  <li key={booking.id}>
                    <PressableCard onClick={() => setSelectedId(booking.id)}>
                      <div className={staff.rowCard}>
                        <div className={staff.rowWithAvatar}>
                          <span className={staff.listAvatar}>
                            <BookingMedia name={studentName} />
                          </span>
                          <div className={staff.rowBody}>
                            <span className={staff.rowTitle}>
                              {studentName}
                            </span>
                            <span className={staff.rowMeta}>
                              {subtitleParts.join(" · ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </PressableCard>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </PullToRefresh>

      <BookingDetailDrawer
        booking={selected}
        isOpen={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        isPending={updateStatus.isPending}
        onConfirm={(times) => {
          if (!selected) return;
          updateStatus.mutate({
            id: selected.id,
            status: "CONFIRMED",
            ...times,
          });
        }}
        onDecline={() => {
          if (!selected) return;
          updateStatus.mutate({
            id: selected.id,
            status: "CANCELLED",
          });
        }}
      />
    </Screen>
  );
}
