import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  ReactNode,
} from "react";

export type ContextMenuProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "onContextMenu"
> & {
  children: ReactNode;
  isOpen?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((isOpen: boolean) => void) | undefined;
  isDisabled?: boolean | undefined;
  onContextMenu?: MouseEventHandler<HTMLDivElement> | undefined;
  "aria-label"?: string | undefined;
};
