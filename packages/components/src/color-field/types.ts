import type {
  AriaColorChannelFieldProps,
  AriaColorFieldProps,
} from "@react-aria/color";
import type { ColorChannel } from "@react-stately/color";
import type { ReactNode, Ref } from "react";

type ColorFieldBaseProps = {
  className?: string | undefined;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  isDisabled?: boolean | undefined;
  isInvalid?: boolean | undefined;
  isReadOnly?: boolean | undefined;
};

export type ColorFieldProps =
  | (AriaColorFieldProps & ColorFieldBaseProps)
  | (AriaColorChannelFieldProps &
      ColorFieldBaseProps & {
        channel: ColorChannel;
      });

export function isChannelColorFieldProps(
  props: ColorFieldProps,
): props is AriaColorChannelFieldProps &
  ColorFieldBaseProps & {
    channel: ColorChannel;
  } {
  return "channel" in props && props.channel !== undefined;
}
