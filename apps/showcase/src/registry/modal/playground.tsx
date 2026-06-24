import { Button } from "@dev-ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Modal } from "@dev-ui/components/modal";

type ModalPlaygroundProps = {
  defaultOpen?: boolean;
  isDismissable?: boolean;
  showCloseButton?: boolean;
  title?: string;
  description?: string;
  body?: string;
};

export default function ModalPlayground({
  defaultOpen = true,
  isDismissable = true,
  showCloseButton = true,
  title = "Modal panel",
  description = "Modal provides the backdrop, viewport, and panel shell.",
  body = "Compose with Dialog subcomponents for content layout.",
}: ModalPlaygroundProps = {}) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <Button>Open modal</Button>
      <Modal isDismissable={isDismissable}>
        <DialogContent showCloseButton={showCloseButton}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p>{body}</p>
          </DialogBody>
        </DialogContent>
      </Modal>
    </Dialog>
  );
}
