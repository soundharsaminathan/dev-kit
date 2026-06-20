import type { CheckboxGroupState } from "@react-stately/checkbox";
import { createContext } from "react";

export const CheckboxGroupContext = createContext<CheckboxGroupState | null>(
  null,
);
