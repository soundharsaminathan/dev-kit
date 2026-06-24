import { Button } from "@dev-ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Modal } from "@dev-ui/components/modal";

type DialogPlaygroundProps = {
  defaultOpen?: boolean;
  title?: string;
  description?: string;
  bodyText?: string;
  showCloseButton?: boolean;
  showFooter?: boolean;
};

export default function DialogPlayground({
  defaultOpen = false,
  title = "Edit profile",
  description = "Make changes to your profile here. Click save when you are done.",
  bodyText = "Dialog body content goes here.",
  showCloseButton = true,
  showFooter = true,
}: DialogPlaygroundProps = {}) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <Button>Open dialog</Button>
      <Modal>
        <DialogContent showCloseButton={showCloseButton}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p>{bodyText}</p>
          </DialogBody>
          {showFooter ? (
            <DialogFooter>
              <Button variant="quiet">Cancel</Button>
              <Button variant="primary">Save changes</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Modal>
    </Dialog>
  );
}
