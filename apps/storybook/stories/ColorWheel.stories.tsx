import { ColorWheel } from "@dev-ui/components/color-wheel";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/ColorWheel",
  component: ColorWheel,
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    isDisabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Hue",
    defaultValue: "#6366f1",
    isDisabled: false,
  },
} satisfies Meta<typeof ColorWheel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
