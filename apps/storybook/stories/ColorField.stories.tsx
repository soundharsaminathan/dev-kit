import { ColorField } from "@dev-ui/components/color-field";
import { Input } from "@dev-ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/ColorField",
  component: ColorField,
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    defaultValue: { control: "color" },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  args: {
    "aria-label": "Hex",
    defaultValue: "#6366f1",
    isDisabled: false,
    isInvalid: false,
  },
  render: (args) => (
    <ColorField {...args}>
      <Input size="sm" />
    </ColorField>
  ),
} satisfies Meta<typeof ColorField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};

export const Invalid: Story = {
  args: {
    isInvalid: true,
  },
};

export const ChannelField: Story = {
  args: {
    "aria-label": "Red",
    colorSpace: "rgb",
    channel: "red",
  },
};
