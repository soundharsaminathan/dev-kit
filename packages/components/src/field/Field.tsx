import { cn } from "@dev-ui/core";
import { FormValidationContext } from "@react-stately/form";
import {
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Text } from "../text/Text";
import styles from "./field.module.scss";
import type {
  DescriptionProps,
  FieldContentProps,
  FieldErrorProps,
  FieldGroupProps,
  FieldProps,
  FieldsetProps,
  LabelProps,
  LegendProps,
} from "./field.types";
import {
  FieldContext,
  getFieldLabelText,
  useFieldContext,
} from "./field-context";

function Fieldset({ className, ...props }: FieldsetProps) {
  return (
    <fieldset
      data-slot="fieldset"
      className={cn(styles.fieldset, className)}
      {...props}
    />
  );
}

function Legend({ className, ...props }: LegendProps) {
  return (
    <legend
      data-slot="legend"
      className={cn(styles.legend, className)}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: FieldGroupProps) {
  return (
    <div
      data-slot="field-group"
      className={cn(styles.fieldGroup, className)}
      {...props}
    />
  );
}

function Field({
  orientation = "vertical",
  className,
  children,
  name,
  ...props
}: FieldProps) {
  const inputId = useId();
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const labelTextRef = useRef<string | undefined>(undefined);
  const setLabelText = useCallback((value: string | undefined) => {
    labelTextRef.current = value;
  }, []);
  const [hasDescription, setHasDescription] = useState(false);
  const [hasError, setHasError] = useState(false);

  useLayoutEffect(() => {
    return () => setLabelText(undefined);
  }, [setLabelText]);

  return (
    <FieldContext.Provider
      value={{
        name,
        inputId,
        labelId,
        descriptionId,
        errorId,
        labelTextRef,
        hasDescription,
        hasError,
        setLabelText,
        setHasDescription,
        setHasError,
      }}
    >
      <div
        data-slot="field"
        data-orientation={orientation}
        className={cn(styles.field, className)}
        {...props}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );
}

function FieldContent({ className, ...props }: FieldContentProps) {
  return (
    <div
      data-slot="field-content"
      className={cn(styles.fieldContent, className)}
      {...props}
    />
  );
}

function Label({ className, htmlFor, id, children, ...props }: LabelProps) {
  const field = useFieldContext();
  const text = getFieldLabelText(children);

  if (field) {
    field.setLabelText(text);
  }

  return (
    <label
      data-slot="label"
      data-label=""
      id={id ?? field?.labelId}
      htmlFor={htmlFor ?? field?.inputId}
      className={cn(styles.label, className)}
      {...props}
    >
      {children}
    </label>
  );
}
Label.displayName = "Label";

function Description({ className, id, ...props }: DescriptionProps) {
  const field = useFieldContext();

  useLayoutEffect(() => {
    field?.setHasDescription(true);
    return () => field?.setHasDescription(false);
  }, [field]);

  return (
    <Text
      data-slot="description"
      data-description=""
      id={id ?? field?.descriptionId}
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

function FieldError({ className, id, children, ...props }: FieldErrorProps) {
  const field = useFieldContext();
  const validationErrors = useContext(FormValidationContext);
  const validationMessage =
    field?.name != null ? validationErrors[field.name] : undefined;
  const resolvedChildren =
    children ??
    (Array.isArray(validationMessage)
      ? validationMessage.join(", ")
      : validationMessage);

  useLayoutEffect(() => {
    if (!resolvedChildren) {
      return undefined;
    }
    field?.setHasError(true);
    return () => field?.setHasError(false);
  }, [resolvedChildren, field]);

  if (!resolvedChildren) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      data-field-error=""
      id={id ?? field?.errorId}
      className={cn(styles.fieldError, className)}
      {...props}
    >
      {resolvedChildren}
    </div>
  );
}

export type {
  DescriptionProps,
  FieldContentProps,
  FieldErrorProps,
  FieldGroupProps,
  FieldOrientation,
  FieldProps,
  FieldsetProps,
  LabelProps,
  LegendProps,
} from "./field.types";
export {
  Description,
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  Fieldset,
  Label,
  Legend,
};
