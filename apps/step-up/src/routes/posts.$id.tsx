import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Button } from "@dev-ui/components/button";
import { Field, Label } from "@dev-ui/components/field";
import { Text } from "@dev-ui/components/text";
import { TextArea } from "@dev-ui/components/text-area";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { PublicShell } from "@/modules/layout/public-shell";
import type { SocialComment, SocialPost } from "@/modules/social/types";
import { sharePost } from "@/modules/social/upload";
import { ApiState } from "@/modules/ui/api-state";
import styles from "./posts.$id.module.scss";

export const Route = createFileRoute("/posts/$id")({
  component: PostDetailPage,
});

function PostDetailPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const postQuery = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.get<SocialPost>(`/posts/${id}`),
    enabled: Boolean(user),
  });

  const commentsQuery = useQuery({
    queryKey: ["post-comments", id],
    queryFn: () => api.get<SocialComment[]>(`/posts/${id}/comments`),
    enabled: Boolean(user),
  });

  const likeMutation = useMutation({
    mutationFn: (liked: boolean) =>
      liked
        ? api.delete<SocialPost>(`/posts/${id}/like`)
        : api.post<SocialPost>(`/posts/${id}/like`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", id] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const repostMutation = useMutation({
    mutationFn: () => api.post<SocialPost>(`/posts/${id}/repost`),
    onSuccess: async (post) => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["post", id] });
      return post;
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) =>
      api.post<SocialComment>(`/posts/${id}/comments`, { body }),
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["post-comments", id] });
      await queryClient.invalidateQueries({ queryKey: ["post", id] });
    },
  });

  if (!user) {
    return (
      <PublicShell>
        <section className="page-narrow stack">
          <Text>Sign in to view this post.</Text>
          <Button as={Link} to="/login" variant="primary">
            Sign in
          </Button>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="page-narrow stack">
        <ApiState
          isLoading={postQuery.isLoading}
          isError={postQuery.isError}
          error={postQuery.error}
          data={postQuery.data}
          emptyTitle="Post not found"
          emptyDescription="This post is unavailable."
        >
          {(post) => {
            const images =
              post.imageUrls.length > 0
                ? post.imageUrls
                : (post.repostOf?.imageUrls ?? []);

            return (
              <>
                <div className={styles.header}>
                  <Link
                    to="/users/$id"
                    params={{ id: post.author.id }}
                    className={styles.author}
                  >
                    <Avatar size="sm">
                      {post.author.photoUrl ? (
                        <AvatarImage
                          src={post.author.photoUrl}
                          alt={post.author.name}
                        />
                      ) : null}
                      <AvatarFallback>
                        {post.author.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{post.author.name}</span>
                  </Link>
                  {post.repostOfId ? (
                    <Text slot="description">Repost</Text>
                  ) : null}
                </div>

                <div className={styles.gallery}>
                  {images.map((src) => (
                    <img key={src} src={src} alt="" className={styles.image} />
                  ))}
                </div>

                {post.caption ? <Text>{post.caption}</Text> : null}

                <div className={styles.actions}>
                  <Button
                    variant="quiet"
                    size="sm"
                    isPending={likeMutation.isPending}
                    onClick={() => likeMutation.mutate(post.likedByMe)}
                  >
                    <Icon name="heart" />
                    {post._count.likes}
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    isPending={repostMutation.isPending}
                    onClick={() => repostMutation.mutate()}
                  >
                    <Icon name="refresh" />
                    {post._count.reposts}
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    isIconOnly
                    aria-label="Share"
                    onClick={() => {
                      void sharePost(post.id);
                    }}
                  >
                    <Icon name="share" />
                  </Button>
                </div>

                <div className="stack">
                  <Text>
                    <strong>{post._count.comments}</strong> comments
                  </Text>
                  <ApiState
                    isLoading={commentsQuery.isLoading}
                    isError={commentsQuery.isError}
                    error={commentsQuery.error}
                    data={commentsQuery.data}
                    emptyTitle="No comments"
                    emptyDescription="Be the first to comment."
                    allowEmpty
                    variant="compact"
                  >
                    {(comments) => (
                      <div className={styles.comments}>
                        {comments.map((item) => (
                          <div key={item.id} className={styles.comment}>
                            <Avatar size="sm">
                              {item.author.photoUrl ? (
                                <AvatarImage
                                  src={item.author.photoUrl}
                                  alt={item.author.name}
                                />
                              ) : null}
                              <AvatarFallback>
                                {item.author.name.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Text>
                                <strong>{item.author.name}</strong> {item.body}
                              </Text>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ApiState>

                  <Field>
                    <Label>Add a comment</Label>
                    <TextArea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={2}
                    />
                  </Field>
                  <Button
                    variant="primary"
                    isDisabled={!comment.trim()}
                    isPending={commentMutation.isPending}
                    onClick={() => commentMutation.mutate(comment.trim())}
                  >
                    Comment
                  </Button>
                </div>
              </>
            );
          }}
        </ApiState>
      </section>
    </PublicShell>
  );
}
