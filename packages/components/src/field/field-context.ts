import { createContext, type ReactNode, useContext } from "react";

export function getFieldLabelText(children: ReactNode): string | undefined {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return undefined;
}

export type FieldContextValue = {
  name: string | undefined;
  inputId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  labelTextRef: { current: string | undefined };
  hasDescription: boolean;
  hasError: boolean;
  setLabelText: (value: string | undefined) => void;
  setHasDescription: (value: boolean) => void;
  setHasError: (value: boolean) => void;
};

export const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

export function useFieldInputAria(inputProps: {
  "aria-describedby"?: string | undefined;
  "aria-errormessage"?: string | undefined;
}): Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  "aria-describedby" | "aria-errormessage"
> {
  const field = useFieldContext();
  const describedBy =
    [
      inputProps["aria-describedby"],
      field?.hasDescription && field.descriptionId,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(field?.hasError && field.errorId
      ? { "aria-errormessage": field.errorId }
      : {}),
  };
}
