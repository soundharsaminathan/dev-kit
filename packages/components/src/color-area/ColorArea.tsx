import { cn, composeRefs } from "@dev-ui/core";
import { useColorArea } from "@react-aria/color";
import { useColorAreaState } from "@react-stately/color";
import { useMemo, useRef } from "react";
import {
  mergeColorPickerProps,
  useColorPickerStateContext,
} from "../color-context";
import { ColorThumb } from "../color-thumb/ColorThumb";
import { ColorThumbContext } from "../color-thumb/color-thumb-context";
import styles from "./color-area.module.scss";
import type { ColorAreaProps } from "./types";

function ColorArea({
  ref,
  children,
  className,
  isDisabled,
  ...props
}: ColorAreaProps) {
  const pickerState = useColorPickerStateContext();
  const mergedProps = mergeColorPickerProps(props, pickerState);
  const inputXRef = useRef<HTMLInputElement>(null);
  const inputYRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const state = useColorAreaState(mergedProps);
  const areaOptions = {
    ...mergedProps,
    inputXRef,
    inputYRef,
    containerRef,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  };
  const { colorAreaProps, xInputProps, yInputProps, thumbProps } = useColorArea(
    areaOptions,
    state,
  );
  const resolvedDisabled = Boolean(isDisabled);
  const thumbColor = resolvedDisabled
    ? undefined
    : state.getDisplayColor().toString("css");

  const thumbContextValue = useMemo(
    () => ({
      thumbProps,
      xInputProps,
      yInputProps,
      inputXRef,
      inputYRef,
      isDisabled: resolvedDisabled,
      ...(thumbColor !== undefined ? { thumbColor } : {}),
    }),
    [thumbProps, xInputProps, yInputProps, resolvedDisabled, thumbColor],
  );

  return (
    <ColorThumbContext.Provider value={thumbContextValue}>
      <div
        {...colorAreaProps}
        ref={composeRefs(containerRef, ref)}
        data-color-area=""
        data-disabled={resolvedDisabled ? "true" : undefined}
        className={cn(styles.root, className)}
        style={{
          ...colorAreaProps.style,
          ...(resolvedDisabled
            ? { background: "var(--color-disabled)" }
            : undefined),
        }}
      >
        {children ?? <ColorThumb />}
      </div>
    </ColorThumbContext.Provider>
  );
}

export type { ColorAreaProps } from "./types";
export { ColorArea };
