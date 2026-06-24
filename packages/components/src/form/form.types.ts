import type { FormProps as SharedFormProps } from "@react-types/shared";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type FormProps = SharedFormProps &
  ComponentPropsWithoutRef<"form"> & {
    ref?: Ref<HTMLFormElement>;
    validationBehavior?: "aria" | "native" | undefined;
    validationErrors?: Record<string, string | string[]> | undefined;
  };
