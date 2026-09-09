import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";

type ToggleButtonGroupPlaygroundProps = {
  selectionMode?: "single" | "multiple";
  defaultSelectedKeys?: string[];
  variant?: "default" | "primary" | "quiet" | "segmented";
  size?: "xs" | "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
  disallowEmptySelection?: boolean;
};

export default function ToggleButtonGroupPlayground({
  selectionMode = "single",
  defaultSelectedKeys = ["bold"],
  variant = "default",
  size = "md",
  orientation = "horizontal",
  isDisabled = false,
  disallowEmptySelection = false,
}: ToggleButtonGroupPlaygroundProps = {}) {
  return (
    <ToggleButtonGroup
      selectionMode={selectionMode}
      defaultSelectedKeys={defaultSelectedKeys}
      variant={variant}
      size={size}
      orientation={orientation}
      isDisabled={isDisabled}
      disallowEmptySelection={disallowEmptySelection}
    >
      <ToggleButton id="bold">Bold</ToggleButton>
      <ToggleButton id="italic">Italic</ToggleButton>
      <ToggleButton id="underline">Underline</ToggleButton>
    </ToggleButtonGroup>
  );
}
