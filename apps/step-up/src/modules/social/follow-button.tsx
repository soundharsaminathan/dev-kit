import { Button } from "@dev-ui/components/button";

type FollowButtonProps = {
  isFollowing: boolean;
  followRequestStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null | undefined;
  profileVisibility?: "PUBLIC" | "PRIVATE" | undefined;
  isPending?: boolean | undefined;
  onFollow?: (() => void) | undefined;
  onUnfollow?: (() => void) | undefined;
  size?: "sm" | "md" | "lg";
  className?: string | undefined;
};

function followButtonLabel(input: {
  isFollowing: boolean;
  followRequestStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null | undefined;
  profileVisibility?: "PUBLIC" | "PRIVATE" | undefined;
}) {
  if (input.isFollowing) return "Following";
  if (input.followRequestStatus === "PENDING") return "Requested";
  if (input.profileVisibility === "PRIVATE") return "Request";
  return "Follow";
}

export function FollowButton({
  isFollowing,
  followRequestStatus,
  profileVisibility,
  isPending: _isPending,
  onFollow,
  onUnfollow,
  size = "sm",
  className,
}: FollowButtonProps) {
  const isRequested = followRequestStatus === "PENDING";
  const label = followButtonLabel({
    isFollowing,
    followRequestStatus,
    profileVisibility,
  });

  if (isFollowing || isRequested) {
    return (
      <Button
        size={size}
        variant="default"
        className={className}
        aria-pressed={true}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onUnfollow?.();
        }}
      >
        {label}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant="primary"
      className={className}
      aria-pressed={false}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onFollow?.();
      }}
    >
      {label}
    </Button>
  );
}
