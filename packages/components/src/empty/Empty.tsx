import { cn } from "@dev-ui/core";
import styles from "./empty.module.scss";
import type {
  EmptyContentProps,
  EmptyDescriptionProps,
  EmptyHeaderProps,
  EmptyMediaProps,
  EmptyProps,
  EmptyTitleProps,
} from "./empty.types";

function Empty({ className, ...props }: EmptyProps) {
  return (
    <div data-slot="empty" className={cn(styles.root, className)} {...props} />
  );
}

function EmptyHeader({ className, ...props }: EmptyHeaderProps) {
  return (
    <div
      data-slot="empty-header"
      className={cn(styles.header, className)}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: EmptyTitleProps) {
  return (
    <div
      data-slot="empty-title"
      className={cn(styles.title, className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: EmptyDescriptionProps) {
  return (
    <div
      data-slot="empty-description"
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: EmptyContentProps) {
  return (
    <div
      data-slot="empty-content"
      className={cn(styles.content, className)}
      {...props}
    />
  );
}

function EmptyMedia({
  variant = "default",
  className,
  ...props
}: EmptyMediaProps) {
  return (
    <div
      data-slot="empty-media"
      data-variant={variant}
      className={cn(styles.media, className)}
      {...props}
    />
  );
}

export type {
  EmptyContentProps,
  EmptyDescriptionProps,
  EmptyHeaderProps,
  EmptyMediaProps,
  EmptyMediaVariant,
  EmptyProps,
  EmptyTitleProps,
} from "./empty.types";
export {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
};
