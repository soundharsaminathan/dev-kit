import { Heading } from "@dev-ui/components/heading";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/Heading",
  component: Heading,
  tags: ["ai-generated"],
  argTypes: {
    level: {
      control: "select",
      options: [1, 2, 3, 4, 5, 6],
    },
  },
  args: {
    level: 1,
    children: "Section title",
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = {};

export const Level2: Story = {
  args: {
    level: 2,
    children: "Page title",
  },
  play: async ({ canvas }) => {
    const heading = canvas.getByRole("heading", { level: 2 });
    await expect(heading).toHaveTextContent("Page title");
  },
};

export const Level3: Story = {
  args: {
    level: 3,
    children: "Subsection",
  },
};
