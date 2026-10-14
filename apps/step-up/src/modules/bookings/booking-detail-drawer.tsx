import { AppDrawer } from "@/modules/ui/app-drawer";
import { BookingReviewPanel } from "./booking-review-panel";
import type { StudioBooking } from "./types";

export type BookingDetailDrawerProps = {
  booking: StudioBooking | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (times?: { startsAt: string; endsAt: string }) => void;
  onDecline: () => void;
};

export function BookingDetailDrawer({
  booking,
  isOpen,
  onOpenChange,
  isPending,
  onConfirm,
  onDecline,
}: BookingDetailDrawerProps) {
  return (
    <AppDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={booking?.student?.name ?? booking?.studentId ?? "Request"}
    >
      {booking ? (
        <BookingReviewPanel
          key={booking.id}
          booking={booking}
          isPending={isPending}
          onConfirm={onConfirm}
          onDecline={onDecline}
        />
      ) : null}
    </AppDrawer>
  );
}
