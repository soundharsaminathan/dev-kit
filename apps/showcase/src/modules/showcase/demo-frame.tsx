import styles from "./demo-frame.module.scss";

export function DemoFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.frame} data-testid="demo-frame">
      {children}
    </div>
  );
}
