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

type FollowCacheSnapshot = {
  profile: SocialProfile | undefined;
  trainers: StudioTrainer[] | undefined;
  writeId: number;
};

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
  const writeIdRef = useRef(0);
  const inflightRef = useRef(new Set<string>());

  function isLatestWrite(writeId: number | undefined) {
    return writeId !== undefined && writeId === writeIdRef.current;
  }

  function releaseInflight(userId: string, writeId: number | undefined) {
    if (writeId === undefined || isLatestWrite(writeId)) {
      inflightRef.current.delete(userId);
    }
  }

  const followMutation = useMutation({
    mutationFn: ({ userId }: FollowVariables) =>
      api.post<FollowMutationResult>(`/users/${userId}/follow`),
    onMutate: async ({ userId, mode }) => {
      writeIdRef.current += 1;
      const writeId = writeIdRef.current;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["profile", userId] }),
        queryClient.cancelQueries({
          queryKey: ["studio-trainers", STUDIO_ID],
        }),
      ]);

      const previous: FollowCacheSnapshot = {
        profile: queryClient.getQueryData<SocialProfile>(["profile", userId]),
        trainers: queryClient.getQueryData<StudioTrainer[]>([
          "studio-trainers",
          STUDIO_ID,
        ]),
        writeId,
      };

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

      return previous;
    },
    onError: (_error, { userId }, context) => {
      if (!context || !isLatestWrite(context.writeId)) return;
      if (context.profile !== undefined) {
        queryClient.setQueryData(["profile", userId], context.profile);
      }
      if (context.trainers !== undefined) {
        queryClient.setQueryData(
          ["studio-trainers", STUDIO_ID],
          context.trainers,
        );
      }
    },
    onSuccess: (result, { userId }, context) => {
      if (!isLatestWrite(context?.writeId)) return;
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
    },
    onSettled: (_data, error, { userId }, context) => {
      releaseInflight(userId, context?.writeId);
      // Skip refetch-on-success: it races rapid toggle and can overwrite newer state.
      if (error && isLatestWrite(context?.writeId)) {
        void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        void queryClient.invalidateQueries({
          queryKey: ["studio-trainers", STUDIO_ID],
        });
      }
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: ({ userId }: UnfollowVariables) =>
      api.delete<FollowMutationResult>(`/users/${userId}/follow`),
    onMutate: async ({ userId }) => {
      writeIdRef.current += 1;
      const writeId = writeIdRef.current;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["profile", userId] }),
        queryClient.cancelQueries({
          queryKey: ["studio-trainers", STUDIO_ID],
        }),
      ]);

      const previous: FollowCacheSnapshot = {
        profile: queryClient.getQueryData<SocialProfile>(["profile", userId]),
        trainers: queryClient.getQueryData<StudioTrainer[]>([
          "studio-trainers",
          STUDIO_ID,
        ]),
        writeId,
      };

      queryClient.setQueryData<SocialProfile>(["profile", userId], (current) =>
        current ? applyOptimisticUnfollowToProfile(current) : current,
      );
      queryClient.setQueryData<StudioTrainer[]>(
        ["studio-trainers", STUDIO_ID],
        (current) => patchTrainerList(current, userId, applyOptimisticUnfollow),
      );

      return previous;
    },
    onError: (_error, { userId }, context) => {
      if (!context || !isLatestWrite(context.writeId)) return;
      if (context.profile !== undefined) {
        queryClient.setQueryData(["profile", userId], context.profile);
      }
      if (context.trainers !== undefined) {
        queryClient.setQueryData(
          ["studio-trainers", STUDIO_ID],
          context.trainers,
        );
      }
    },
    onSuccess: (result, { userId }, context) => {
      if (!isLatestWrite(context?.writeId)) return;
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
    },
    onSettled: (_data, error, { userId }, context) => {
      releaseInflight(userId, context?.writeId);
      if (error && isLatestWrite(context?.writeId)) {
        void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        void queryClient.invalidateQueries({
          queryKey: ["studio-trainers", STUDIO_ID],
        });
      }
    },
  });

  function isPendingFor(userId: string) {
    return (
      inflightRef.current.has(userId) ||
      (followMutation.isPending &&
        followMutation.variables?.userId === userId) ||
      (unfollowMutation.isPending &&
        unfollowMutation.variables?.userId === userId)
    );
  }

  function follow(userId: string, mode: FollowOptimisticMode = "following") {
    if (inflightRef.current.has(userId)) return;
    inflightRef.current.add(userId);
    followMutation.mutate({ userId, mode });
  }

  function unfollow(userId: string) {
    if (inflightRef.current.has(userId)) return;
    inflightRef.current.add(userId);
    unfollowMutation.mutate({ userId });
  }

  function toggleFollow(input: {
    userId: string;
    isFollowing: boolean;
    followRequestStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
    profileVisibility?: "PUBLIC" | "PRIVATE";
  }) {
    if (inflightRef.current.has(input.userId)) return;

    if (input.isFollowing || input.followRequestStatus === "PENDING") {
      unfollow(input.userId);
      return;
    }

    const mode: FollowOptimisticMode =
      input.profileVisibility === "PRIVATE" ? "requested" : "following";
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
