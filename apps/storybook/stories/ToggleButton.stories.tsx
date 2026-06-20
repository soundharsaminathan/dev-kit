import { ToggleButton } from "@dev-ui/components/toggle-button";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/ToggleButton",
  component: ToggleButton,
  tags: ["ai-generated"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "quiet"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
  },
  args: {
    children: "Bold",
    variant: "default",
    size: "md",
  },
} satisfies Meta<typeof ToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    defaultSelected: true,
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
  },
};

export const Quiet: Story = {
  args: {
    variant: "quiet",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
