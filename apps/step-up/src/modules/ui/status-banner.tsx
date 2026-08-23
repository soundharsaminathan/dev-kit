import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";
import styles from "./status-banner.module.scss";

export type StatusBannerTone =
  | "neutral"
  | "warning"
  | "success"
  | "danger"
  | "offline"
  | "online"
  | "update";

export type StatusBannerProps = {
  title: string;
  meta?: string;
  tone?: StatusBannerTone;
  action?: ReactNode;
  progress?: number | null;
  role?: "status" | "alert";
};

export const statusBannerActionClassName = styles.action;

const TONE_CLASS: Record<StatusBannerTone, string | undefined> = {
  neutral: undefined,
  warning: styles.warning,
  success: styles.success,
  danger: styles.danger,
  offline: styles.offline,
  online: styles.online,
  update: styles.update,
};

export function StatusBannerStack({
  children,
  zIndex,
}: {
  children: ReactNode;
  zIndex?: number;
}) {
  const style =
    zIndex !== undefined
      ? ({ ["--status-banner-z" as string]: zIndex } as CSSProperties)
      : undefined;

  return (
    <div className={styles.stack} style={style}>
      {children}
    </div>
  );
}

export function StatusBanner({
  title,
  meta,
  tone = "neutral",
  action,
  progress = null,
  role = "status",
}: StatusBannerProps) {
  const toneClass = TONE_CLASS[tone];
  const showProgress = typeof progress === "number";

  return (
    <div role={role}>
      <div className={[styles.banner, toneClass].filter(Boolean).join(" ")}>
        {meta ? (
          <div className={styles.copy}>
            <p className={styles.title}>{title}</p>
            <p className={styles.meta}>{meta}</p>
          </div>
        ) : (
          <p className={styles.message}>{title}</p>
        )}
        {action}
      </div>
      {showProgress ? (
        <div className={styles.progress} aria-hidden>
          <span
            className={styles.progressFill}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function StatusBannerActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export function StatusBannerAction({
  children,
  primary = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={[styles.action, primary ? styles.actionPrimary : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
