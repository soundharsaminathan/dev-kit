import { cn, composeRefs } from "@dev-ui/core";
import { useDialog } from "@react-aria/dialog";
import { useOverlayTrigger } from "@react-aria/overlays";
import { mergeProps } from "@react-aria/utils";
import { useOverlayTriggerState } from "@react-stately/overlays";
import {
  Children,
  cloneElement,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../button/Button";
import { findChildByDisplayName } from "../list-box/collection-utils";
import styles from "./dialog.module.scss";
import type {
  DialogBodyProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogFooterProps,
  DialogHeaderProps,
  DialogInsetProps,
  DialogProps,
  DialogTitleProps,
} from "./dialog.types";
import { DialogContext, useDialogContext } from "./dialog-context";

function getTriggerChild(children: ReactNode, contentDisplayName: string) {
  let found: ReactElement | null = null;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) {
      return;
    }
    const type = child.type as { displayName?: string };
    if (type.displayName !== contentDisplayName) {
      found = child as ReactElement;
    }
  });
  return found;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dialog({ children, className, ...props }: DialogProps) {
  const triggerRef = useRef<Element>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titlePropsRef = useRef<HTMLAttributes<HTMLElement>>({});
  const modalChild = findChildByDisplayName(children, "Modal");
  const overlayState = useOverlayTriggerState(props);
  const { triggerProps } = useOverlayTrigger(
    { type: "dialog" },
    overlayState,
    triggerRef,
  );
  const [descriptionId, setDescriptionId] = useState<string | undefined>();

  const contextValue = useMemo(
    () => ({
      overlayState,
      triggerRef,
      overlayTriggerProps: triggerProps,
      panelRef,
      titlePropsRef,
      descriptionId,
      setDescriptionId,
    }),
    [overlayState, triggerProps, descriptionId],
  );

  const triggerChild = getTriggerChild(children, "Modal");

  const renderedTrigger = triggerChild
    ? cloneElement(
        triggerChild as ReactElement<Record<string, unknown>>,
        mergeProps(
          (triggerChild as ReactElement).props as Record<string, unknown>,
          triggerProps,
          {
            ref: composeRefs(
              triggerRef,
              (
                (triggerChild as ReactElement).props as {
                  ref?: React.Ref<Element>;
                }
              ).ref,
            ),
          },
        ),
      )
    : null;

  return (
    <DialogContext.Provider value={contextValue}>
      <div data-dialog="" className={className}>
        {renderedTrigger}
        {modalChild}
      </div>
    </DialogContext.Provider>
  );
}

function DialogContent({
  children,
  className,
  showCloseButton = false,
  ...props
}: DialogContentProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { overlayState, descriptionId, titlePropsRef } =
    useDialogContext("DialogContent");

  const resolvedDialogProps = descriptionId
    ? { ...props, "aria-describedby": descriptionId }
    : props;

  const { dialogProps, titleProps } = useDialog(resolvedDialogProps, dialogRef);

  titlePropsRef.current = titleProps;

  return (
    <div
      {...dialogProps}
      ref={dialogRef}
      data-dialog-content=""
      className={cn(styles.content, className)}
    >
      {children}
      {showCloseButton ? (
        <Button
          variant="quiet"
          size="sm"
          isIconOnly
          aria-label="Close"
          className={styles.closeButton}
          onClick={() => overlayState.close()}
        >
          <CloseIcon />
        </Button>
      ) : null}
    </div>
  );
}
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <header
      data-dialog-header=""
      className={cn(styles.header, className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogTitleProps) {
  const { titlePropsRef } = useDialogContext("DialogTitle");

  return (
    <h2
      {...mergeProps(titlePropsRef.current, props)}
      data-dialog-title=""
      className={cn(styles.title, className)}
    />
  );
}

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  const id = useId();
  const { setDescriptionId } = useDialogContext("DialogDescription");

  useLayoutEffect(() => {
    setDescriptionId(id);
    return () => {
      setDescriptionId(undefined);
    };
  }, [id, setDescriptionId]);

  return (
    <p
      id={id}
      data-dialog-description=""
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

function DialogBody({
  className,
  scrollFade: _scrollFade,
  ...props
}: DialogBodyProps) {
  return (
    <div
      data-dialog-body=""
      className={cn(styles.body, className)}
      {...props}
    />
  );
}

function DialogInset({ className, ...props }: DialogInsetProps) {
  return (
    <div
      data-dialog-inset=""
      className={cn(styles.inset, className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <footer
      data-dialog-footer=""
      className={cn(styles.footer, className)}
      {...props}
    />
  );
}

export type {
  DialogBodyProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogFooterProps,
  DialogHeaderProps,
  DialogInsetProps,
  DialogProps,
  DialogTitleProps,
} from "./dialog.types";
export {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogInset,
  DialogTitle,
};
