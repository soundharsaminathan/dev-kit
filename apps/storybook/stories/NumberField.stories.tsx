import { Description, Label } from "@dev-ui/components/field";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@dev-ui/components/number-field";
import type { Meta, StoryObj } from "@storybook/react-vite";

type NumberFieldStoryArgs = {
  "aria-label": string;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  isDisabled: boolean;
  isInvalid: boolean;
  isRequired: boolean;
  showLabel: boolean;
  labelText: string;
  descriptionText: string;
  inputSize: "sm" | "md" | "lg";
};

const meta = {
  title: "Components/NumberField",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    labelText: { control: "text" },
    descriptionText: { control: "text" },
    showLabel: { control: "boolean" },
    defaultValue: { control: "number" },
    minValue: { control: "number" },
    maxValue: { control: "number" },
    step: { control: "number" },
    inputSize: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
    isRequired: { control: "boolean" },
  },
  args: {
    "aria-label": "Quantity",
    defaultValue: 5,
    minValue: 0,
    maxValue: 100,
    step: 1,
    isDisabled: false,
    isInvalid: false,
    isRequired: false,
    showLabel: false,
    labelText: "Quantity",
    descriptionText: "Choose how many items to order.",
    inputSize: "md",
  },
  render: ({ showLabel, labelText, descriptionText, inputSize, ...props }) =>
    showLabel ? (
      <NumberField {...props}>
        <Label>{labelText}</Label>
        <Description>{descriptionText}</Description>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput size={inputSize} />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    ) : (
      <NumberField {...props} />
    ),
} satisfies Meta<NumberFieldStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    showLabel: true,
    defaultValue: 2,
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
