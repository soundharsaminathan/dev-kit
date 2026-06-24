import {
  DateRangePicker,
  DateRangePickerPopover,
  DateRangePickerTrigger,
} from "@dev-ui/components/date-picker";
import { Description, FieldError, Label } from "@dev-ui/components/field";
import type { Meta, StoryObj } from "@storybook/react-vite";

type DateRangePickerStoryArgs = {
  label: string;
  description: string;
  errorMessage: string;
  labelMode: "prop" | "element";
  isDisabled: boolean;
  isRequired: boolean;
  isInvalid: boolean;
};

const meta = {
  title: "Components/DateRangePicker",
  tags: ["ai-generated"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" },
    labelMode: {
      control: "select",
      options: ["prop", "element"],
    },
    isDisabled: { control: "boolean" },
    isRequired: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  args: {
    label: "Trip dates",
    labelMode: "element",
    description: "",
    errorMessage: "",
    isDisabled: false,
    isRequired: false,
    isInvalid: false,
  },
  render: ({
    labelMode,
    label,
    description,
    errorMessage,
    isDisabled,
    isRequired,
    isInvalid,
  }) => (
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
  ),
} satisfies Meta<DateRangePickerStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
