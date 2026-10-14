import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Modal } from "@dev-ui/components/modal";
import { TouchButton } from "@/modules/ui/touch-button";

type UnsavedChangesDialogProps = {
  isOpen: boolean;
  onStay: () => void;
  onDiscard: () => void;
};

export function UnsavedChangesDialog({
  isOpen,
  onStay,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onStay();
      }}
    >
      <Modal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have changes that haven't been saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <TouchButton variant="quiet" size="sm" onClick={onStay}>
              Stay
            </TouchButton>
            <TouchButton size="sm" onClick={onDiscard}>
              Discard changes
            </TouchButton>
          </DialogFooter>
        </DialogContent>
      </Modal>
    </Dialog>
  );
}
