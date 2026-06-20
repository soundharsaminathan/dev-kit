import { createContext, useContext } from "react";

export type FieldContextValue = {
  inputId: string;
  descriptionId: string;
  errorId: string;
  hasDescription: boolean;
  hasError: boolean;
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
