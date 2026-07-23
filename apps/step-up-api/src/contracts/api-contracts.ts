import { z } from "zod";

export const attendanceStatusSchema = z.enum(["PRESENT", "ABSENT"]);
export const attendanceSourceSchema = z.enum(["TRAINER", "DESK", "QR"]);

export const markAttendanceRequestSchema = z.object({
  sessionId: z.string().min(1),
  studentId: z.string().min(1),
  status: attendanceStatusSchema,
  source: attendanceSourceSchema,
});

export const sessionRosterEntrySchema = z.object({
  studentId: z.string().min(1),
  student: z.object({
    name: z.string(),
  }),
  attendance: z
    .object({
      id: z.string().min(1),
      status: attendanceStatusSchema,
      source: attendanceSourceSchema,
    })
    .nullable(),
});

export const bookingCreateRequestSchema = z.object({
  studioId: z.string().min(1),
  studentId: z.string().min(1),
  type: z.enum(["OPEN_SEAT", "TRIAL", "PRIVATE"]),
  sessionId: z.string().min(1).optional(),
  trainerId: z.string().min(1).optional(),
  batchId: z.string().min(1).optional(),
  notes: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const bookingPaymentConfirmSchema = z.object({
  id: z.string().min(1),
});

export const notificationListItemSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string(),
  body: z.string(),
  meta: z.unknown().optional(),
  deepLink: z.string().nullable().optional(),
  readAt: z.union([z.string(), z.null()]),
  createdAt: z.union([z.string(), z.date()]),
  status: z.string().optional(),
});
