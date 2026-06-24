import { Calendar, type CalendarProps } from "@dev-ui/components/calendar";

export default function CalendarPlayground({
  isDisabled = false,
  isReadOnly = false,
  ...props
}: CalendarProps = {}) {
  return (
    <Calendar isDisabled={isDisabled} isReadOnly={isReadOnly} {...props} />
  );
}
