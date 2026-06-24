import { Description, FieldError, Label } from "@dev-ui/components/field";
import { TimeField } from "@dev-ui/components/time-field";
import { Time } from "@internationalized/date";

type TimeFieldPlaygroundProps = {
  label?: string;
  description?: string;
  errorMessage?: string;
  labelMode?: "prop" | "element";
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
};

export default function TimeFieldPlayground({
  labelMode = "element",
  label = "Meeting time",
  description = "",
  errorMessage = "",
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
}: TimeFieldPlaygroundProps = {}) {
  return (
    <TimeField
      label={labelMode === "prop" ? label : undefined}
      description={description || undefined}
      errorMessage={errorMessage || undefined}
      defaultValue={new Time(9, 30)}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
    >
      {labelMode === "element" ? <Label>{label}</Label> : null}
      {description ? <Description>{description}</Description> : null}
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
    </TimeField>
  );
}
