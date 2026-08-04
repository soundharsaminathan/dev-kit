import type { AriaToastProps } from "@react-aria/toast";
import type {
  QueuedToast,
  ToastOptions,
  ToastQueue,
  ToastStateProps,
} from "@react-stately/toast";
import type { HTMLAttributes, ReactNode } from "react";

export type ToastVariant =
  | "neutral"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastContent = {
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  action?: ToastAction;
};

export type ToastProviderProps = ToastStateProps & {
  children: ReactNode;
  position?: ToastPosition;
  timeout?: number;
  queue?: ToastQueue<ToastContent>;
};

export type ToastRegionProps = {
  position?: ToastPosition;
  className?: string;
  "aria-label"?: string;
};

export type ToastProps = AriaToastProps<ToastContent> & {
  variant?: ToastVariant;
  className?: string;
  children?: ReactNode;
};

export type ToastContentProps = HTMLAttributes<HTMLDivElement>;

export type ToastTitleProps = HTMLAttributes<HTMLDivElement>;

export type ToastDescriptionProps = HTMLAttributes<HTMLDivElement>;

export type ToastCloseProps = HTMLAttributes<HTMLButtonElement>;

export type { QueuedToast, ToastOptions };
