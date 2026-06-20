import { Button } from "@dev-ui/components/button";
import { Group, GroupText } from "@dev-ui/components/group";
import type { Meta, StoryObj } from "@storybook/react-vite";

type GroupStoryArgs = {
  orientation: "horizontal" | "vertical";
  isDisabled: boolean;
  isInvalid: boolean;
  showPrefixText: boolean;
  prefixText: string;
};

const meta = {
  title: "Components/Group",
  tags: ["ai-generated"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
    showPrefixText: { control: "boolean" },
    prefixText: { control: "text" },
  },
  args: {
    orientation: "horizontal",
    isDisabled: false,
    isInvalid: false,
    showPrefixText: false,
    prefixText: "Prefix",
  },
  render: ({
    orientation,
    isDisabled,
    isInvalid,
    showPrefixText,
    prefixText,
  }) => (
    <Group
      orientation={orientation}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
    >
      {showPrefixText ? <GroupText>{prefixText}</GroupText> : null}
      <Button>One</Button>
      <Button>Two</Button>
      {orientation === "horizontal" ? <Button>Three</Button> : null}
    </Group>
  ),
} satisfies Meta<GroupStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithText: Story = {
  args: {
    showPrefixText: true,
  },
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
  },
};
