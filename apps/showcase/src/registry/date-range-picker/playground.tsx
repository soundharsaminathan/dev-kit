import {
  DateRangePicker,
  DateRangePickerPopover,
  DateRangePickerTrigger,
} from "@dev-ui/components/date-picker";
import { Description, FieldError, Label } from "@dev-ui/components/field";

type DateRangePickerPlaygroundProps = {
  label?: string;
  description?: string;
  errorMessage?: string;
  labelMode?: "prop" | "element";
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
};

export default function DateRangePickerPlayground({
  labelMode = "element",
  label = "Trip dates",
  description = "",
  errorMessage = "",
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
}: DateRangePickerPlaygroundProps = {}) {
  return (
    <DateRangePicker
      label={labelMode === "prop" ? label : undefined}
      description={description || undefined}
      errorMessage={errorMessage || undefined}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
    >
      {labelMode === "element" ? <Label>{label}</Label> : null}
      {description ? <Description>{description}</Description> : null}
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
      <DateRangePickerTrigger />
      <DateRangePickerPopover />
    </DateRangePicker>
  );
}
