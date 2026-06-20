import type { DropOptions } from "@react-aria/dnd";
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from "react";

export type DropZoneProps = Omit<DropOptions, "ref"> &
  ComponentPropsWithRef<"div"> & {
    isDisabled?: boolean | undefined;
  };

export type DropZoneLabelProps = ComponentPropsWithoutRef<"span">;
