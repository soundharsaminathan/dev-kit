import { cn, composeRefs } from "@dev-ui/core";
import { useDrop } from "@react-aria/dnd";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import { useRef } from "react";
import styles from "./drop-zone.module.scss";
import type { DropZoneLabelProps, DropZoneProps } from "./drop-zone.types";

function DropZone({
  ref,
  className,
  isDisabled,
  onDrop,
  getDropOperation,
  ...props
}: DropZoneProps) {
  const dropRef = useRef<HTMLDivElement>(null);
  const { dropProps, isDropTarget } = useDrop({
    ref: dropRef,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(onDrop !== undefined ? { onDrop } : {}),
    ...(getDropOperation !== undefined ? { getDropOperation } : {}),
  });
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div
      {...mergeProps(props, dropProps, focusProps)}
      ref={composeRefs(dropRef, ref)}
      data-drop-zone=""
      data-drop-target={isDropTarget ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(styles.dropzone, className)}
    />
  );
}

function DropZoneLabel({ className, ...props }: DropZoneLabelProps) {
  return (
    <span
      {...props}
      data-slot="label"
      className={cn(styles.label, className)}
    />
  );
}

export type { DropZoneLabelProps, DropZoneProps } from "./drop-zone.types";
export { DropZone, DropZoneLabel };
