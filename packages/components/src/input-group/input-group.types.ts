import type { HTMLAttributes, Ref } from "react";
import type { GroupProps } from "../group/group.types";
import type { InputSize } from "../input/input.types";

export type InputGroupProps = GroupProps & {
  size?: InputSize | undefined;
};

export type InputGroupAddonProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>;
};
