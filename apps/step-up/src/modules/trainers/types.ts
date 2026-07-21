export type TrainerViewMode = "cards" | "bento" | "stack";

export type StudioTrainer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  bannerUrl?: string | null;
  styles: string[];
  followerCount: number;
  followingCount: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followRequestStatus: "PENDING" | null;
};

export const TRAINER_VIEW_STORAGE_KEY = "step-up-trainers-view";

export const TRAINER_VIEW_CHIPS = [
  { id: "cards", label: "Cards" },
  { id: "bento", label: "Bento" },
  { id: "stack", label: "Stack" },
] as const;
