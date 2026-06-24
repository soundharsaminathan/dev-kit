import { Button } from "@dev-ui/components/button";
import { Toolbar } from "@dev-ui/components/toolbar";

type ToolbarPlaygroundProps = {
  "aria-label"?: string;
  orientation?: "horizontal" | "vertical";
};

export default function ToolbarPlayground({
  "aria-label": ariaLabel = "Formatting",
  orientation = "horizontal",
}: ToolbarPlaygroundProps = {}) {
  return (
    <Toolbar aria-label={ariaLabel} orientation={orientation}>
      <Button variant="quiet">Bold</Button>
      <Button variant="quiet">Italic</Button>
      <Button variant="quiet">Underline</Button>
    </Toolbar>
  );
}
