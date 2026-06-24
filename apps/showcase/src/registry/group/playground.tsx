import { Button } from "@dev-ui/components/button";
import { Group, GroupText } from "@dev-ui/components/group";

type GroupPlaygroundProps = {
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
  isInvalid?: boolean;
  showPrefixText?: boolean;
  prefixText?: string;
};

export default function GroupPlayground({
  orientation = "horizontal",
  isDisabled = false,
  isInvalid = false,
  showPrefixText = false,
  prefixText = "Prefix",
}: GroupPlaygroundProps = {}) {
  return (
    <Group
      orientation={orientation}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
    >
      {showPrefixText ? <GroupText>{prefixText}</GroupText> : null}
      <Button>One</Button>
      <Button>Two</Button>
      {orientation === "horizontal" ? <Button>Three</Button> : null}
    </Group>
  );
}
