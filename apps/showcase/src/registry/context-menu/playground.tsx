import { Button } from "@dev-ui/components/button";
import { ContextMenu } from "@dev-ui/components/context-menu";
import { MenuContent, MenuItem } from "@dev-ui/components/menu";

type ContextMenuPlaygroundProps = {
  "aria-label"?: string;
  isDisabled?: boolean;
  defaultOpen?: boolean;
  placement?:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "bottom start"
    | "bottom end";
  triggerType?: "area" | "button";
};

export default function ContextMenuPlayground({
  triggerType = "area",
  placement = "bottom start",
  "aria-label": ariaLabel = "Actions",
  isDisabled = false,
  defaultOpen = false,
}: ContextMenuPlaygroundProps = {}) {
  return (
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
  );
}
