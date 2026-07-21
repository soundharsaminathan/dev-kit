import type { AriaTabListProps } from "@react-aria/tabs";
import type { TabListState } from "@react-stately/tabs";
import type { Key } from "@react-types/shared";
import type { ReactNode, Ref } from "react";

export type TabsVariant = "default" | "line";
export type TabsOrientation = "horizontal" | "vertical";

export type TabsProps<T extends object = object> = Omit<
  AriaTabListProps<T>,
  "children" | "items"
> & {
  children?: ReactNode;
  className?: string | undefined;
  orientation?: TabsOrientation | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type TabListProps = React.ComponentPropsWithoutRef<"div"> & {
  variant?: TabsVariant | undefined;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type TabProps = {
  id: Key;
  children?: ReactNode;
  className?: string | undefined;
  isDisabled?: boolean | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type TabPanelProps = {
  id: Key;
  children?: ReactNode;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type TabsContextValue<T extends object = object> = {
  state: TabListState<T>;
  orientation: TabsOrientation;
  layoutId: string;
};

export type TabListContextValue = {
  variant: TabsVariant;
};
