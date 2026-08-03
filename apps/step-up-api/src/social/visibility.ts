import { ProfileVisibility, type User, UserRole } from "@prisma/client";

const ALWAYS_PUBLIC_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.STAFF,
  UserRole.TRAINER,
];

export function effectiveProfileVisibility(
  user: Pick<User, "role" | "profileVisibility">,
): ProfileVisibility {
  if (ALWAYS_PUBLIC_ROLES.includes(user.role)) {
    return ProfileVisibility.PUBLIC;
  }
  return user.profileVisibility;
}

export function isAlwaysPublicRole(role: UserRole) {
  return ALWAYS_PUBLIC_ROLES.includes(role);
}

export function isSameStudio(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return Boolean(a) && a === b;
}

export async function canViewContent(params: {
  viewerId: string;
  viewerStudioId?: string | null;
  author: Pick<User, "id" | "role" | "profileVisibility" | "studioId">;
  isFollowing: boolean;
}): Promise<boolean> {
  const { viewerId, viewerStudioId, author, isFollowing } = params;
  if (viewerId === author.id) {
    return true;
  }
  if (!isSameStudio(viewerStudioId, author.studioId)) {
    return false;
  }
  if (effectiveProfileVisibility(author) === ProfileVisibility.PUBLIC) {
    return true;
  }
  return isFollowing;
}
