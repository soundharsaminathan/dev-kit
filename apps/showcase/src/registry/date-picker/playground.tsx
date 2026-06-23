import {
  DatePicker,
  DatePickerPopover,
  DatePickerTrigger,
} from "@dev-ui/components/date-picker";
import { Description, FieldError, Label } from "@dev-ui/components/field";
import { getLocalTimeZone, today } from "@internationalized/date";

type DatePickerPlaygroundProps = {
  label?: string;
  description?: string;
  errorMessage?: string;
  labelMode?: "prop" | "element";
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
};

export default function DatePickerPlayground({
  labelMode = "element",
  label = "Event date",
  description = "",
  errorMessage = "",
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
}: DatePickerPlaygroundProps = {}) {
  return (
    <DatePicker
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
      <DatePickerTrigger />
      <DatePickerPopover />
    </DatePicker>
  );
}
