import { Switch } from "@dev-ui/components/switch";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Switch",
  component: Switch,
  tags: ["ai-generated"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
  args: {
    children: "Notifications",
    size: "md",
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    defaultSelected: true,
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
