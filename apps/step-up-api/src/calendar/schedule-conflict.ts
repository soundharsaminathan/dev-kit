export type TimeInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type OccupancySlot = {
  kind: "session" | "booking";
  id: string;
  startsAt: Date;
  endsAt: Date;
  trainerIds: string[];
  studentIds: string[];
  branchId: string | null;
};

export type ConflictParty = "trainer" | "student" | "branch";

export type ScheduleConflict = {
  party: ConflictParty;
  partyId: string;
  interval: TimeInterval;
  occupancy: OccupancySlot;
};

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

export function collapseWindow(intervals: TimeInterval[]): TimeInterval | null {
  if (intervals.length === 0) {
    return null;
  }

  let startsAt = intervals[0].startsAt;
  let endsAt = intervals[0].endsAt;
  for (let i = 1; i < intervals.length; i += 1) {
    const interval = intervals[i];
    if (interval.startsAt < startsAt) {
      startsAt = interval.startsAt;
    }
    if (interval.endsAt > endsAt) {
      endsAt = interval.endsAt;
    }
  }
  return { startsAt, endsAt };
}

export function formatConflictInstant(date: Date): string {
  return date.toISOString();
}

export function conflictMessage(conflict: ScheduleConflict): string {
  const when = formatConflictInstant(conflict.interval.startsAt);
  if (conflict.party === "trainer") {
    return `Trainer is already booked at ${when}`;
  }
  if (conflict.party === "student") {
    return `Student has another class at ${when}`;
  }
  return `Branch already has a class at ${when}`;
}

export function findScheduleConflict(
  intervals: TimeInterval[],
  occupancy: OccupancySlot[],
  parties: {
    trainerIds?: string[];
    studentIds?: string[];
    branchId?: string;
  },
): ScheduleConflict | null {
  const trainerIds = parties.trainerIds ?? [];
  const studentIds = parties.studentIds ?? [];
  const branchId = parties.branchId;

  for (const interval of intervals) {
    for (const slot of occupancy) {
      if (!intervalsOverlap(interval, slot)) {
        continue;
      }

      if (branchId && slot.branchId === branchId) {
        return {
          party: "branch",
          partyId: branchId,
          interval,
          occupancy: slot,
        };
      }

      for (const trainerId of trainerIds) {
        if (slot.trainerIds.includes(trainerId)) {
          return {
            party: "trainer",
            partyId: trainerId,
            interval,
            occupancy: slot,
          };
        }
      }

      for (const studentId of studentIds) {
        if (slot.studentIds.includes(studentId)) {
          return {
            party: "student",
            partyId: studentId,
            interval,
            occupancy: slot,
          };
        }
      }
    }
  }

  return null;
}
