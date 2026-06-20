import { Button } from "@dev-ui/components/button";
import { ContextMenu } from "@dev-ui/components/context-menu";
import { MenuContent, MenuItem } from "@dev-ui/components/menu";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ContextMenuStoryArgs = {
  "aria-label": string;
  isDisabled: boolean;
  defaultOpen: boolean;
  placement:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "bottom start"
    | "bottom end";
  triggerType: "area" | "button";
};

const meta = {
  title: "Components/ContextMenu",
  tags: ["ai-generated"],
  argTypes: {
    "aria-label": { control: "text" },
    isDisabled: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    placement: {
      control: "select",
      options: ["bottom", "top", "left", "right", "bottom start", "bottom end"],
    },
    triggerType: {
      control: "select",
      options: ["area", "button"],
    },
  },
  args: {
    "aria-label": "Actions",
    isDisabled: false,
    defaultOpen: false,
    placement: "bottom start",
    triggerType: "area",
  },
  render: ({
    triggerType,
    placement,
    "aria-label": ariaLabel,
    isDisabled,
    defaultOpen,
  }) => (
    <ContextMenu
      aria-label={ariaLabel}
      isDisabled={isDisabled}
      defaultOpen={defaultOpen}
      style={
        triggerType === "area"
          ? {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 256,
              height: 128,
              border: "1px dashed #888",
              borderRadius: 8,
              color: "#666",
              fontSize: 14,
            }
          : undefined
      }
    >
      {triggerType === "area" ? (
        "Right click me"
      ) : (
        <Button variant="quiet">Right click the button area</Button>
      )}
      <MenuContent placement={placement}>
        <MenuItem id="edit">Edit</MenuItem>
        <MenuItem id="duplicate">Duplicate</MenuItem>
        <MenuItem id="delete" variant="danger">
          Delete
        </MenuItem>
      </MenuContent>
    </ContextMenu>
  ),
} satisfies Meta<ContextMenuStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithButtonTrigger: Story = {
  args: {
    triggerType: "button",
  },
};
