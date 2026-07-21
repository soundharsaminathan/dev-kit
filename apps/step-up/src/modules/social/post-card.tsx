import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Button } from "@dev-ui/components/button";
import { Text } from "@dev-ui/components/text";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import styles from "./post-card.module.scss";
import type { SocialPost } from "./types";

type PostCardProps = {
  post: SocialPost;
  likePending?: boolean;
  repostPending?: boolean;
  onLike?: () => void;
  onUnlike?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
};

export function PostCard({
  post,
  likePending,
  repostPending,
  onLike,
  onUnlike,
  onRepost,
  onShare,
}: PostCardProps) {
  const images =
    post.imageUrls.length > 0
      ? post.imageUrls
      : (post.repostOf?.imageUrls ?? []);

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <Link
          to="/users/$id"
          params={{ id: post.author.id }}
          className={styles.author}
        >
          <Avatar size="sm">
            {post.author.photoUrl ? (
              <AvatarImage src={post.author.photoUrl} alt={post.author.name} />
            ) : null}
            <AvatarFallback>{post.author.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span>{post.author.name}</span>
        </Link>
        {post.repostOfId ? (
          <Text slot="description" className={styles.repostLabel}>
            Reposted
          </Text>
        ) : null}
      </div>

      <Link to="/posts/$id" params={{ id: post.id }} className={styles.media}>
        {images[0] ? (
          <img src={images[0]} alt="" className={styles.image} />
        ) : null}
        {images.length > 1 ? (
          <span className={styles.count}>{images.length} photos</span>
        ) : null}
      </Link>

      {post.caption ? (
        <Text className={styles.caption}>{post.caption}</Text>
      ) : null}

      <div className={styles.actions}>
        <Button
          variant="quiet"
          size="sm"
          isDisabled={likePending}
          onClick={post.likedByMe ? onUnlike : onLike}
          aria-label={post.likedByMe ? "Unlike" : "Like"}
        >
          <Icon name="heart" data-liked={post.likedByMe ? "true" : undefined} />
          <span>{post._count.likes}</span>
        </Button>
        <Button
          as={Link}
          to={`/posts/${post.id}`}
          variant="quiet"
          size="sm"
          aria-label="Comments"
        >
          <Icon name="message-square" />
          <span>{post._count.comments}</span>
        </Button>
        <Button
          variant="quiet"
          size="sm"
          isDisabled={repostPending}
          onClick={onRepost}
          aria-label="Repost"
        >
          <Icon name="refresh" />
          <span>{post._count.reposts}</span>
        </Button>
        <Button
          variant="quiet"
          size="sm"
          onClick={onShare}
          aria-label="Share"
          isIconOnly
        >
          <Icon name="share" />
        </Button>
      </div>
    </article>
  );
}
