import type { ComponentPropsWithoutRef } from "react";

export type EmptyMediaVariant = "default" | "icon";

export type EmptyProps = ComponentPropsWithoutRef<"div">;
export type EmptyHeaderProps = ComponentPropsWithoutRef<"div">;
export type EmptyTitleProps = ComponentPropsWithoutRef<"div">;
export type EmptyDescriptionProps = ComponentPropsWithoutRef<"div">;
export type EmptyContentProps = ComponentPropsWithoutRef<"div">;

export type EmptyMediaProps = ComponentPropsWithoutRef<"div"> & {
  variant?: EmptyMediaVariant | undefined;
};
