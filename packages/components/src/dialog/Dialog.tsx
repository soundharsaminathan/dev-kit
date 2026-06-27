import { cn, composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { useButton } from "@react-aria/button";
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

const OVERLAY_SHELL_DISPLAY_NAMES = new Set(["Modal"]);

function isOverlayShell(child: ReactElement): boolean {
  const type = child.type as { displayName?: string };
  return OVERLAY_SHELL_DISPLAY_NAMES.has(type.displayName ?? "");
}

type DialogTriggerTargetProps = {
  triggerChild: ReactElement;
  triggerProps: ReturnType<typeof useOverlayTrigger>["triggerProps"];
  triggerRef: React.RefObject<Element | null>;
};

function isNativeTriggerElement(
  type: unknown,
): type is "button" | "input" | "a" {
  return type === "button" || type === "input" || type === "a";
}

function DialogNativeTrigger({
  triggerChild,
  triggerProps,
  triggerRef,
}: DialogTriggerTargetProps) {
  const childRef = useRef<HTMLButtonElement>(null);
  const childProps = triggerChild.props as Record<string, unknown> & {
    ref?: React.Ref<Element>;
  };
  const { buttonProps } = useButton(
    mergeProps(triggerProps, childProps, {
      elementType: triggerChild.type as "button" | "input" | "a",
    }) as Parameters<typeof useButton>[0],
    childRef,
  );

  return cloneElement(
    triggerChild as ReactElement<Record<string, unknown>>,
    mergeProps(buttonProps as Record<string, unknown>, {
      ref: composeRefs(childRef, triggerRef, childProps.ref),
    }),
  );
}

function DialogCompositeTrigger({
  triggerChild,
  triggerProps,
  triggerRef,
}: DialogTriggerTargetProps) {
  const childProps = triggerChild.props as Record<string, unknown> & {
    ref?: React.Ref<Element>;
  };

  return cloneElement(
    triggerChild as ReactElement<Record<string, unknown>>,
    mergeProps(childProps, triggerProps, {
      ref: composeRefs(triggerRef, childProps.ref),
    }),
  );
}

function DialogTriggerTarget(props: DialogTriggerTargetProps) {
  if (isNativeTriggerElement(props.triggerChild.type)) {
    return <DialogNativeTrigger {...props} />;
  }
  return <DialogCompositeTrigger {...props} />;
}

function renderDialogChildren(
  children: ReactNode,
  triggerProps: ReturnType<typeof useOverlayTrigger>["triggerProps"],
  triggerRef: React.RefObject<Element | null>,
) {
  let triggerWired = false;

  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    if (isOverlayShell(child)) {
      return child;
    }

    if (triggerWired) {
      return child;
    }

    triggerWired = true;

    return (
      <DialogTriggerTarget
        key={child.key}
        triggerChild={child}
        triggerProps={triggerProps}
        triggerRef={triggerRef}
      />
    );
  });
}

function Dialog({ children, className, ...props }: DialogProps) {
  const triggerRef = useRef<Element>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const titlePropsRef = useRef<HTMLAttributes<HTMLElement>>({});
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
      titleId,
      titlePropsRef,
      descriptionId,
      setDescriptionId,
    }),
    [overlayState, triggerProps, titleId, descriptionId],
  );

  return (
    <DialogContext.Provider value={contextValue}>
      <div data-dialog="" className={className}>
        {children
          ? renderDialogChildren(children, triggerProps, triggerRef)
          : null}
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
  const { overlayState, descriptionId, titleId, titlePropsRef } =
    useDialogContext("DialogContent");

  const resolvedDialogProps = {
    ...props,
    "aria-labelledby": titleId,
    ...(descriptionId ? { "aria-describedby": descriptionId } : {}),
  };

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
          <Icon name="x" />
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
  const { titleId, titlePropsRef } = useDialogContext("DialogTitle");

  return (
    <h2
      id={titleId}
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
