import type { ComponentPropsWithoutRef, LabelHTMLAttributes } from "react";

export type FieldOrientation = "horizontal" | "vertical";

export type FieldsetProps = ComponentPropsWithoutRef<"fieldset">;
export type LegendProps = ComponentPropsWithoutRef<"legend">;
export type FieldGroupProps = ComponentPropsWithoutRef<"div">;

export type FieldProps = ComponentPropsWithoutRef<"div"> & {
  orientation?: FieldOrientation | undefined;
};

export type FieldContentProps = ComponentPropsWithoutRef<"div">;
export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;
export type DescriptionProps = Omit<ComponentPropsWithoutRef<"span">, "slot">;
export type FieldErrorProps = ComponentPropsWithoutRef<"div">;
