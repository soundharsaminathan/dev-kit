import { BadRequestException } from "@nestjs/common";
import { BookingStatus, BookingType, type Prisma } from "@prisma/client";

export const PAYMENT_HOLD_MS = 30_000;

export const SEAT_HOLDING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.AWAITING_PAYMENT,
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

type Tx = Prisma.TransactionClient;

export async function lockBatchRow(tx: Tx, batchId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Batch" WHERE id = ${batchId} FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new BadRequestException("Batch not found");
  }
}

export async function expireStalePaymentHolds(tx: Tx, batchId?: string) {
  const now = new Date();
  await tx.booking.updateMany({
    where: {
      status: BookingStatus.AWAITING_PAYMENT,
      paymentHoldExpiresAt: { lte: now },
      ...(batchId ? { batchId } : {}),
    },
    data: {
      status: BookingStatus.CANCELLED,
      paymentHoldExpiresAt: null,
    },
  });
}

/** Unique students occupying seats via enrollment or open non-private bookings. */
export async function countOccupiedSeats(
  tx: Tx,
  batchId: string,
): Promise<number> {
  await expireStalePaymentHolds(tx, batchId);

  const now = new Date();
  const [enrollments, holdings] = await Promise.all([
    tx.batchEnrollment.findMany({
      where: { batchId },
      select: { studentId: true },
    }),
    tx.booking.findMany({
      where: {
        batchId,
        type: { not: BookingType.PRIVATE },
        OR: [
          {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
          {
            status: BookingStatus.AWAITING_PAYMENT,
            paymentHoldExpiresAt: { gt: now },
          },
        ],
      },
      select: { studentId: true },
    }),
  ]);

  const occupied = new Set<string>();
  for (const row of enrollments) occupied.add(row.studentId);
  for (const row of holdings) occupied.add(row.studentId);
  return occupied.size;
}

export async function assertBatchHasSeat(
  tx: Tx,
  batchId: string,
  capacity: number,
  studentId: string,
) {
  const occupied = await countOccupiedSeats(tx, batchId);
  const alreadyCounted =
    (await tx.batchEnrollment.findFirst({
      where: { batchId, studentId },
      select: { id: true },
    })) != null ||
    (await tx.booking.findFirst({
      where: {
        batchId,
        studentId,
        type: { not: BookingType.PRIVATE },
        OR: [
          {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
          {
            status: BookingStatus.AWAITING_PAYMENT,
            paymentHoldExpiresAt: { gt: new Date() },
          },
        ],
      },
      select: { id: true },
    })) != null;

  if (!alreadyCounted && occupied >= capacity) {
    throw new BadRequestException("Batch is at capacity");
  }
}

export function paymentHoldExpiresAt(from = new Date()) {
  return new Date(from.getTime() + PAYMENT_HOLD_MS);
}

export async function countReservedSeatsByBatch(
  tx: Tx | Prisma.TransactionClient,
  batchIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (batchIds.length === 0) return result;

  const now = new Date();
  await expireStalePaymentHolds(tx as Tx);

  const [enrollments, holdings] = await Promise.all([
    tx.batchEnrollment.findMany({
      where: { batchId: { in: batchIds } },
      select: { batchId: true, studentId: true },
    }),
    tx.booking.findMany({
      where: {
        batchId: { in: batchIds },
        type: { not: BookingType.PRIVATE },
        OR: [
          {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
          {
            status: BookingStatus.AWAITING_PAYMENT,
            paymentHoldExpiresAt: { gt: now },
          },
        ],
      },
      select: { batchId: true, studentId: true },
    }),
  ]);

  const byBatch = new Map<string, Set<string>>();
  for (const id of batchIds) byBatch.set(id, new Set());

  for (const row of enrollments) {
    byBatch.get(row.batchId)?.add(row.studentId);
  }
  for (const row of holdings) {
    if (row.batchId) byBatch.get(row.batchId)?.add(row.studentId);
  }

  for (const [batchId, students] of byBatch) {
    result.set(batchId, students.size);
  }
  return result;
}
