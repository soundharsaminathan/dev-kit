import {
  COLOR_SWATCH_PICKER_PRESETS,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  type ColorSwatchPickerProps,
} from "@dev-ui/components/color-swatch-picker";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

function ColorSwatchPickerDemo({
  defaultValue = COLOR_SWATCH_PICKER_PRESETS[0],
  ...props
}: ColorSwatchPickerProps) {
  return (
    <ColorSwatchPicker
      aria-label="Preset colors"
      defaultValue={defaultValue}
      {...props}
    >
      {COLOR_SWATCH_PICKER_PRESETS.map((color) => (
        <ColorSwatchPickerItem key={color} color={color} />
      ))}
    </ColorSwatchPicker>
  );
}

const meta = {
  title: "Components/ColorSwatchPicker",
  component: ColorSwatchPickerDemo,
  tags: ["ai-generated"],
  argTypes: {
    defaultValue: { control: "color" },
    isDisabled: { control: "boolean" },
  },
  args: {
    defaultValue: COLOR_SWATCH_PICKER_PRESETS[0],
    isDisabled: false,
  },
} satisfies Meta<typeof ColorSwatchPickerDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const radios = canvas.getAllByRole("radio");
    await expect(radios).toHaveLength(COLOR_SWATCH_PICKER_PRESETS.length);
    await expect(radios[0]).toHaveAttribute("aria-checked", "true");

    await userEvent.click(radios[2]!);
    await expect(radios[2]).toHaveAttribute("aria-checked", "true");
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
