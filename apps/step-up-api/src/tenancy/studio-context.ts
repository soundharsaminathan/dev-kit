import type { UserRole } from "@prisma/client";

export type StudioContext = {
  studioId: string;
  userId: string;
  role: UserRole;
  slug: string;
};

export type TenantResolveInput =
  | { kind: "id"; value: string }
  | { kind: "slug"; value: string };
