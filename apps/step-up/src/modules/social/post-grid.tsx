import { Link } from "@tanstack/react-router";
import styles from "./post-grid.module.scss";
import type { SocialPost } from "./types";

type PostGridProps = {
  posts: SocialPost[];
};

export function PostGrid({ posts }: PostGridProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div className={styles.grid}>
      {posts.map((post) => {
        const cover = post.imageUrls[0] ?? post.repostOf?.imageUrls[0];
        return (
          <Link
            key={post.id}
            to="/posts/$id"
            params={{ id: post.id }}
            className={styles.cell}
          >
            {cover ? (
              <img src={cover} alt="" className={styles.image} />
            ) : (
              <div className={styles.placeholder} />
            )}
            {post.imageUrls.length > 1 || post.repostOfId ? (
              <span className={styles.badge}>
                {post.repostOfId ? "Repost" : `${post.imageUrls.length}`}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
