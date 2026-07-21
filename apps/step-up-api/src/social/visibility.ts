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

export async function canViewContent(params: {
  viewerId: string;
  author: Pick<User, "id" | "role" | "profileVisibility">;
  isFollowing: boolean;
}): Promise<boolean> {
  const { viewerId, author, isFollowing } = params;
  if (viewerId === author.id) {
    return true;
  }
  if (effectiveProfileVisibility(author) === ProfileVisibility.PUBLIC) {
    return true;
  }
  return isFollowing;
}
