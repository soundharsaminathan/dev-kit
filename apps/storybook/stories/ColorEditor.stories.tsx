import { ColorEditor } from "@dev-ui/components/color-editor";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/ColorEditor",
  component: ColorEditor,
  tags: ["ai-generated"],
  argTypes: {
    defaultValue: { control: "color" },
    colorFormat: {
      control: "select",
      options: ["hex", "rgb", "hsl", "hsb"],
    },
    showAlphaChannel: { control: "boolean" },
    showFormatSelector: { control: "boolean" },
  },
  args: {
    defaultValue: "#6366f1",
    colorFormat: "hex",
    showAlphaChannel: false,
    showFormatSelector: true,
  },
} satisfies Meta<typeof ColorEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Hex" }),
    ).toBeInTheDocument();
  },
};

export const WithAlpha: Story = {
  args: {
    showAlphaChannel: true,
  },
};

export const WithoutFormatSelector: Story = {
  args: {
    showFormatSelector: false,
  },
};
