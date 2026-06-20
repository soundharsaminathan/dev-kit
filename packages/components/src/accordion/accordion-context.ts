import type { DisclosureGroupState } from "@react-stately/disclosure";
import { createContext } from "react";

export const AccordionContext = createContext<DisclosureGroupState | null>(
  null,
);
