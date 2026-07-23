export type HomeNextClass = {
  sessionId: string;
  batchId: string;
  batchName: string;
  startsAt: string;
  endsAt: string;
  branchName: string | null;
  coverImageUrl: string | null;
};

export type HomeMembership = {
  id: string;
  status: string;
  periodEnd: string;
  subscriptionName: string | null;
  price: number | string | null;
  billingCadence: "MONTHLY" | "QUARTERLY" | string | null;
  needsRenewal: boolean;
};

export type HomeTimelineItem = {
  id: string;
  kind: "SESSION" | "BOOKING";
  title: string;
  startsAt: string;
  endsAt: string;
  batchId: string;
  branchName: string | null;
  state: "completed" | "now" | "upcoming";
};

export type HomeProgressItem = {
  batchId: string;
  batchName: string;
  styleBadge: string | null;
  branchName: string | null;
  totalSessions: number;
  attendedSessions: number;
  percent: number;
  nextLesson: {
    sessionId: string;
    startsAt: string;
    endsAt: string;
  } | null;
};

export type HomeAchievement = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string | null;
  newlyEarned: boolean;
};

export type HomeRecommendation = {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  styleBadge?: string | null;
  category?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  remainingSeats?: number | null;
  capacity?: number | null;
  price?: number | string | null;
  durationMinutes?: number | null;
  scheduleLabel?: string | null;
  trainers?: Array<{
    id?: string;
    trainer?: { id: string; name: string; photoUrl?: string | null };
  }>;
};

export type HomeBanner = {
  branchId: string;
  branchName: string;
  imageUrl: string | null;
  altText: string | null;
};

export type HomeInstructor = {
  id: string;
  name: string;
  photoUrl: string | null;
  styleBadge: string | null;
};

export type HomePayload = {
  student: {
    id: string;
    name: string;
    photoUrl: string | null;
    styles: string[];
  };
  studio: { id: string; name: string } | null;
  banner: HomeBanner | null;
  instructors: HomeInstructor[];
  hasEnrollment: boolean;
  greeting: string;
  hero: {
    kind: "nextClass" | "streak" | "membership" | "empty";
    title: string;
    subtitle: string;
    meta?: string | null;
    cta?: { label: string; to: string } | null;
    nextClass?: HomeNextClass | null;
    streak?: number;
    membership?: HomeMembership | null;
  };
  nextClass: HomeNextClass | null;
  membership: HomeMembership | null;
  todayTimeline: HomeTimelineItem[];
  progress: HomeProgressItem[];
  stats: {
    streak: number;
    sessionsCompleted: number;
    monthlySessions: number;
  };
  goal: {
    id: string | null;
    type: string;
    target: number;
    current: number;
    periodStart: string;
    periodEnd: string;
  };
  achievements: HomeAchievement[];
  recommendations: HomeRecommendation[];
  community: {
    contests: Array<{
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      status: string;
    }>;
    feedPostCount: number;
  };
  notificationsUnread: number;
  quickActions: {
    primary: { label: string; to: string };
    items: Array<{ label: string; to: string; icon: string }>;
  };
  generatedAt: string;
};
