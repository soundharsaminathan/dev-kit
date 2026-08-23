export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

export type ShareCardThemeId = "bold" | "elegant" | "studio";

export type ShareCardFieldKey =
  | "danceStyle"
  | "trainerName"
  | "schedule"
  | "ageGroup"
  | "location";

export type BatchShareCardData = {
  batchName: string;
  danceStyle?: string;
  trainerName?: string;
  schedule?: string;
  ageGroup?: string;
  location?: string;

  headline: string;
  cta?: string;

  studioName: string;
  studioLogoUrl?: string;
  studioPrimaryColor?: string;
};

export type ShareCardFieldVisibility = Partial<
  Record<ShareCardFieldKey, boolean>
>;

export type ShareCardOptions = {
  headline: string;
  cta: string;
  theme: ShareCardThemeId;
  fields: ShareCardFieldVisibility;
};

export type BatchShareSource = {
  name: string;
  category?: "KIDS" | "ADULTS" | string | null;
  styleBadge?: string | null;
  danceCategories?: Array<{ name: string }> | null;
  scheduleLabel?: string | null;
  trainers?: Array<{
    trainer?: { name?: string | null } | null;
  }> | null;
  branch?: {
    name?: string | null;
    address?: string | null;
  } | null;
};

export type StudioShareSource = {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  settings?: {
    danceStyles?: Array<{ id: string; label: string; color: string }> | null;
  } | null;
};

export const SHARE_CARD_FIELD_LABELS: Record<ShareCardFieldKey, string> = {
  danceStyle: "Dance style",
  trainerName: "Trainer",
  schedule: "Schedule",
  ageGroup: "Age group",
  location: "Location",
};

export const SHARE_CARD_THEMES: Array<{
  id: ShareCardThemeId;
  label: string;
}> = [
  { id: "bold", label: "Bold" },
  { id: "elegant", label: "Elegant" },
  { id: "studio", label: "Studio" },
];
