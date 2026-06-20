import { cn } from "@dev-ui/core";
import styles from "./card.module.scss";
import type {
  CardActionProps,
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
} from "./card.types";

function Card({ size = "default", className, ...props }: CardProps) {
  return (
    <div
      data-card=""
      data-size={size}
      className={cn(styles.root, className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      data-card-header=""
      className={cn(styles.header, className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <div
      data-card-title=""
      className={cn(styles.title, className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <div
      data-card-description=""
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: CardActionProps) {
  return (
    <div
      data-card-action=""
      className={cn(styles.action, className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      data-card-content=""
      className={cn(styles.content, className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      data-card-footer=""
      className={cn(styles.footer, className)}
      {...props}
    />
  );
}

export type {
  CardActionProps,
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardSize,
  CardTitleProps,
} from "./card.types";
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
