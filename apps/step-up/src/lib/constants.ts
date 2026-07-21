export const STUDIO_ID = "studio-seed-1";

export type UserRole = "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";

export type DevUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studioId: string;
};

export const DEV_USERS: Record<UserRole, DevUser> = {
  OWNER: {
    id: "owner-1",
    email: "owner@stepup.dev",
    name: "Studio Owner",
    role: "OWNER",
    studioId: STUDIO_ID,
  },
  STAFF: {
    id: "staff-1",
    email: "staff@stepup.dev",
    name: "Front Desk Staff",
    role: "STAFF",
    studioId: STUDIO_ID,
  },
  TRAINER: {
    id: "trainer-1",
    email: "trainer@stepup.dev",
    name: "Lead Trainer",
    role: "TRAINER",
    studioId: STUDIO_ID,
  },
  STUDENT: {
    id: "student-1",
    email: "student@stepup.dev",
    name: "Alex Student",
    role: "STUDENT",
    studioId: STUDIO_ID,
  },
  PARENT: {
    id: "parent-1",
    email: "parent@stepup.dev",
    name: "Jamie Parent",
    role: "PARENT",
    studioId: STUDIO_ID,
  },
};

export const STAFF_ROLES: UserRole[] = ["OWNER", "STAFF", "TRAINER"];
export const MEMBER_ROLES: UserRole[] = ["STUDENT", "PARENT"];

export function isAuthBypassEnabled() {
  return import.meta.env.VITE_AUTH_BYPASS === "true";
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:3000";
}
