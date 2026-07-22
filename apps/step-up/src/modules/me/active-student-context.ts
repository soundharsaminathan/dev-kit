import { createContext } from "react";
import type { useActiveStudent } from "@/lib/use-active-student";

export type ActiveStudentContextValue = ReturnType<typeof useActiveStudent>;

export const ActiveStudentContext =
  createContext<ActiveStudentContextValue | null>(null);
