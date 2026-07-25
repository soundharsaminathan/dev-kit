import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import type { StudioTrainer } from "@/modules/trainers/types";
import {
  applyOptimisticFollow,
  applyOptimisticFollowToProfile,
  applyOptimisticUnfollow,
  applyOptimisticUnfollowToProfile,
  type FollowMutationResult,
  type FollowOptimisticMode,
  reconcileFollowState,
} from "./follow-cache";
import type { SocialProfile } from "./types";

type FollowVariables = {
  userId: string;
  mode: FollowOptimisticMode;
};

type UnfollowVariables = {
  userId: string;
};

type FollowToggleState = {
  isFollowing: boolean;
  followRequestStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
  profileVisibility?: "PUBLIC" | "PRIVATE";
};

type FollowIntent =
  | { type: "follow"; mode: FollowOptimisticMode }
  | { type: "unfollow" };

function patchTrainerList(
  trainers: StudioTrainer[] | undefined,
  userId: string,
  patch: (trainer: StudioTrainer) => StudioTrainer,
): StudioTrainer[] | undefined {
  if (!trainers) return trainers;
  return trainers.map((trainer) =>
    trainer.id === userId ? patch(trainer) : trainer,
  );
}

export function useFollowMutations() {
  const api = useApi();
  const queryClient = useQueryClient();
  const intentRef = useRef(new Map<string, FollowIntent>());
  const inflightRef = useRef(new Set<string>());

  function resolveFollowState(
    userId: string,
    fallback: FollowToggleState,
  ): FollowToggleState {
    const profile = queryClient.getQueryData<SocialProfile>([
      "profile",
      userId,
    ]);
    if (profile) {
      return {
        isFollowing: profile.isFollowing,
        followRequestStatus: profile.followRequestStatus,
        profileVisibility: profile.profileVisibility,
      };
    }

    const trainers = queryClient.getQueryData<StudioTrainer[]>([
      "studio-trainers",
      STUDIO_ID,
    ]);
    const trainer = trainers?.find((item) => item.id === userId);
    if (trainer) {
      return {
        isFollowing: trainer.isFollowing,
        followRequestStatus: trainer.followRequestStatus,
        ...(fallback.profileVisibility
          ? { profileVisibility: fallback.profileVisibility }
          : {}),
      };
    }

    return fallback;
  }

  function applyFollowOptimistic(userId: string, mode: FollowOptimisticMode) {
    queryClient.setQueryData<SocialProfile>(["profile", userId], (current) =>
      current ? applyOptimisticFollowToProfile(current, mode) : current,
    );
    queryClient.setQueryData<StudioTrainer[]>(
      ["studio-trainers", STUDIO_ID],
      (current) =>
        patchTrainerList(current, userId, (trainer) =>
          applyOptimisticFollow(trainer, mode),
        ),
    );
  }

  function applyUnfollowOptimistic(userId: string) {
    queryClient.setQueryData<SocialProfile>(["profile", userId], (current) =>
      current ? applyOptimisticUnfollowToProfile(current) : current,
    );
    queryClient.setQueryData<StudioTrainer[]>(
      ["studio-trainers", STUDIO_ID],
      (current) => patchTrainerList(current, userId, applyOptimisticUnfollow),
    );
  }

  function reconcileResult(userId: string, result: FollowMutationResult) {
    queryClient.setQueryData<SocialProfile>(["profile", userId], (current) =>
      current ? reconcileFollowState(current, result) : current,
    );
    queryClient.setQueryData<StudioTrainer[]>(
      ["studio-trainers", STUDIO_ID],
      (current) =>
        patchTrainerList(current, userId, (trainer) =>
          reconcileFollowState(trainer, result),
        ),
    );
  }

  function hasQueuedIntent(userId: string) {
    return intentRef.current.has(userId);
  }

  async function cancelFollowQueries(userId: string) {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ["profile", userId] }),
      queryClient.cancelQueries({
        queryKey: ["studio-trainers", STUDIO_ID],
      }),
    ]);
  }

  function resyncFollowQueries(userId: string) {
    void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    void queryClient.invalidateQueries({
      queryKey: ["studio-trainers", STUDIO_ID],
    });
  }

  const followMutation = useMutation({
    mutationFn: ({ userId }: FollowVariables) =>
      api.post<FollowMutationResult>(`/users/${userId}/follow`),
    onMutate: async ({ userId }) => {
      await cancelFollowQueries(userId);
    },
    onSuccess: (result, { userId }) => {
      if (hasQueuedIntent(userId)) return;
      reconcileResult(userId, result);
    },
    onSettled: (_data, error, { userId }) => {
      inflightRef.current.delete(userId);
      if (error && !hasQueuedIntent(userId)) {
        resyncFollowQueries(userId);
      }
      flushFollowIntent(userId);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: ({ userId }: UnfollowVariables) =>
      api.delete<FollowMutationResult>(`/users/${userId}/follow`),
    onMutate: async ({ userId }) => {
      await cancelFollowQueries(userId);
    },
    onSuccess: (result, { userId }) => {
      if (hasQueuedIntent(userId)) return;
      reconcileResult(userId, result);
    },
    onSettled: (_data, error, { userId }) => {
      inflightRef.current.delete(userId);
      if (error && !hasQueuedIntent(userId)) {
        resyncFollowQueries(userId);
      }
      flushFollowIntent(userId);
    },
  });

  function flushFollowIntent(userId: string) {
    if (inflightRef.current.has(userId)) return;
    const intent = intentRef.current.get(userId);
    if (!intent) return;

    intentRef.current.delete(userId);
    inflightRef.current.add(userId);

    if (intent.type === "follow") {
      followMutation.mutate({ userId, mode: intent.mode });
      return;
    }
    unfollowMutation.mutate({ userId });
  }

  function queueFollowIntent(userId: string, intent: FollowIntent) {
    intentRef.current.set(userId, intent);
    flushFollowIntent(userId);
  }

  function isPendingFor(userId: string) {
    return (
      inflightRef.current.has(userId) ||
      intentRef.current.has(userId) ||
      (followMutation.isPending &&
        followMutation.variables?.userId === userId) ||
      (unfollowMutation.isPending &&
        unfollowMutation.variables?.userId === userId)
    );
  }

  function follow(userId: string, mode: FollowOptimisticMode = "following") {
    applyFollowOptimistic(userId, mode);
    queueFollowIntent(userId, { type: "follow", mode });
  }

  function unfollow(userId: string) {
    applyUnfollowOptimistic(userId);
    queueFollowIntent(userId, { type: "unfollow" });
  }

  function toggleFollow(input: {
    userId: string;
    isFollowing: boolean;
    followRequestStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
    profileVisibility?: "PUBLIC" | "PRIVATE";
  }) {
    const state = resolveFollowState(input.userId, {
      isFollowing: input.isFollowing,
      followRequestStatus: input.followRequestStatus,
      ...(input.profileVisibility
        ? { profileVisibility: input.profileVisibility }
        : {}),
    });

    if (state.isFollowing || state.followRequestStatus === "PENDING") {
      unfollow(input.userId);
      return;
    }

    const mode: FollowOptimisticMode =
      state.profileVisibility === "PRIVATE" ? "requested" : "following";
    follow(input.userId, mode);
  }

  return {
    follow,
    unfollow,
    toggleFollow,
    isPendingFor,
    followMutation,
    unfollowMutation,
  };
}
