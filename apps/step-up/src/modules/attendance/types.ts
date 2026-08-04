export type AttendanceStatusValue = "PRESENT" | "ABSENT";

export type AttendanceRosterEntry = {
  studentId: string;
  monthlyUnpaid?: boolean;
  isTrial?: boolean;
  trialBookingStatus?: "PENDING" | "CONFIRMED" | null;
  student: { name: string; createdAt?: string };
  attendance: {
    id: string;
    status: AttendanceStatusValue;
    source: "TRAINER" | "DESK" | "QR";
  } | null;
};

export type AttendanceStatusFilter = "all" | "PRESENT" | "ABSENT" | "UNMARKED";

export function rosterStatus(
  entry: AttendanceRosterEntry,
): AttendanceStatusValue | "UNMARKED" {
  return entry.attendance?.status ?? "UNMARKED";
}

export function attendanceSourceLabel(
  source: "TRAINER" | "DESK" | "QR",
): string {
  if (source === "QR") return "Checked in via QR";
  if (source === "DESK") return "Marked at desk";
  return "Marked by trainer";
}

export function attendanceStatusLabel(
  status: AttendanceStatusValue | "UNMARKED",
): string {
  if (status === "PRESENT") return "Present";
  if (status === "ABSENT") return "Absent";
  return "Unmarked";
}
