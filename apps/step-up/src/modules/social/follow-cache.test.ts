import { describe, expect, it } from "vitest";
import {
  applyOptimisticFollow,
  applyOptimisticFollowToProfile,
  applyOptimisticUnfollow,
  applyOptimisticUnfollowToProfile,
  reconcileFollowState,
} from "./follow-cache";

describe("follow-cache", () => {
  it("applies a following state and increments follower count", () => {
    const next = applyOptimisticFollow(
      {
        isFollowing: false,
        followRequestStatus: null,
        followerCount: 3,
      },
      "following",
    );

    expect(next).toEqual({
      isFollowing: true,
      followRequestStatus: null,
      followerCount: 4,
    });
  });

  it("applies a pending request without changing follower count", () => {
    const next = applyOptimisticFollow(
      {
        isFollowing: false,
        followRequestStatus: null,
        followerCount: 3,
      },
      "requested",
    );

    expect(next).toEqual({
      isFollowing: false,
      followRequestStatus: "PENDING",
      followerCount: 3,
    });
  });

  it("unfollows and clamps follower count at zero", () => {
    expect(
      applyOptimisticUnfollow({
        isFollowing: true,
        followRequestStatus: null,
        followerCount: 0,
      }),
    ).toEqual({
      isFollowing: false,
      followRequestStatus: null,
      followerCount: 0,
    });
  });

  it("cancels a pending request without changing follower count", () => {
    expect(
      applyOptimisticUnfollow({
        isFollowing: false,
        followRequestStatus: "PENDING",
        followerCount: 5,
      }),
    ).toEqual({
      isFollowing: false,
      followRequestStatus: null,
      followerCount: 5,
    });
  });

  it("unlocks private profile content on follow and locks on unfollow", () => {
    const followed = applyOptimisticFollowToProfile(
      {
        isFollowing: false,
        followRequestStatus: null,
        followerCount: 1,
        profileVisibility: "PRIVATE",
        canViewContent: false,
        isOwnProfile: false,
      },
      "following",
    );
    expect(followed.canViewContent).toBe(true);

    const unfollowed = applyOptimisticUnfollowToProfile(followed);
    expect(unfollowed.canViewContent).toBe(false);
  });

  it("reconciles a requested optimistic state into following", () => {
    const next = reconcileFollowState(
      {
        isFollowing: false,
        followRequestStatus: "PENDING",
        followerCount: 2,
      },
      { status: "following" },
    );

    expect(next).toEqual({
      isFollowing: true,
      followRequestStatus: null,
      followerCount: 3,
    });
  });

  it("reconciles unfollow results", () => {
    const next = reconcileFollowState(
      {
        isFollowing: true,
        followRequestStatus: null,
        followerCount: 4,
      },
      { status: "unfollowed" },
    );

    expect(next).toEqual({
      isFollowing: false,
      followRequestStatus: null,
      followerCount: 3,
    });
  });
});
