import { cn } from "@dev-ui/core";
import { Button } from "../button/Button";
import styles from "./pagination.module.scss";
import type {
  PaginationEllipsisProps,
  PaginationItemProps,
  PaginationLinkProps,
  PaginationListProps,
  PaginationProps,
} from "./pagination.types";

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function Pagination({ className, ...props }: PaginationProps) {
  return (
    <nav
      aria-label="pagination"
      data-pagination=""
      className={cn(styles.root, className)}
      {...props}
    />
  );
}

function PaginationList({ className, ...props }: PaginationListProps) {
  return <ul className={cn(styles.list, className)} {...props} />;
}

function PaginationItem({ className, ...props }: PaginationItemProps) {
  return <li className={cn(styles.item, className)} {...props} />;
}

function PaginationLink({
  className,
  isActive,
  variant = "link",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      variant={variant}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? "true" : undefined}
      className={cn(styles.link, className)}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn(styles.previous, className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className={styles.label}>Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn(styles.next, className)}
      {...props}
    >
      <span className={styles.label}>Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: PaginationEllipsisProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(styles.ellipsis, className)}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className={styles.visuallyHidden}>More pages</span>
    </span>
  );
}

const CompoundPagination = Object.assign(Pagination, {
  List: PaginationList,
  Item: PaginationItem,
  Link: PaginationLink,
  Previous: PaginationPrevious,
  Next: PaginationNext,
  Ellipsis: PaginationEllipsis,
});

export type {
  PaginationEllipsisProps,
  PaginationItemProps,
  PaginationLinkProps,
  PaginationListProps,
  PaginationProps,
} from "./pagination.types";
export {
  CompoundPagination as Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
};
