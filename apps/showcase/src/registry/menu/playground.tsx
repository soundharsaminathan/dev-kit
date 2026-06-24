import { Button } from "@dev-ui/components/button";
import { Menu, MenuContent, MenuItem } from "@dev-ui/components/menu";

type MenuPlaygroundProps = {
  triggerLabel?: string;
  placement?:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "bottom start"
    | "bottom end";
  showDangerItem?: boolean;
};

export default function MenuPlayground({
  triggerLabel = "Actions",
  placement = "bottom start",
  showDangerItem = true,
}: MenuPlaygroundProps = {}) {
  return (
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
  );
}
