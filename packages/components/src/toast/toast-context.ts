import type { ToastState } from "@react-stately/toast";
import { createContext, useContext } from "react";
import type { ToastContent, ToastOptions, ToastPosition } from "./toast.types";

export type ToastContextValue = {
  state: ToastState<ToastContent>;
  position: ToastPosition;
  toast: (content: ToastContent, options?: ToastOptions) => string;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(component = "Toast"): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(`${component} must be used within ToastProvider`);
  }
  return context;
}
