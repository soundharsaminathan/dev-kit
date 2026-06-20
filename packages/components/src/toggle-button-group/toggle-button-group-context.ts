import { createContext } from "react";
import type { ToggleButtonGroupContextValue } from "./toggle-button-group.types";

export const ToggleButtonGroupContext =
  createContext<ToggleButtonGroupContextValue | null>(null);
