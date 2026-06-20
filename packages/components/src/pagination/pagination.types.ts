import type { ComponentProps } from "react";
import type { ButtonProps } from "../button/button.types";

export type PaginationProps = ComponentProps<"nav">;

export type PaginationListProps = ComponentProps<"ul">;

export type PaginationItemProps = ComponentProps<"li">;

export type PaginationLinkProps = ButtonProps & {
  isActive?: boolean | undefined;
};

export type PaginationEllipsisProps = ComponentProps<"span">;
