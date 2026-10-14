export type JourneyFilterTag =
  | "attendance"
  | "batches"
  | "competitions"
  | "certificates"
  | "plans"
  | "achievements"
  | "feedback";

export type JourneyEventKind =
  | "JOINED"
  | "BATCH"
  | "PLAN"
  | "ATTENDANCE"
  | "ATTENDANCE_STREAK"
  | "COMPETITION"
  | "CERTIFICATE"
  | "ACHIEVEMENT"
  | "TRAINER"
  | "LEVEL_UP"
  | "FEEDBACK";

export type JourneyEventTier = "large" | "medium" | "small";

export type JourneyEventStatus = "completed" | "current" | "upcoming";

export type JourneyTrainer = {
  id: string;
  name: string;
  photoUrl?: string | null;
};

export type JourneyEvent = {
  id: string;
  kind: JourneyEventKind;
  tier: JourneyEventTier;
  title: string;
  occurredAt: string;
  status: JourneyEventStatus;
  icon: string;
  imageUrl?: string | null;
  trainer?: JourneyTrainer | null;
  certificatePreviewUrl?: string | null;
  xp?: number | null;
  newlyEarned?: boolean;
  meta?: Record<string, unknown>;
  filterTags: JourneyFilterTag[];
};

export type JourneyStats = {
  yearsLearning: number;
  classesAttended: number;
  attendancePercent: number;
  certificates: number;
  competitions: number;
  currentStreak: number;
  longestStreak: number;
  currentLevel: string | null;
};

export type JourneyPayload = {
  student: {
    id: string;
    name: string;
    photoUrl: string | null;
    level: string | null;
  };
  currentEventId: string | null;
  stats: JourneyStats;
  events: JourneyEvent[];
  generatedAt: string;
};
