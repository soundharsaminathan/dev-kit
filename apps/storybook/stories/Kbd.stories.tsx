import { Kbd, KbdGroup } from "@dev-ui/components/kbd";
import type { Meta, StoryObj } from "@storybook/react-vite";

type KbdStoryArgs = {
  children: string;
  showGroup: boolean;
  modifierKey: string;
};

const meta = {
  title: "Components/Kbd",
  tags: ["ai-generated"],
  argTypes: {
    children: { control: "text" },
    showGroup: { control: "boolean" },
    modifierKey: { control: "text" },
  },
  args: {
    children: "K",
    showGroup: false,
    modifierKey: "⌘",
  },
  render: ({ children, showGroup, modifierKey }) =>
    showGroup ? (
      <KbdGroup>
        <Kbd>{modifierKey}</Kbd>
        <Kbd>{children}</Kbd>
      </KbdGroup>
    ) : (
      <Kbd>{children}</Kbd>
    ),
} satisfies Meta<KbdStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Group: Story = {
  args: {
    showGroup: true,
  },
};
