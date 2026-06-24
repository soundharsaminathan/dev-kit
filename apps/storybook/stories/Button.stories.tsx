import { Button } from "@dev-ui/components/button";
import { getBuiltInTheme, resolveSemanticColors } from "@dev-ui/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["ai-generated"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "quiet", "link", "warning", "danger"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
    isIconOnly: { control: "boolean" },
    isPending: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    children: "Button",
    variant: "default",
    size: "md",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Default",
    variant: "default",
  },
};

export const Primary: Story = {
  args: {
    children: "Order now",
    variant: "primary",
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /order now/i });
    await expect(button).toHaveAttribute("data-variant", "primary");
  },
};

export const Quiet: Story = {
  args: {
    variant: "quiet",
    children: "Quiet",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Learn more",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "Warning",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "Delete",
  },
};

export const ExtraSmall: Story = {
  args: {
    size: "xs",
    children: "Extra small",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
};

export const IconOnly: Story = {
  args: {
    isIconOnly: true,
    "aria-label": "Upload",
    children: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16" strokeWidth="2" />
      </svg>
    ),
  },
};

export const Pending: Story = {
  args: {
    isPending: true,
    children: "Saving",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /disabled/i });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("data-state", "disabled");
  },
};

export const AsAnchor: Story = {
  render: () => (
    <Button as="a" href="https://example.com" variant="primary">
      Visit site
    </Button>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: /visit site/i });
    await expect(link).toHaveAttribute("href", "https://example.com");
  },
};

export const CssCheck: Story = {
  args: {
    children: "Submit",
    variant: "primary",
  },
  globals: {
    theme: "default",
    themeMode: "light",
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /submit/i });
    const expected = resolveSemanticColors(
      getBuiltInTheme("default")!,
      "light",
    )["color-primary"];
    await expect(getComputedStyle(button).backgroundColor).toBe(expected);
  },
};
