import { Input } from "@dev-ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Input",
  component: Input,
  tags: ["ai-generated"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: { control: "boolean" },
  },
  args: {
    placeholder: "Enter text",
    size: "md",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Name",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    "aria-label": "Name",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Name",
  },
};
