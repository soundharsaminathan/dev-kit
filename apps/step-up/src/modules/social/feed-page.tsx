import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useApi } from "@/lib/api-context";
import { ComposePost } from "@/modules/social/compose-post";
import { PostCard } from "@/modules/social/post-card";
import type { SocialFeedPage, SocialPost } from "@/modules/social/types";
import { sharePost } from "@/modules/social/upload";
import { LoadMoreIndicator } from "@/modules/ui/load-more-indicator";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./feed-page.module.scss";

export function FeedPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      const query = params.toString();
      return api.get<SocialFeedPage>(`/feed${query ? `?${query}` : ""}`);
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const posts = feedQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feedQuery;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const likeMutation = useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked
        ? api.delete<SocialPost>(`/posts/${postId}/like`)
        : api.post<SocialPost>(`/posts/${postId}/like`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const repostMutation = useMutation({
    mutationFn: (postId: string) =>
      api.post<SocialPost>(`/posts/${postId}/repost`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return (
    <Screen title="Feed" subtitle="Photos from people you follow.">
      <PullToRefresh onRefresh={() => feedQuery.refetch()}>
        <div className={styles.feed}>
          <ComposePost
            onCreated={() => {
              void queryClient.invalidateQueries({ queryKey: ["feed"] });
            }}
          />

          {feedQuery.isLoading ? <SkeletonCardList count={3} /> : null}

          {feedQuery.isError ? (
            <ErrorState
              description={
                feedQuery.error instanceof Error
                  ? feedQuery.error.message
                  : "Could not load feed."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => feedQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {!feedQuery.isLoading && !feedQuery.isError && posts.length === 0 ? (
            <EmptyState
              title="Your feed is empty"
              description="Follow trainers and dancers, then check back for new photos."
            />
          ) : null}

          {posts.length > 0 ? (
            <div className={styles.feed}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  likePending={
                    likeMutation.isPending &&
                    likeMutation.variables?.postId === post.id
                  }
                  repostPending={
                    repostMutation.isPending &&
                    repostMutation.variables === post.id
                  }
                  onLike={() =>
                    likeMutation.mutate({ postId: post.id, liked: false })
                  }
                  onUnlike={() =>
                    likeMutation.mutate({ postId: post.id, liked: true })
                  }
                  onRepost={() => repostMutation.mutate(post.id)}
                  onShare={() => {
                    void sharePost(post.id);
                  }}
                />
              ))}

              {hasNextPage ? (
                <LoadMoreIndicator
                  ref={loadMoreRef}
                  isLoading={isFetchingNextPage}
                  testId="feed-load-more"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
