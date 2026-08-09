import { cn, composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { OverlayContainer } from "@react-aria/overlays";
import { HiddenSelect, useSelect } from "@react-aria/select";
import { mergeProps } from "@react-aria/utils";
import { useSelectState } from "@react-stately/select";
import {
  Children,
  cloneElement,
  createContext,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Button } from "../button/Button";
import { Field } from "../field/Field";
import { useFieldContext } from "../field/field-context";
import {
  type CollectionItem,
  findChildByDisplayName,
  getCollectionChild,
  parseCollectionItems,
} from "../list-box/collection-utils";
import { ListBoxWithState } from "../list-box/ListBox";
import { Popover, PopoverProvider } from "../popover/Popover";
import styles from "./select.module.scss";
import type {
  SelectContentProps,
  SelectContextValue,
  SelectProps,
  SelectTriggerProps,
  SelectValueProps,
} from "./select.types";

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(component: string): SelectContextValue {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error(`${component} must be used within Select`);
  }
  return context;
}

function getLabelText(children: ReactNode): string | undefined {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return undefined;
}

function renderSelectChildren(
  children: ReactNode,
  labelProps: React.HTMLAttributes<HTMLElement>,
  hasLabelProp: boolean,
) {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    const type = child.type as { displayName?: string };
    if (!hasLabelProp && type.displayName === "Label") {
      return cloneElement(
        child,
        mergeProps(labelProps, child.props as HTMLAttributes<HTMLElement>),
      );
    }

    return child;
  });
}

function Select<T extends CollectionItem>({
  children,
  items: itemsProp,
  placeholder,
  className,
  isDisabled,
  ...props
}: SelectProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const parentField = useFieldContext();
  const labelChild = findChildByDisplayName(children, "Label");
  const labelFromChild = labelChild
    ? getLabelText((labelChild.props as { children?: ReactNode }).children)
    : undefined;
  const labelFromParentField = parentField?.labelTextRef.current;
  const hasExplicitLabel =
    props.label !== undefined ||
    labelFromChild !== undefined ||
    typeof props["aria-label"] === "string";
  const hasParentFieldLabel =
    !hasExplicitLabel &&
    labelFromParentField !== undefined &&
    parentField?.labelId !== undefined;
  const resolvedLabel =
    props.label ??
    labelFromChild ??
    (typeof props["aria-label"] === "string"
      ? props["aria-label"]
      : undefined) ??
    labelFromParentField;
  const selectAriaProps = {
    ...props,
    ...(hasParentFieldLabel
      ? { "aria-labelledby": parentField.labelId }
      : resolvedLabel
        ? { label: resolvedLabel }
        : {}),
  };
  const contentChild = findChildByDisplayName(children, "SelectContent");
  const itemsList = useMemo((): CollectionItem[] => {
    if (itemsProp) {
      return [...itemsProp];
    }
    if (contentChild) {
      return parseCollectionItems(
        (contentChild.props as { children?: ReactNode }).children,
      );
    }
    return [];
  }, [itemsProp, contentChild]);

  const disabledKeys = useMemo(
    () =>
      new Set(
        itemsList.filter((item) => item.isDisabled).map((item) => item.id),
      ),
    [itemsList],
  );

  const selectStateProps = {
    ...props,
    items: itemsList as Iterable<T>,
    disabledKeys,
    children: getCollectionChild,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  };

  const state = useSelectState(selectStateProps);

  const {
    labelProps,
    triggerProps,
    valueProps,
    menuProps,
    descriptionProps,
    errorMessageProps,
  } = useSelect(selectAriaProps, state, triggerRef);

  const contextValue = useMemo(
    () => ({
      state,
      triggerRef,
      triggerProps,
      valueProps,
      menuProps,
      labelProps,
      placeholder,
      isDisabled: Boolean(isDisabled),
    }),
    [
      state,
      triggerProps,
      valueProps,
      menuProps,
      labelProps,
      placeholder,
      isDisabled,
    ],
  );

  return (
    <SelectContext.Provider value={contextValue as SelectContextValue}>
      <PopoverProvider
        value={{
          triggerRef,
          state,
        }}
      >
        <Field
          data-select=""
          data-slot="select"
          className={cn(styles.root, className)}
        >
          {props.label ? <span {...labelProps}>{props.label}</span> : null}
          {props.description ? (
            <span {...descriptionProps}>{props.description}</span>
          ) : null}
          {renderSelectChildren(children, labelProps, Boolean(props.label))}
          {typeof props.errorMessage ===
          "function" ? null : props.errorMessage ? (
            <div {...errorMessageProps}>{props.errorMessage}</div>
          ) : null}
          <HiddenSelect
            state={state}
            triggerRef={triggerRef}
            {...(hasParentFieldLabel
              ? { "aria-labelledby": parentField.labelId }
              : labelFromChild && labelProps.id
                ? { "aria-labelledby": String(labelProps.id) }
                : resolvedLabel
                  ? { label: resolvedLabel }
                  : {})}
            {...(props.name ? { name: props.name } : {})}
            {...(isDisabled !== undefined ? { isDisabled } : {})}
          />
        </Field>
      </PopoverProvider>
    </SelectContext.Provider>
  );
}

function SelectTrigger({
  className,
  children,
  isDisabled: isDisabledProp,
  ...props
}: SelectTriggerProps) {
  const { triggerRef, triggerProps, isDisabled } =
    useSelectContext("SelectTrigger");

  return (
    <Button
      {...mergeProps(triggerProps, props)}
      ref={composeRefs(triggerRef, props.ref)}
      variant="default"
      isDisabled={isDisabledProp ?? isDisabled}
      data-select-trigger=""
      className={cn(styles.trigger, className)}
    >
      {children ?? (
        <>
          <SelectValue />
          <Icon name="chevron-down" className={styles.chevron} />
        </>
      )}
    </Button>
  );
}
SelectTrigger.displayName = "SelectTrigger";

function SelectValue({
  className,
  placeholder: placeholderProp,
}: SelectValueProps) {
  const { state, valueProps, placeholder } = useSelectContext("SelectValue");
  const selectedText = state.selectedItems[0]?.textValue ?? null;
  const resolvedPlaceholder = placeholderProp ?? placeholder;
  const isPlaceholder = !selectedText;

  return (
    <span
      {...valueProps}
      data-slot="select-value"
      data-placeholder={isPlaceholder ? "true" : undefined}
      className={cn(styles.value, className)}
    >
      {selectedText ?? resolvedPlaceholder}
    </span>
  );
}
SelectValue.displayName = "SelectValue";

function SelectContent<T extends CollectionItem>({
  className,
  placement,
  selectionMode,
  ...props
}: SelectContentProps<T>) {
  const { state, menuProps } = useSelectContext("SelectContent");
  const resolvedSelectionMode =
    selectionMode ?? state.selectionManager.selectionMode;

  const listBox = (
    <ListBoxWithState
      state={state}
      listBoxOptions={{
        ...props,
        ...menuProps,
        selectionMode: resolvedSelectionMode,
      }}
      className={cn(styles.list, className)}
    />
  );

  if (!state.isOpen) {
    return null;
  }

  return (
    <OverlayContainer>
      <Popover placement={placement}>{listBox}</Popover>
    </OverlayContainer>
  );
}
SelectContent.displayName = "SelectContent";

export {
  ListBoxItem as SelectItem,
  ListBoxItemDescription as SelectItemDescription,
  ListBoxItemLabel as SelectItemLabel,
  ListBoxSection as SelectSection,
  ListBoxSectionHeader as SelectSectionHeader,
} from "../list-box/ListBox";
export type {
  SelectContentProps,
  SelectProps,
  SelectTriggerProps,
  SelectValueProps,
} from "./select.types";
export { Select, SelectContent, SelectTrigger, SelectValue };
