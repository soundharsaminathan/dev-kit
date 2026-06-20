import { composeRefs } from "@dev-ui/core";
import { useColorChannelField, useColorField } from "@react-aria/color";
import { useLocale } from "@react-aria/i18n";
import { mergeProps } from "@react-aria/utils";
import type { ColorFieldProps as StatelyColorFieldProps } from "@react-stately/color";
import {
  useColorChannelFieldState,
  useColorFieldState,
} from "@react-stately/color";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useMemo,
  useRef,
} from "react";
import {
  mergeColorPickerProps,
  useColorPickerStateContext,
} from "../color-context";
import { Field } from "../field/Field";
import { useFieldContext, useFieldInputAria } from "../field/field-context";
import { Input } from "../input/Input";
import type { InputProps } from "../input/input.types";
import styles from "./color-field.module.scss";
import { ColorFieldContext } from "./color-field-context";
import { type ColorFieldProps, isChannelColorFieldProps } from "./types";

function renderColorFieldChildren(
  children: ReactNode,
  inputProps: React.InputHTMLAttributes<HTMLInputElement>,
  inputRef: React.RefObject<HTMLInputElement | null>,
  isDisabled: boolean,
) {
  if (children) {
    return Children.map(children, (child) => {
      if (!isValidElement(child)) {
        return child;
      }

      const childProps = (child as ReactElement<InputProps>).props;
      const mergedInputProps = {
        value: inputProps.value,
        onChange: inputProps.onChange,
        onBlur: inputProps.onBlur,
        onFocus: inputProps.onFocus,
        onKeyDown: inputProps.onKeyDown,
        name: inputProps.name,
        id: inputProps.id,
        type: inputProps.type,
        inputMode: inputProps.inputMode,
        autoComplete: inputProps.autoComplete,
        "aria-label": inputProps["aria-label"],
        "aria-labelledby": inputProps["aria-labelledby"],
        "aria-describedby": inputProps["aria-describedby"],
        "aria-invalid": inputProps["aria-invalid"],
        readOnly: inputProps.readOnly,
        disabled: inputProps.disabled,
      } satisfies Partial<InputProps>;

      return cloneElement(child as ReactElement<InputProps>, {
        ...mergedInputProps,
        ref: composeRefs(inputRef, childProps.ref),
        isDisabled,
      });
    });
  }

  return (
    <Input
      {...(inputProps as InputProps)}
      ref={inputRef}
      isDisabled={isDisabled}
    />
  );
}

function ColorField(props: ColorFieldProps) {
  const { className, children, isDisabled, isInvalid, isReadOnly, ...rest } =
    props;

  return (
    <Field data-slot="color-field" className={className}>
      {isChannelColorFieldProps(props) ? (
        <ColorChannelFieldRoot
          {...rest}
          channel={props.channel}
          {...(props.colorSpace !== undefined
            ? { colorSpace: props.colorSpace }
            : {})}
          {...(isDisabled !== undefined ? { isDisabled } : {})}
          {...(isInvalid !== undefined ? { isInvalid } : {})}
          {...(isReadOnly !== undefined ? { isReadOnly } : {})}
        >
          {children}
        </ColorChannelFieldRoot>
      ) : (
        <ColorRegularFieldRoot
          {...rest}
          {...(isDisabled !== undefined ? { isDisabled } : {})}
          {...(isInvalid !== undefined ? { isInvalid } : {})}
          {...(isReadOnly !== undefined ? { isReadOnly } : {})}
        >
          {children}
        </ColorRegularFieldRoot>
      )}
    </Field>
  );
}

type ColorFieldRootProps = Omit<
  ColorFieldProps,
  "className" | "children" | "channel" | "colorSpace"
> & {
  children?: ReactNode;
};

function ColorRegularFieldRoot({
  children,
  isDisabled,
  isInvalid,
  isReadOnly,
  ...props
}: ColorFieldRootProps) {
  const field = useFieldContext();
  const pickerState = useColorPickerStateContext();
  const mergedProps = mergeColorPickerProps(
    props as StatelyColorFieldProps,
    pickerState,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedDisabled = Boolean(isDisabled);
  const resolvedInvalid = Boolean(isInvalid);
  const ariaProps = {
    ...mergedProps,
    ...(field?.inputId ? { id: field.inputId } : {}),
    isDisabled: resolvedDisabled,
    isInvalid: resolvedInvalid,
    ...(isReadOnly !== undefined ? { isReadOnly } : {}),
  };
  const state = useColorFieldState(mergedProps);
  const { labelProps, inputProps, descriptionProps, errorMessageProps } =
    useColorField(ariaProps, state, inputRef);
  const inputAria = useFieldInputAria(
    inputProps as React.InputHTMLAttributes<HTMLInputElement>,
  );

  const contextValue = useMemo(
    () => ({
      inputProps: mergeProps(
        inputProps as React.InputHTMLAttributes<HTMLInputElement>,
        inputAria,
      ),
      inputRef,
      labelProps,
      descriptionProps,
      errorMessageProps,
      isDisabled: resolvedDisabled,
      isInvalid: resolvedInvalid,
    }),
    [
      inputProps,
      inputAria,
      labelProps,
      descriptionProps,
      errorMessageProps,
      resolvedDisabled,
      resolvedInvalid,
    ],
  );

  return (
    <ColorFieldContext.Provider value={contextValue}>
      <div
        data-color-field=""
        data-disabled={resolvedDisabled ? "true" : undefined}
        data-invalid={resolvedInvalid ? "true" : undefined}
        className={styles.root}
      >
        {renderColorFieldChildren(
          children,
          contextValue.inputProps,
          inputRef,
          resolvedDisabled,
        )}
      </div>
    </ColorFieldContext.Provider>
  );
}

function ColorChannelFieldRoot({
  children,
  channel,
  colorSpace,
  isDisabled,
  isInvalid,
  isReadOnly,
  ...props
}: ColorFieldRootProps & {
  channel: NonNullable<
    Extract<ColorFieldProps, { channel: unknown }>["channel"]
  >;
  colorSpace?: Extract<ColorFieldProps, { colorSpace?: unknown }>["colorSpace"];
}) {
  const field = useFieldContext();
  const pickerState = useColorPickerStateContext();
  const mergedProps = mergeColorPickerProps(
    props as StatelyColorFieldProps,
    pickerState,
  );
  const { locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedDisabled = Boolean(isDisabled);
  const resolvedInvalid = Boolean(isInvalid);
  const channelStateOptions = {
    ...mergedProps,
    channel,
    locale,
    ...(colorSpace !== undefined ? { colorSpace } : {}),
  };
  const ariaProps = {
    ...mergedProps,
    channel,
    ...(colorSpace !== undefined ? { colorSpace } : {}),
    ...(field?.inputId ? { id: field.inputId } : {}),
    isDisabled: resolvedDisabled,
    isInvalid: resolvedInvalid,
    ...(isReadOnly !== undefined ? { isReadOnly } : {}),
  };
  const state = useColorChannelFieldState(channelStateOptions);
  const { labelProps, inputProps, descriptionProps, errorMessageProps } =
    useColorChannelField(ariaProps, state, inputRef);
  const inputAria = useFieldInputAria(
    inputProps as React.InputHTMLAttributes<HTMLInputElement>,
  );

  const contextValue = useMemo(
    () => ({
      inputProps: mergeProps(
        inputProps as React.InputHTMLAttributes<HTMLInputElement>,
        inputAria,
      ),
      inputRef,
      labelProps,
      descriptionProps,
      errorMessageProps,
      isDisabled: resolvedDisabled,
      isInvalid: resolvedInvalid,
    }),
    [
      inputProps,
      inputAria,
      labelProps,
      descriptionProps,
      errorMessageProps,
      resolvedDisabled,
      resolvedInvalid,
    ],
  );

  return (
    <ColorFieldContext.Provider value={contextValue}>
      <div
        data-color-field=""
        data-disabled={resolvedDisabled ? "true" : undefined}
        data-invalid={resolvedInvalid ? "true" : undefined}
        className={styles.root}
      >
        {renderColorFieldChildren(
          children,
          contextValue.inputProps,
          inputRef,
          resolvedDisabled,
        )}
      </div>
    </ColorFieldContext.Provider>
  );
}

export type { ColorFieldProps } from "./types";
export { ColorField, isChannelColorFieldProps };
