import { useContext } from "react";
import { ActiveStudentContext } from "@/modules/me/active-student-context";

export function useActiveStudentContext() {
  const ctx = useContext(ActiveStudentContext);
  if (!ctx) {
    throw new Error(
      "useActiveStudentContext must be used inside ActiveStudentProvider",
    );
  }
  return ctx;
}
