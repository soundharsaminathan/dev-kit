import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type TextSlot = "label" | "description" | "errorMessage";

export type TextProps = Omit<ComponentPropsWithoutRef<"span">, "slot"> & {
  /** Slotted role within a parent field or group. */
  slot?: TextSlot;
  children?: ReactNode;
};
