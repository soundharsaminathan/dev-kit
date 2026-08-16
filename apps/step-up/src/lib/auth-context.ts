import { createContext } from "react";
import type { AgeRange, ExperienceLevel, Gender, UserRole } from "./constants";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studioId: string | null;
  bio?: string | null | undefined;
  photoUrl?: string | null | undefined;
  instagramUrl?: string | null | undefined;
  styles?: string[] | undefined;
  experienceLevel?: ExperienceLevel | null | undefined;
  scheduleVibe?: string[] | undefined;
  gender?: Gender | null | undefined;
  ageRange?: AgeRange | null | undefined;
  dateOfBirth?: string | null | undefined;
  age?: number | null | undefined;
  guardianName?: string | null | undefined;
  alternateMobile?: string | null | undefined;
  preferredBranchId?: string | null | undefined;
  onboardingCompletedAt?: string | null | undefined;
  mustChangePassword?: boolean | undefined;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  hasPasswordProvider: boolean;
  emailVerified: boolean;
  needsEmailVerification: boolean;
  loginAsSystemAdmin: () => Promise<AuthUser>;
  signIn: (identifier: string, password: string) => Promise<AuthUser>;
  signUp: (
    email: string,
    password: string,
    name: string,
    options?: { studioId?: string },
  ) => Promise<AuthUser>;
  signInWithGoogle: (options?: {
    asNewStudent?: boolean;
    studioId?: string;
  }) => Promise<AuthUser>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  refreshEmailVerification: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateUser: (patch: Partial<AuthUser>) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
