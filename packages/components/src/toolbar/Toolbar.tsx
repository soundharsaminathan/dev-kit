import { cn, composeRefs } from "@dev-ui/core";
import { useToolbar } from "@react-aria/toolbar";
import { useRef } from "react";
import styles from "./toolbar.module.scss";
import type { ToolbarProps } from "./toolbar.types";

function Toolbar({
  ref,
  className,
  orientation = "horizontal",
  children,
  ...props
}: ToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { toolbarProps } = useToolbar(props, toolbarRef);

  return (
    <div
      {...toolbarProps}
      ref={composeRefs(toolbarRef, ref)}
      data-toolbar=""
      data-orientation={orientation}
      className={cn(styles.root, className)}
    >
      {children}
    </div>
  );
}

export type { ToolbarProps } from "./toolbar.types";
export { Toolbar };
