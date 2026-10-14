export type Followable = {
  isFollowing: boolean;
  followRequestStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
  followerCount: number;
};

export type FollowOptimisticMode = "following" | "requested";

export type FollowMutationResult =
  | { status: "following" }
  | { status: "requested"; requestId?: string }
  | { status: "unfollowed" };

export function applyOptimisticFollow<T extends Followable>(
  item: T,
  mode: FollowOptimisticMode,
): T {
  if (item.isFollowing) {
    return item;
  }

  if (mode === "requested") {
    if (item.followRequestStatus === "PENDING") {
      return item;
    }
    return {
      ...item,
      followRequestStatus: "PENDING",
    };
  }

  return {
    ...item,
    isFollowing: true,
    followRequestStatus: null,
    followerCount: item.followerCount + 1,
  };
}

export function applyOptimisticUnfollow<T extends Followable>(item: T): T {
  const wasFollowing = item.isFollowing;
  return {
    ...item,
    isFollowing: false,
    followRequestStatus: null,
    followerCount: wasFollowing
      ? Math.max(0, item.followerCount - 1)
      : item.followerCount,
  };
}

export function reconcileFollowState<T extends Followable>(
  item: T,
  result: FollowMutationResult,
): T {
  if (result.status === "unfollowed") {
    return applyOptimisticUnfollow(item);
  }
  if (result.status === "requested") {
    return applyOptimisticFollow({ ...item, isFollowing: false }, "requested");
  }
  if (item.isFollowing && item.followRequestStatus == null) {
    return item;
  }
  return applyOptimisticFollow(
    { ...item, isFollowing: false, followRequestStatus: null },
    "following",
  );
}

export type ProfileFollowFields = Followable & {
  profileVisibility?: "PUBLIC" | "PRIVATE";
  canViewContent?: boolean;
  isOwnProfile?: boolean;
};

export function applyOptimisticFollowToProfile<T extends ProfileFollowFields>(
  profile: T,
  mode: FollowOptimisticMode,
): T {
  const next = applyOptimisticFollow(profile, mode);
  if (mode === "following" && profile.profileVisibility === "PRIVATE") {
    return { ...next, canViewContent: true };
  }
  return next;
}

export function applyOptimisticUnfollowToProfile<T extends ProfileFollowFields>(
  profile: T,
): T {
  const next = applyOptimisticUnfollow(profile);
  if (
    profile.profileVisibility === "PRIVATE" &&
    !profile.isOwnProfile &&
    profile.isFollowing
  ) {
    return { ...next, canViewContent: false };
  }
  return next;
}
