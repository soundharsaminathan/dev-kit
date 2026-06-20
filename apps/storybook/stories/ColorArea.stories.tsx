import { ColorArea } from "@dev-ui/components/color-area";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/ColorArea",
  component: ColorArea,
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    defaultValue: { control: "color" },
    isDisabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Saturation and brightness",
    defaultValue: "#6366f1",
    colorSpace: "hsb",
    xChannel: "saturation",
    yChannel: "brightness",
    isDisabled: false,
  },
} satisfies Meta<typeof ColorArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("slider")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
