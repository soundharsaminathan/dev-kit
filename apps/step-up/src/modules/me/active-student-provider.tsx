import type { ReactNode } from "react";
import { useActiveStudent } from "@/lib/use-active-student";
import { ActiveStudentContext } from "@/modules/me/active-student-context";

export function ActiveStudentProvider({ children }: { children: ReactNode }) {
  const value = useActiveStudent();
  return (
    <ActiveStudentContext.Provider value={value}>
      {children}
    </ActiveStudentContext.Provider>
  );
}
