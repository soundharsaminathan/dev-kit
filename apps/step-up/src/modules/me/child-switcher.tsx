import { createContext, type ReactNode, useContext } from "react";
import { useActiveStudent } from "@/lib/use-active-student";
import styles from "./child-switcher.module.scss";

type ActiveStudentContextValue = ReturnType<typeof useActiveStudent>;

const ActiveStudentContext = createContext<ActiveStudentContextValue | null>(
  null,
);

export function ActiveStudentProvider({ children }: { children: ReactNode }) {
  const value = useActiveStudent();
  return (
    <ActiveStudentContext.Provider value={value}>
      {children}
    </ActiveStudentContext.Provider>
  );
}

export function useActiveStudentContext(): ActiveStudentContextValue {
  const ctx = useContext(ActiveStudentContext);
  if (!ctx)
    throw new Error(
      "useActiveStudentContext must be used inside ActiveStudentProvider",
    );
  return ctx;
}

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
