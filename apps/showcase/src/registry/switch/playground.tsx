import { Switch, type SwitchProps } from "@dev-ui/components/switch";

export default function SwitchPlayground({
  children = "Notifications",
  size = "md",
  defaultSelected = false,
  isDisabled = false,
}: SwitchProps = {}) {
  return (
    <Switch
      size={size}
      defaultSelected={defaultSelected}
      isDisabled={isDisabled}
    >
      {children}
    </Switch>
  );
}
