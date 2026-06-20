import { composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { useLink } from "@react-aria/link";
import { mergeProps } from "@react-aria/utils";
import { useRef } from "react";
import styles from "./link.module.scss";
import type { LinkProps, LinkVariant } from "./link.types";

function Link({
  ref,
  variant = "accent",
  isDisabled,
  children,
  ...props
}: LinkProps) {
  const domRef = useRef<HTMLAnchorElement>(null);
  const disabled = Boolean(isDisabled);

  const { linkProps, isPressed } = useLink(
    {
      ...props,
      isDisabled: disabled,
    } as Parameters<typeof useLink>[0],
    domRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <a
      {...mergeProps(linkProps, hoverProps, focusProps)}
      ref={composeRefs(domRef, ref)}
      className={styles.root}
      data-variant={variant}
      data-disabled={disabled ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-pressed={isPressed ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
    >
      {children}
    </a>
  );
}

export type { LinkProps, LinkVariant };
export { Link };
