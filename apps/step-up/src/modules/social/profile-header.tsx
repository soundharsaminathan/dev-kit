import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Heading } from "@dev-ui/components/heading";
import { Text } from "@dev-ui/components/text";
import { Icon } from "@dev-ui/icons";
import { StyleList } from "@/modules/styles/style-list";
import { FollowButton } from "./follow-button";
import styles from "./profile-header.module.scss";
import type { SocialProfile } from "./types";

type ProfileHeaderProps = {
  profile: SocialProfile;
  followPending?: boolean | undefined;
  onFollow?: (() => void) | undefined;
  onUnfollow?: (() => void) | undefined;
  onEdit?: (() => void) | undefined;
};

export function ProfileHeader({
  profile,
  followPending,
  onFollow,
  onUnfollow,
  onEdit,
}: ProfileHeaderProps) {
  return (
    <header
      className={
        profile.coverUrl ? `${styles.root} ${styles.hasCover}` : styles.root
      }
    >
      {profile.coverUrl ? (
        <div className={styles.cover}>
          <img src={profile.coverUrl} alt="" aria-hidden />
        </div>
      ) : null}

      <Avatar
        size="lg"
        className={
          profile.role === "TRAINER"
            ? `${styles.avatar} ${styles.avatarSquare}`
            : styles.avatar
        }
      >
        {profile.photoUrl ? (
          <AvatarImage src={profile.photoUrl} alt={profile.name} />
        ) : null}
        <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
      </Avatar>

      <div className={styles.meta}>
        <div className={styles.titleRow}>
          <Heading level={1}>{profile.name}</Heading>
          {profile.profileVisibility === "PRIVATE" &&
          !profile.canViewContent ? (
            <Icon name="lock" className={styles.lock} aria-hidden />
          ) : null}
        </div>
        <Badge>{profile.role}</Badge>

        <div className={styles.counts}>
          <span>
            <strong>{profile.postCount}</strong> posts
          </span>
          <span>
            <strong>{profile.followerCount}</strong> followers
          </span>
          <span>
            <strong>{profile.followingCount}</strong> following
          </span>
        </div>

        {profile.bio ? <Text className={styles.bio}>{profile.bio}</Text> : null}

        {profile.styles.length > 0 ? (
          <StyleList
            styles={profile.styles}
            size="sm"
            showLabels
            className={styles.styles}
          />
        ) : null}

        <div className={styles.actions}>
          {profile.isOwnProfile ? (
            onEdit ? (
              <Button variant="default" onClick={onEdit}>
                Edit profile
              </Button>
            ) : null
          ) : (
            <FollowButton
              isFollowing={profile.isFollowing}
              followRequestStatus={profile.followRequestStatus}
              profileVisibility={profile.profileVisibility}
              isPending={followPending}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
              size="md"
            />
          )}
        </div>
      </div>
    </header>
  );
}
