import { ToggleButton } from "@dev-ui/components/toggle-button";

type ToggleButtonPlaygroundProps = {
  children?: string;
  variant?: "default" | "primary" | "quiet";
  size?: "xs" | "sm" | "md" | "lg";
  defaultSelected?: boolean;
  isDisabled?: boolean;
};

export default function ToggleButtonPlayground({
  children = "Bold",
  variant = "default",
  size = "md",
  defaultSelected = false,
  isDisabled = false,
}: ToggleButtonPlaygroundProps = {}) {
  return (
    <ToggleButton
      variant={variant}
      size={size}
      defaultSelected={defaultSelected}
      isDisabled={isDisabled}
    >
      {children}
    </ToggleButton>
  );
}
