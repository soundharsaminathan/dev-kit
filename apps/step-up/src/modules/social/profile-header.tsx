import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { StyleList } from "@/modules/styles/style-list";
import { FollowButton } from "./follow-button";
import styles from "./profile-header.module.scss";
import type { SocialProfile } from "./types";

type ProfileHeaderProps = {
  profile: SocialProfile;
  followPending?: boolean | undefined;
  messagePending?: boolean | undefined;
  onFollow?: (() => void) | undefined;
  onUnfollow?: (() => void) | undefined;
  onEdit?: (() => void) | undefined;
  onMessage?: (() => void) | undefined;
  onResetPassword?: (() => void) | undefined;
};

function formatCount(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toFixed(millions >= 10 || Number.isInteger(millions) ? 0 : 1)}M`;
  }
  if (value >= 10_000) {
    const thousands = value / 1_000;
    return `${thousands.toFixed(Number.isInteger(thousands) ? 0 : 1)}K`;
  }
  return value.toLocaleString();
}

function formatInstagramLabel(url: string) {
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path && path !== "/") {
      return path.replace(/^\//, "");
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function ProfileHeader({
  profile,
  followPending,
  messagePending,
  onFollow,
  onUnfollow,
  onEdit,
  onMessage,
  onResetPassword,
}: ProfileHeaderProps) {
  const instagramHref = profile.instagramUrl
    ? normalizeExternalUrl(profile.instagramUrl)
    : null;
  const isPrivateLocked =
    profile.profileVisibility === "PRIVATE" && !profile.canViewContent;

  return (
    <header className={styles.root}>
      <div className={styles.avatarWrap}>
        <Avatar size="lg">
          {profile.photoUrl ? (
            <AvatarImage src={profile.photoUrl} alt={profile.name} />
          ) : null}
          <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </div>

      <div className={styles.aside}>
        <div className={styles.titleRow}>
          <p className={styles.username}>{profile.name}</p>
          {isPrivateLocked ? (
            <Icon name="lock" className={styles.lock} aria-hidden />
          ) : null}
        </div>

        <div className={styles.actions}>
          {profile.isOwnProfile ? (
            onEdit ? (
              <Button
                variant="default"
                className={styles.actionPrimary}
                onClick={onEdit}
              >
                Edit profile
              </Button>
            ) : null
          ) : (
            <>
              <FollowButton
                isFollowing={profile.isFollowing}
                followRequestStatus={profile.followRequestStatus}
                profileVisibility={profile.profileVisibility}
                isPending={followPending}
                onFollow={onFollow}
                onUnfollow={onUnfollow}
                size="md"
                className={styles.actionPrimary}
              />
              {onMessage ? (
                <Button
                  variant="default"
                  className={styles.actionSecondary}
                  isDisabled={messagePending}
                  aria-busy={messagePending || undefined}
                  onClick={onMessage}
                >
                  Message
                </Button>
              ) : null}
              {onResetPassword ? (
                <Button
                  variant="quiet"
                  className={styles.actionSecondary}
                  data-testid="reset-trainer-password"
                  onClick={onResetPassword}
                >
                  Reset password
                </Button>
              ) : null}
            </>
          )}
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dd className={styles.statValue}>
              {formatCount(profile.postCount)}
            </dd>
            <dt className={styles.statLabel}>posts</dt>
          </div>
          <div className={styles.stat}>
            <dd className={styles.statValue}>
              {formatCount(profile.followerCount)}
            </dd>
            <dt className={styles.statLabel}>followers</dt>
          </div>
          <div className={styles.stat}>
            <dd className={styles.statValue}>
              {formatCount(profile.followingCount)}
            </dd>
            <dt className={styles.statLabel}>following</dt>
          </div>
        </dl>

        <div className={styles.bioBlock}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{profile.name}</h1>
            {isPrivateLocked ? (
              <Icon name="lock" className={styles.lockMobile} aria-hidden />
            ) : null}
          </div>

          {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}

          {instagramHref ? (
            <a
              className={styles.link}
              href={instagramHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="link" className={styles.linkIcon} aria-hidden />
              <span>{formatInstagramLabel(profile.instagramUrl!)}</span>
            </a>
          ) : null}

          {profile.styles.length > 0 ? (
            <StyleList
              styles={profile.styles}
              size="sm"
              showLabels
              className={styles.styles}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
