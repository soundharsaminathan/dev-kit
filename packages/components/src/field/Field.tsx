import { cn } from "@dev-ui/core";
import { useId, useLayoutEffect, useState } from "react";
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
import { FieldContext, useFieldContext } from "./field-context";

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
  ...props
}: FieldProps) {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const [hasDescription, setHasDescription] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <FieldContext.Provider
      value={{
        inputId,
        descriptionId,
        errorId,
        hasDescription,
        hasError,
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

function Label({ className, htmlFor, children, ...props }: LabelProps) {
  const field = useFieldContext();
  return (
    <label
      data-slot="label"
      data-label=""
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

  useLayoutEffect(() => {
    if (!children) {
      return undefined;
    }
    field?.setHasError(true);
    return () => field?.setHasError(false);
  }, [children, field]);

  if (!children) {
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
      {children}
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
