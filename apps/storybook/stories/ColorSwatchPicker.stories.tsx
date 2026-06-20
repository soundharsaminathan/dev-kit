import {
  ColorSwatchPicker,
  ColorSwatchPickerItem,
} from "@dev-ui/components/color-swatch-picker";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/ColorSwatchPicker",
  component: ColorSwatchPicker,
  tags: ["ai-generated"],
  argTypes: {
    defaultValue: { control: "color" },
    isDisabled: { control: "boolean" },
  },
  args: {
    "aria-label": "Preset colors",
    defaultValue: "#6366f1",
    isDisabled: false,
  },
  render: (args) => (
    <ColorSwatchPicker {...args}>
      <ColorSwatchPickerItem color="#6366f1" />
      <ColorSwatchPickerItem color="#ef4444" />
      <ColorSwatchPickerItem color="#22c55e" />
      <ColorSwatchPickerItem color="#3b82f6" />
      <ColorSwatchPickerItem color="#eab308" />
      <ColorSwatchPickerItem color="#ec4899" />
    </ColorSwatchPicker>
  ),
} satisfies Meta<typeof ColorSwatchPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("radio")).toHaveLength(6);
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
