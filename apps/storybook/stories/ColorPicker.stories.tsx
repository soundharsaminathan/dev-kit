import { ColorPicker } from "@dev-ui/components/color-picker";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/ColorPicker",
  component: ColorPicker,
  tags: ["ai-generated"],
  argTypes: {
    defaultValue: { control: "color" },
    defaultOpen: { control: "boolean" },
  },
  args: {
    defaultValue: "#6366f1",
    defaultOpen: false,
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Pick color" }),
    ).toBeInTheDocument();
  },
};

export const Open: Story = {
  args: {
    defaultOpen: true,
  },
};
