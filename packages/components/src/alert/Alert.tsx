import { cn } from "@dev-ui/core";
import styles from "./alert.module.scss";
import type {
  AlertActionProps,
  AlertDescriptionProps,
  AlertProps,
  AlertTitleProps,
} from "./alert.types";

function Alert({
  variant = "neutral",
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      data-alert=""
      data-variant={variant}
      className={cn(styles.root, className)}
      {...props}
    >
      {children}
    </div>
  );
}

function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div
      data-alert-title=""
      className={cn(styles.title, className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      data-alert-description=""
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: AlertActionProps) {
  return (
    <div
      data-alert-action=""
      className={cn(styles.action, className)}
      {...props}
    />
  );
}

export type {
  AlertActionProps,
  AlertDescriptionProps,
  AlertProps,
  AlertTitleProps,
  AlertVariant,
} from "./alert.types";
export { Alert, AlertAction, AlertDescription, AlertTitle };
