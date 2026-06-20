import type { AriaOverlayProps } from "@react-aria/overlays";
import type { ReactNode } from "react";

export type ModalProps = AriaOverlayProps & {
  children?: ReactNode;
  className?: string | undefined;
};
