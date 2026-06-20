import { Checkbox } from "@dev-ui/components/checkbox";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  tags: ["ai-generated"],
  argTypes: {
    children: { control: "text" },
    defaultSelected: { control: "boolean" },
    isIndeterminate: { control: "boolean" },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  args: {
    children: "Accept terms",
    defaultSelected: false,
    isIndeterminate: false,
    isDisabled: false,
    isInvalid: false,
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    defaultSelected: true,
  },
};

export const Indeterminate: Story = {
  args: {
    isIndeterminate: true,
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};

export const Invalid: Story = {
  args: {
    isInvalid: true,
  },
};
