import type { DanceStyle } from "@/lib/dance-styles";

export type StudioSettings = {
  graceDays: number;
  expireAlertDays: number;
  platformFeePercent: number;
  gstPercent: number;
  admissionFee: number;
  timezone: string;
  razorpayKeyId?: string | null;
  razorpayConfigured?: boolean;
  danceStyles?: DanceStyle[] | null;
  gstNumber?: string | null;
  aiConfigured?: boolean;
  aiProvider?: "groq" | "gemini" | "openai" | null;
  aiChatModel?: string | null;
  publicStudioListing?: boolean;
  publicClasses?: boolean;
  publicTrainers?: boolean;
  publicRatings?: boolean;
  bookingTrial?: boolean;
  bookingEnrollment?: boolean;
  bookingPrivate?: boolean;
  bookingFloorHire?: boolean;
};

export type Studio = {
  id: string;
  name: string;
  address: string;
  contact: string;
  logoUrl?: string | null;
  heroMobileUrl?: string | null;
  heroDesktopUrl?: string | null;
  tagline?: string | null;
  about?: string | null;
  foundedYear?: number | null;
  email?: string | null;
  whatsapp?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  websiteUrl?: string | null;
  whatToBring?: string | null;
  trialBlurb?: string | null;
  photos?: string[];
  settings: StudioSettings | null;
};

export type StaffInvite = {
  id: string;
  email: string;
  role: "STAFF" | "TRAINER";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
  inviteUrl?: string;
};
