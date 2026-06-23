import { ColorSlider } from "@dev-ui/components/color-slider";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/ColorSlider",
  component: ColorSlider,
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    defaultValue: { control: "color" },
    channel: {
      control: "select",
      options: [
        "hue",
        "saturation",
        "brightness",
        "lightness",
        "red",
        "green",
        "blue",
        "alpha",
      ],
    },
    colorSpace: {
      control: "select",
      options: ["hsb", "hsl", "rgb"],
    },
    isDisabled: { control: "boolean" },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
  args: {
    "aria-label": "Hue",
    defaultValue: "#6366f1",
    channel: "hue",
    colorSpace: "hsb",
    isDisabled: false,
    orientation: "horizontal",
  },
} satisfies Meta<typeof ColorSlider>;

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

export const Vertical: Story = {
  args: {
    orientation: "vertical",
    "aria-label": "Brightness",
    channel: "brightness",
  },
};

export const AlphaChannel: Story = {
  args: {
    "aria-label": "Alpha",
    channel: "alpha",
  },
};
