import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dev-ui/components/empty";
import type { Meta, StoryObj } from "@storybook/react-vite";

type EmptyStoryArgs = {
  title: string;
  description: string;
  mediaVariant: "default" | "icon";
  actionLabel: string;
  showAction: boolean;
};

const meta = {
  title: "Components/Empty",
  tags: ["ai-generated"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    mediaVariant: {
      control: "select",
      options: ["default", "icon"],
    },
    actionLabel: { control: "text" },
    showAction: { control: "boolean" },
  },
  args: {
    title: "No projects yet",
    description: "Create your first project to get started.",
    mediaVariant: "icon",
    actionLabel: "Create project",
    showAction: true,
  },
  render: ({ title, description, mediaVariant, actionLabel, showAction }) => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant={mediaVariant}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              strokeWidth="2"
            />
          </svg>
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {showAction ? (
        <EmptyContent>
          <button type="button">{actionLabel}</button>
        </EmptyContent>
      ) : null}
    </Empty>
  ),
} satisfies Meta<EmptyStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
