import { Button } from "@dev-ui/components/button";
import { Menu, MenuContent, MenuItem } from "@dev-ui/components/menu";
import type { Meta, StoryObj } from "@storybook/react-vite";

type MenuStoryArgs = {
  triggerLabel: string;
  placement:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "bottom start"
    | "bottom end";
  showDangerItem: boolean;
};

const meta = {
  title: "Components/Menu",
  tags: ["ai-generated"],
  argTypes: {
    triggerLabel: { control: "text" },
    placement: {
      control: "select",
      options: ["bottom", "top", "left", "right", "bottom start", "bottom end"],
    },
    showDangerItem: { control: "boolean" },
  },
  args: {
    triggerLabel: "Actions",
    placement: "bottom start",
    showDangerItem: true,
  },
  render: ({ triggerLabel, placement, showDangerItem }) => (
    <Menu>
      <Button aria-label="Open menu">{triggerLabel}</Button>
      <MenuContent placement={placement}>
        <MenuItem id="edit">Edit</MenuItem>
        <MenuItem id="duplicate">Duplicate</MenuItem>
        {showDangerItem ? (
          <MenuItem id="delete" variant="danger">
            Delete
          </MenuItem>
        ) : null}
      </MenuContent>
    </Menu>
  ),
} satisfies Meta<MenuStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
