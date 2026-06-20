import { Skeleton } from "@dev-ui/components/skeleton";
import { Text } from "@dev-ui/components/text";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  tags: ["ai-generated"],
  argTypes: {
    animation: {
      control: "select",
      options: ["shimmer", "pulse", "none"],
    },
    isLoading: { control: "boolean" },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
  play: async ({ canvas }) => {
    const skeleton = canvas.getByRole("generic", { busy: true });
    await expect(skeleton).toHaveAttribute("data-skeleton-loading", "true");
  },
};

export const WithContent: Story = {
  render: () => (
    <Skeleton isLoading>
      <Text>Loading text</Text>
    </Skeleton>
  ),
};
