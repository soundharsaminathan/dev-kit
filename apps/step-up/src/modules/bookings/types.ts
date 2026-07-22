export type StudioBooking = {
  id: string;
  type: string;
  status: string;
  studentId: string;
  trainerId?: string | null;
  batchId?: string | null;
  notes?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  sessionId?: string | null;
  student?: { id: string; name: string; email: string } | null;
  batch?: {
    id: string;
    name: string;
    trainers: Array<{ trainerId: string }>;
  } | null;
};

export function isBookingForTrainer(
  booking: StudioBooking,
  trainerId: string,
): boolean {
  if (booking.trainerId === trainerId) return true;
  return (
    booking.batch?.trainers.some((row) => row.trainerId === trainerId) ?? false
  );
}
