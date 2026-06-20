import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

type CardStoryArgs = {
  size: "sm" | "default";
  title: string;
  description: string;
  content: string;
  footer: string;
};

const meta = {
  title: "Components/Card",
  tags: ["ai-generated"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "default"],
    },
    title: { control: "text" },
    description: { control: "text" },
    content: { control: "text" },
    footer: { control: "text" },
  },
  args: {
    size: "default",
    title: "Card title",
    description: "Card description",
    content: "Main content",
    footer: "Footer actions",
  },
  render: ({ size, title, description, content, footer }) => (
    <Card size={size}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
      <CardFooter>{footer}</CardFooter>
    </Card>
  ),
} satisfies Meta<CardStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Card title")).toHaveAttribute(
      "data-card-title",
      "",
    );
  },
};
