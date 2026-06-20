import { Loader } from "@dev-ui/components/loader";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/Loader",
  component: Loader,
  tags: ["ai-generated"],
  argTypes: {
    variant: {
      control: "select",
      options: ["spinner", "ring"],
    },
  },
  args: {
    variant: "spinner",
  },
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spinner: Story = {
  play: async ({ canvas }) => {
    const loader = canvas.getByRole("progressbar");
    await expect(loader).toHaveAttribute("data-loader", "");
  },
};

export const Ring: Story = {
  args: {
    variant: "ring",
  },
};
