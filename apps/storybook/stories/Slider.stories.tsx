import { Slider } from "@dev-ui/components/slider";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/Slider",
  component: Slider,
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    defaultValue: { control: "number" },
    minValue: { control: "number" },
    maxValue: { control: "number" },
    step: { control: "number" },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    isDisabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Volume",
    defaultValue: 50,
    minValue: 0,
    maxValue: 100,
    step: 1,
    orientation: "horizontal",
    isDisabled: false,
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("slider")).toBeInTheDocument();
    await expect(canvas.getByText("50")).toBeInTheDocument();
  },
};

export const Range: Story = {
  args: {
    defaultValue: [25, 75],
    "aria-label": "Price range",
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
    defaultValue: 40,
    "aria-label": "Level",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "12rem" }}>
        <Story />
      </div>
    ),
  ],
};
