import type { DanceStyle } from "@/lib/dance-styles";
import type { StudioBrandThemePayload } from "@/modules/branding/types";

export type StudioSettings = {
  graceDays: number;
  expireAlertDays: number;
  platformFeePercent: number;
  razorpayKeyId?: string | null;
  razorpayConfigured?: boolean;
  danceStyles?: DanceStyle[] | null;
};

export type Studio = {
  id: string;
  name: string;
  address: string;
  contact: string;
  logoUrl?: string | null;
  heroMobileUrl?: string | null;
  heroDesktopUrl?: string | null;
  brandTheme?: StudioBrandThemePayload | null;
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
