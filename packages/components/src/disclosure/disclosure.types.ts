import type { AriaDisclosureProps } from "@react-aria/disclosure";
import type { DisclosureState } from "@react-stately/disclosure";
import type { Key } from "@react-types/shared";
import type { ReactNode, Ref } from "react";

export type DisclosureProps = AriaDisclosureProps & {
  children?: ReactNode;
  className?: string | undefined;
  id?: Key | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type DisclosureTriggerProps =
  React.ComponentPropsWithoutRef<"button"> & {
    className?: string | undefined;
    ref?: Ref<HTMLButtonElement>;
  };

export type DisclosurePanelMountWhen = "always" | "expanded" | "expanded-once";

export type DisclosurePanelProps = React.ComponentPropsWithoutRef<"div"> & {
  className?: string | undefined;
  /** When to mount panel children. Defaults to always (hidden-but-mounted). */
  mountWhen?: DisclosurePanelMountWhen | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type DisclosureContextValue = {
  state: DisclosureState;
  triggerProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
  panelProps: React.HTMLAttributes<HTMLDivElement>;
  panelRef: React.RefObject<HTMLDivElement | null>;
};
