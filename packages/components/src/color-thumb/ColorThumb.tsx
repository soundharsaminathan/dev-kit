import { cn } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import styles from "./color-thumb.module.scss";
import { useColorThumbContext } from "./color-thumb-context";
import type { ColorThumbProps } from "./types";

function ColorThumb({ className, style, ...props }: ColorThumbProps) {
  const {
    thumbProps,
    inputProps,
    xInputProps,
    yInputProps,
    inputRef,
    inputXRef,
    inputYRef,
    isDisabled,
    thumbColor,
  } = useColorThumbContext("ColorThumb");
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div
      {...mergeProps(thumbProps, props)}
      data-slot="color-thumb"
      data-disabled={isDisabled ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.thumb, className)}
      style={{
        ...thumbProps.style,
        ...(thumbColor ? { background: thumbColor } : {}),
        ...style,
      }}
    >
      {inputProps && inputRef ? (
        <input
          {...mergeProps(inputProps, focusProps)}
          ref={inputRef}
          className={styles.visuallyHidden}
        />
      ) : null}
      {xInputProps && inputXRef ? (
        <input
          {...mergeProps(xInputProps, focusProps)}
          ref={inputXRef}
          className={styles.visuallyHidden}
        />
      ) : null}
      {yInputProps && inputYRef ? (
        <input
          {...mergeProps(yInputProps, focusProps)}
          ref={inputYRef}
          className={styles.visuallyHidden}
        />
      ) : null}
    </div>
  );
}

export type { ColorThumbProps } from "./types";
export { ColorThumb };
