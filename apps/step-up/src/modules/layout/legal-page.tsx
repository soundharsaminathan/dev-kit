import type { ReactNode } from "react";
import { PublicShell } from "@/modules/layout/public-shell";
import { LEGAL } from "@/modules/marketing/content";
import styles from "./legal.module.scss";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <PublicShell nav="minimal">
      <article className={styles.page}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>{LEGAL.updated}</p>
        <div className={styles.body}>{children}</div>
      </article>
    </PublicShell>
  );
}
