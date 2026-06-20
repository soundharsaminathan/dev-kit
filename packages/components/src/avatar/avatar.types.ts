import type { ComponentPropsWithoutRef, ImgHTMLAttributes } from "react";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = ComponentPropsWithoutRef<"span"> & {
  size?: AvatarSize | undefined;
};

export type AvatarImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src?: string | undefined;
};

export type AvatarFallbackProps = ComponentPropsWithoutRef<"span">;

export type AvatarBadgeProps = ComponentPropsWithoutRef<"span">;

export type AvatarGroupProps = ComponentPropsWithoutRef<"div"> & {
  size?: AvatarSize | undefined;
};

export type AvatarGroupCountProps = ComponentPropsWithoutRef<"span">;
