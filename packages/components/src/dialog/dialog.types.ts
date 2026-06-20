import type { AriaDialogProps } from "@react-aria/dialog";
import type { OverlayTriggerProps } from "@react-stately/overlays";
import type { ReactNode } from "react";

export type DialogProps = OverlayTriggerProps & {
  children?: ReactNode;
  className?: string | undefined;
};

export type DialogContentProps = AriaDialogProps & {
  children?: ReactNode;
  className?: string | undefined;
  showCloseButton?: boolean | undefined;
};

export type DialogHeaderProps = React.ComponentPropsWithoutRef<"header">;

export type DialogTitleProps = React.ComponentPropsWithoutRef<"h2">;

export type DialogDescriptionProps = React.ComponentPropsWithoutRef<"p">;

export type DialogBodyProps = React.ComponentPropsWithoutRef<"div"> & {
  scrollFade?: boolean | undefined;
};

export type DialogFooterProps = React.ComponentPropsWithoutRef<"footer">;

export type DialogInsetProps = React.ComponentPropsWithoutRef<"div">;
