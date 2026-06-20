import { Link } from "@dev-ui/components/link";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/Link",
  component: Link,
  tags: ["ai-generated"],
  argTypes: {
    variant: {
      control: "select",
      options: ["accent", "quiet", "unstyled"],
    },
    isDisabled: { control: "boolean" },
  },
  args: {
    children: "Learn more",
    href: "https://example.com",
    variant: "accent",
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Accent: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: /learn more/i });
    await expect(link).toHaveAttribute("data-variant", "accent");
    await expect(link).toHaveAttribute("href", "https://example.com");
  },
};

export const Quiet: Story = {
  args: {
    variant: "quiet",
    children: "Documentation",
  },
};

export const Unstyled: Story = {
  args: {
    variant: "unstyled",
    children: "Plain link",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    children: "Unavailable",
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: /unavailable/i });
    await expect(link).toHaveAttribute("data-disabled", "true");
    await expect(link).toHaveAttribute("aria-disabled", "true");
  },
};
