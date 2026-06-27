"use client";

import { Icon } from "./Icon";
import type { IconButtonProps } from "./types";

export function IconButton({
  name,
  label,
  type = "button",
  ...props
}: IconButtonProps): React.ReactNode {
  return (
    <button aria-label={label} type={type} {...props}>
      <Icon name={name} />
    </button>
  );
}
