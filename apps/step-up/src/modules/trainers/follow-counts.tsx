import styles from "./trainers.module.scss";

type FollowCountsProps = {
  followerCount: number;
  followingCount: number;
  compact?: boolean;
};

export function FollowCounts({
  followerCount,
  followingCount,
  compact = false,
}: FollowCountsProps) {
  return (
    <div className={compact ? styles.followCountsCompact : styles.followCounts}>
      <span>
        <strong>{followerCount}</strong> followers
      </span>
      <span>
        <strong>{followingCount}</strong> following
      </span>
    </div>
  );
}
