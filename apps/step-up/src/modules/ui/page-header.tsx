import { Heading } from "@dev-ui/components/heading";
import { Text } from "@dev-ui/components/text";
import type { ReactNode } from "react";
import styles from "./page-header.module.scss";

type PageHeaderProps = {
  title: string;
  titleEnd?: ReactNode;
  description?: string;
  actions?: ReactNode;
};

/** @deprecated Prefer Screen for new pages. Kept for remaining wizard screens. */
export function PageHeader({
  title,
  titleEnd,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.copy}>
        <div className={styles.titleRow}>
          <Heading level={1} className={styles.title}>
            {title}
          </Heading>
          {titleEnd ? <div className={styles.titleEnd}>{titleEnd}</div> : null}
        </div>
        {description ? (
          <Text slot="description" className={styles.description}>
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
