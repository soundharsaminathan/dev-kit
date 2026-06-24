import { Checkbox, type CheckboxProps } from "@dev-ui/components/checkbox";

export default function CheckboxPlayground({
  children = "Accept terms",
  defaultSelected = false,
  isIndeterminate = false,
  isDisabled = false,
  isInvalid = false,
}: CheckboxProps = {}) {
  return (
    <Checkbox
      defaultSelected={defaultSelected}
      isIndeterminate={isIndeterminate}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
    >
      {children}
    </Checkbox>
  );
}
