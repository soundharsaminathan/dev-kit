import type { ComponentPropsWithoutRef } from "react";

export type CardSize = "sm" | "default";

export type CardProps = ComponentPropsWithoutRef<"div"> & {
  size?: CardSize | undefined;
};

export type CardHeaderProps = ComponentPropsWithoutRef<"div">;
export type CardTitleProps = ComponentPropsWithoutRef<"div">;
export type CardDescriptionProps = ComponentPropsWithoutRef<"div">;
export type CardActionProps = ComponentPropsWithoutRef<"div">;
export type CardContentProps = ComponentPropsWithoutRef<"div">;
export type CardFooterProps = ComponentPropsWithoutRef<"div">;
