import { Text } from "@dev-ui/components/text";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Text",
  component: Text,
  tags: ["ai-generated"],
  argTypes: {
    children: { control: "text" },
    slot: {
      control: "select",
      options: ["label", "description", "errorMessage"],
    },
  },
  args: {
    children: "Helper text for a field.",
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Description: Story = {
  args: {
    slot: "description",
    children: "Enter your email address.",
  },
};

export const Label: Story = {
  args: {
    slot: "label",
    children: "Email",
  },
};
