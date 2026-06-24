import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";

type ToggleButtonGroupPlaygroundProps = {
  selectionMode?: "single" | "multiple";
  defaultSelectedKeys?: string[];
  variant?: "default" | "primary" | "quiet";
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
      orientation={orientation}
      isDisabled={isDisabled}
      disallowEmptySelection={disallowEmptySelection}
    >
      <ToggleButton id="bold" variant={variant} size={size}>
        Bold
      </ToggleButton>
      <ToggleButton id="italic" variant={variant} size={size}>
        Italic
      </ToggleButton>
      <ToggleButton id="underline" variant={variant} size={size}>
        Underline
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
