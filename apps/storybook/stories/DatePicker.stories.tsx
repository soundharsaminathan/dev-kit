import {
  DatePicker,
  DatePickerPopover,
  DatePickerTrigger,
  DateRangePicker,
  DateRangePickerPopover,
  DateRangePickerTrigger,
} from "@dev-ui/components/date-picker";
import { Description, FieldError, Label } from "@dev-ui/components/field";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";

type DatePickerStoryArgs = {
  label: string;
  description: string;
  errorMessage: string;
  labelMode: "prop" | "element";
  isDisabled: boolean;
  isRequired: boolean;
  isInvalid: boolean;
};

const meta = {
  title: "Components/DatePicker",
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
    label: "Event date",
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
  ),
} satisfies Meta<DatePickerStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabelProp: Story = {
  args: {
    labelMode: "prop",
  },
};

export const WithDescription: Story = {
  args: {
    description: "Select the event date",
  },
};

export const Invalid: Story = {
  args: {
    isInvalid: true,
    errorMessage: "Date is required",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};

export const Range: Story = {
  render: (args) => (
    <DateRangePicker
      label={args.labelMode === "prop" ? args.label : undefined}
      description={args.description || undefined}
      errorMessage={args.errorMessage || undefined}
      isDisabled={args.isDisabled}
      isRequired={args.isRequired}
      isInvalid={args.isInvalid}
    >
      {args.labelMode === "element" ? <Label>{args.label}</Label> : null}
      {args.description ? <Description>{args.description}</Description> : null}
      {args.errorMessage ? <FieldError>{args.errorMessage}</FieldError> : null}
      <DateRangePickerTrigger />
      <DateRangePickerPopover />
    </DateRangePicker>
  ),
  args: {
    label: "Trip dates",
  },
};
