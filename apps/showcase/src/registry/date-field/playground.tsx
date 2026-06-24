import { DateField } from "@dev-ui/components/date-field";
import { Description, FieldError, Label } from "@dev-ui/components/field";
import { getLocalTimeZone, today } from "@internationalized/date";

type DateFieldPlaygroundProps = {
  label?: string;
  description?: string;
  errorMessage?: string;
  labelMode?: "prop" | "element";
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
};

export default function DateFieldPlayground({
  labelMode = "element",
  label = "Event date",
  description = "",
  errorMessage = "",
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
}: DateFieldPlaygroundProps = {}) {
  return (
    <DateField
      label={labelMode === "prop" ? label : undefined}
      description={description || undefined}
      errorMessage={errorMessage || undefined}
      defaultValue={today(getLocalTimeZone())}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
    >
      {labelMode === "element" ? <Label>{label}</Label> : null}
      {description ? <Description>{description}</Description> : null}
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
    </DateField>
  );
}
