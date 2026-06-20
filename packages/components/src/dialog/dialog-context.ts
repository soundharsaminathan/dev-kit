import type { OverlayTriggerState } from "@react-stately/overlays";
import type { HTMLAttributes, RefObject } from "react";
import { createContext, useContext } from "react";

export type DialogContextValue = {
  overlayState: OverlayTriggerState;
  triggerRef: RefObject<Element | null>;
  overlayTriggerProps: HTMLAttributes<HTMLElement>;
  panelRef: RefObject<HTMLDivElement | null>;
  titlePropsRef: RefObject<HTMLAttributes<HTMLElement>>;
  descriptionId: string | undefined;
  setDescriptionId: (id: string | undefined) => void;
};

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(component: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within Dialog`);
  }
  return context;
}
