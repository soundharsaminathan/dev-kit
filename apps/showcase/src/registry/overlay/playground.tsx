import { Button } from "@dev-ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Overlay } from "@dev-ui/components/overlay";

type OverlayPlaygroundProps = {
  defaultOpen?: boolean;
  type?: "modal" | "popover" | "drawer";
  mobileType?: "modal" | "popover" | "drawer" | null;
  title?: string;
  description?: string;
  body?: string;
};

export default function OverlayPlayground({
  defaultOpen = false,
  type = "modal",
  mobileType = "drawer",
  title = "Overlay title",
  description = "This overlay adapts based on screen size.",
  body = "Overlay content goes here.",
}: OverlayPlaygroundProps = {}) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <Button>Open overlay</Button>
      <Overlay type={type} mobileType={mobileType}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p>{body}</p>
          </DialogBody>
        </DialogContent>
      </Overlay>
    </Dialog>
  );
}
