import { Description, FieldError, Label } from "@dev-ui/components/field";
import { TimeField } from "@dev-ui/components/time-field";
import { Time } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";

type TimeFieldStoryArgs = {
  label: string;
  description: string;
  errorMessage: string;
  labelMode: "prop" | "element";
  isDisabled: boolean;
  isRequired: boolean;
  isInvalid: boolean;
};

const meta = {
  title: "Components/TimeField",
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
    label: "Meeting time",
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
  ),
} satisfies Meta<TimeFieldStoryArgs>;

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
    description: "Enter the meeting time",
  },
};

export const Invalid: Story = {
  args: {
    isInvalid: true,
    errorMessage: "Time is required",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
