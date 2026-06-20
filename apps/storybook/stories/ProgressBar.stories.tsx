import {
  ProgressBar,
  ProgressBarOutput,
  ProgressBarTrack,
} from "@dev-ui/components/progress-bar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/ProgressBar",
  component: ProgressBar,
  tags: ["ai-generated"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
    minValue: { control: "number" },
    maxValue: { control: "number" },
    isIndeterminate: { control: "boolean" },
    "aria-label": { control: "text" },
  },
  args: {
    "aria-label": "Upload progress",
    value: 60,
    minValue: 0,
    maxValue: 100,
    isIndeterminate: false,
  },
  render: (args) => (
    <ProgressBar {...args}>
      <ProgressBarTrack />
      <ProgressBarOutput />
    </ProgressBar>
  ),
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("60%")).toBeInTheDocument();
    const fill = canvas
      .getByRole("progressbar")
      .querySelector("[class*='fill']");
    await expect(fill).toBeTruthy();
  },
};

export const Indeterminate: Story = {
  args: {
    isIndeterminate: true,
  },
};
