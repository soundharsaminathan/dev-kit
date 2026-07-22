import styles from "./child-switcher.module.scss";
import { useActiveStudentContext } from "./use-active-student-context";

export function ChildSwitcher({
  tone = "default",
}: {
  tone?: "default" | "onMedia";
}) {
  const { children, studentId, setActiveChild, isParent } =
    useActiveStudentContext();

  if (!isParent || children.length <= 1) return null;

  return (
    <fieldset
      className={styles.switcher}
      data-tone={tone === "onMedia" ? "onMedia" : undefined}
    >
      {children.map((child) => (
        <button
          key={child.id}
          type="button"
          className={styles.chip}
          data-selected={child.id === studentId ? "true" : undefined}
          onClick={() => setActiveChild(child.id)}
          aria-pressed={child.id === studentId}
        >
          {child.name.split(" ")[0] || child.name}
        </button>
      ))}
    </fieldset>
  );
}
