import { cn } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { useButton } from "@react-aria/button";
import { mergeProps } from "@react-aria/utils";
import {
  type ChangeEvent,
  cloneElement,
  isValidElement,
  type ReactElement,
  useCallback,
  useRef,
  useState,
} from "react";
import styles from "./file-trigger.module.scss";
import type { FileTriggerProps } from "./file-trigger.types";

function isNativeTriggerElement(child: ReactElement): boolean {
  return typeof child.type === "string";
}

function FileTriggerClear({
  label,
  isDisabled,
  onClear,
}: {
  label: string;
  isDisabled: boolean;
  onClear: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    {
      onPress: onClear,
      isDisabled,
      "aria-label": label,
    },
    buttonRef,
  );

  return (
    <button
      {...buttonProps}
      ref={buttonRef}
      type="button"
      data-file-trigger-clear=""
      className={styles.clear}
    >
      <Icon name="x" />
    </button>
  );
}

function FileTrigger({
  children,
  className,
  onSelect,
  accept,
  allowsMultiple,
  isDisabled,
  allowsClearing = false,
  clearLabel = "Clear selection",
}: FileTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const openFileDialog = useCallback(() => {
    if (isDisabled) {
      return;
    }
    inputRef.current?.click();
  }, [isDisabled]);

  const clearSelection = useCallback(() => {
    if (isDisabled) {
      return;
    }
    setHasSelection(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onSelect?.(null);
  }, [isDisabled, onSelect]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      setHasSelection(Boolean(files?.length));
      onSelect?.(files);
      event.target.value = "";
    },
    [onSelect],
  );

  if (!isValidElement(children)) {
    throw new Error("FileTrigger expects a single React element child.");
  }

  const triggerChild = children as ReactElement<Record<string, unknown>>;
  const openProps = isNativeTriggerElement(triggerChild)
    ? { onClick: openFileDialog }
    : { onPress: openFileDialog };

  const renderedTrigger = cloneElement(
    triggerChild,
    mergeProps(
      triggerChild.props as Record<string, unknown>,
      openProps,
      {
        "data-selected": hasSelection ? "true" : undefined,
      },
      isDisabled ? { isDisabled: true } : {},
      {
        ref: (
          triggerChild.props as {
            ref?: React.Ref<HTMLElement>;
          }
        ).ref,
      },
    ),
  );

  const showClear = allowsClearing && hasSelection;

  return (
    <span data-file-trigger="" className={cn(styles.root, className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={allowsMultiple}
        disabled={isDisabled}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      {renderedTrigger}
      {showClear ? (
        <FileTriggerClear
          label={clearLabel}
          isDisabled={Boolean(isDisabled)}
          onClear={clearSelection}
        />
      ) : null}
    </span>
  );
}

export type { FileTriggerProps } from "./file-trigger.types";
export { FileTrigger };
