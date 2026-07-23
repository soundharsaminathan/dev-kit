import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@dev-ui/components/empty";
import { Icon, type IconName } from "@dev-ui/icons";
import type { ReactNode } from "react";
import styles from "./states.module.scss";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className={styles.state}>
      <Empty>
        {icon ? (
          <EmptyMedia variant="icon">
            <Icon name={icon} />
          </EmptyMedia>
        ) : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </Empty>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.state}>
      <Alert variant="danger">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

export function SuccessState({
  title,
  description,
  action,
  className,
  titleClassName,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
  titleClassName?: string | undefined;
}) {
  return (
    <div className={[styles.success, className].filter(Boolean).join(" ")}>
      <div className={styles.check} aria-hidden>
        <svg viewBox="0 0 52 52" className={styles.checkSvg}>
          <title>Success</title>
          <circle
            className={styles.checkCircle}
            cx="26"
            cy="26"
            r="24"
            fill="none"
          />
          <path
            className={styles.checkMark}
            fill="none"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
          />
        </svg>
      </div>
      <h2
        className={[styles.successTitle, titleClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {title}
      </h2>
      {description ? <p className={styles.successDesc}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
