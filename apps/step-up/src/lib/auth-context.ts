import { createContext } from "react";
import type { DevUser, ExperienceLevel, UserRole } from "./constants";

export type AuthUser = DevUser & {
  bio?: string | null | undefined;
  photoUrl?: string | null | undefined;
  instagramUrl?: string | null | undefined;
  styles?: string[] | undefined;
  experienceLevel?: ExperienceLevel | null | undefined;
  scheduleVibe?: string[] | undefined;
  preferredBranchId?: string | null | undefined;
  onboardingCompletedAt?: string | null | undefined;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginAsDev: (role: UserRole) => void;
  signIn: (identifier: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string, name: string) => Promise<AuthUser>;
  signInWithGoogle: (options?: { asNewStudent?: boolean }) => Promise<AuthUser>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateUser: (patch: Partial<AuthUser>) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
