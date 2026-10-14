import { cn } from "@dev-ui/core";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import styles from "./avatar.module.scss";
import type {
  AvatarBadgeProps,
  AvatarFallbackProps,
  AvatarGroupCountProps,
  AvatarGroupProps,
  AvatarImageProps,
  AvatarProps,
  AvatarSize,
} from "./avatar.types";
import {
  type ImageLoadingStatus,
  useImageLoadingStatus,
} from "./use-image-loading-status";

type AvatarContextValue = {
  status: ImageLoadingStatus;
  setStatus: (status: ImageLoadingStatus) => void;
  size: AvatarSize;
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

function useAvatarContext(component: string): AvatarContextValue {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error(`${component} must be used within Avatar`);
  }
  return context;
}

function Avatar({ size = "md", children, className, ...props }: AvatarProps) {
  const [status, setStatus] = useState<ImageLoadingStatus>("idle");

  return (
    <AvatarContext.Provider value={{ status, setStatus, size }}>
      <span
        data-avatar=""
        data-size={size}
        className={cn(styles.root, className)}
        {...props}
      >
        {children}
      </span>
    </AvatarContext.Provider>
  );
}

function AvatarImage({
  src,
  alt,
  referrerPolicy,
  crossOrigin,
  className,
  ...props
}: AvatarImageProps) {
  const status = useImageLoadingStatus(src, { referrerPolicy, crossOrigin });
  const { setStatus } = useAvatarContext("AvatarImage");

  useLayoutEffect(() => {
    setStatus(status);
  }, [status, setStatus]);

  if (status !== "loaded") {
    return null;
  }

  return (
    <img
      data-avatar-image=""
      className={cn(styles.image, className)}
      src={src}
      alt={alt}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  children,
  ...props
}: AvatarFallbackProps) {
  const { status } = useAvatarContext("AvatarFallback");

  if (status === "loaded") {
    return null;
  }

  return (
    <span
      data-avatar-fallback=""
      className={cn(styles.fallback, className)}
      {...props}
    >
      {children}
    </span>
  );
}

function AvatarBadge({ className, children, ...props }: AvatarBadgeProps) {
  return (
    <span
      data-avatar-badge=""
      className={cn(styles.badge, className)}
      {...props}
    >
      {children}
    </span>
  );
}

function AvatarGroup({
  size = "md",
  children,
  className,
  ...props
}: AvatarGroupProps) {
  return (
    <div
      data-avatar-group=""
      data-size={size}
      className={cn(styles.group, className)}
      {...props}
    >
      {children}
    </div>
  );
}

function AvatarGroupCount({
  className,
  children,
  ...props
}: AvatarGroupCountProps) {
  return (
    <span
      data-avatar-group-count=""
      className={cn(styles.groupCount, className)}
      {...props}
    >
      {children}
    </span>
  );
}

export type {
  AvatarBadgeProps,
  AvatarFallbackProps,
  AvatarGroupCountProps,
  AvatarGroupProps,
  AvatarImageProps,
  AvatarProps,
  AvatarSize,
};
export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
};
