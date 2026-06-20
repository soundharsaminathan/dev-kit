import type { DisclosureGroupProps } from "@react-stately/disclosure";
import type { ReactNode, Ref } from "react";

export type AccordionProps = DisclosureGroupProps & {
  children?: ReactNode;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
};
