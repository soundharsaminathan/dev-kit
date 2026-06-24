import { Keyboard, KeyboardGroup } from "@dev-ui/components/keyboard";
import type { Meta, StoryObj } from "@storybook/react-vite";

type KeyboardStoryArgs = {
  children: string;
  showGroup: boolean;
  modifierKey: string;
};

const meta = {
  title: "Components/Keyboard",
  tags: ["ai-generated"],
  argTypes: {
    children: { control: "text" },
    showGroup: { control: "boolean" },
    modifierKey: { control: "text" },
  },
  args: {
    children: "K",
    showGroup: true,
    modifierKey: "⌘",
  },
  render: ({ children, showGroup, modifierKey }) =>
    showGroup ? (
      <KeyboardGroup>
        <Keyboard>{modifierKey}</Keyboard>
        <Keyboard>{children}</Keyboard>
      </KeyboardGroup>
    ) : (
      <Keyboard>{children}</Keyboard>
    ),
} satisfies Meta<KeyboardStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
