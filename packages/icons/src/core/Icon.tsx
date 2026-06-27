"use client";

import type { IconName } from "../generated/icon-names";
import { useIcons } from "./IconProvider";
import type { IconProps } from "./types";

export function Icon({
  name,
  fallback = null,
  ...props
}: IconProps): React.ReactNode {
  const { getIcon } = useIcons();
  const IconComponent = getIcon(name);

  if (!IconComponent) {
    return fallback;
  }

  return (
    <IconComponent aria-hidden={props["aria-hidden"] ?? true} {...props} />
  );
}

export type { IconName };
