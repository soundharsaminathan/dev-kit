import { Badge } from "@dev-ui/components/badge";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["ai-generated"],
  argTypes: {
    appearance: {
      control: "select",
      options: ["solid", "subtle"],
    },
    variant: {
      control: "select",
      options: ["neutral", "accent", "danger", "success", "warning", "info"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
  args: {
    children: "Badge",
    appearance: "solid",
    variant: "neutral",
    size: "md",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  play: async ({ canvas }) => {
    const badge = canvas.getByText("Badge");
    await expect(badge).toHaveAttribute("data-variant", "neutral");
    await expect(badge).toHaveAttribute("data-appearance", "solid");
  },
};

export const Accent: Story = {
  args: {
    variant: "accent",
    children: "New",
  },
};

export const SubtleDanger: Story = {
  args: {
    appearance: "subtle",
    variant: "danger",
    children: "Error",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
};
