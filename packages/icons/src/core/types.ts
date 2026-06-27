import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { IconName } from "../generated/icon-names";
import type { GeneratedPackId } from "../generated/pack-ids";

export type IconRenderProps = {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  "aria-hidden"?: boolean | undefined;
  role?: string | undefined;
  "aria-label"?: string | undefined;
};

export type IconComponent = ComponentType<IconRenderProps>;

export type IconPackModule = {
  id: GeneratedPackId | string;
  icons: Partial<Record<IconName, IconComponent>>;
};

export type IconTheme = {
  library: string;
  variant?: string | undefined;
};

export type IconPackId = GeneratedPackId | string;

export type IconProps = IconRenderProps & {
  name: IconName;
  fallback?: ReactNode;
};

export type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  name: IconName;
  label: string;
};

export interface IconContextValue {
  packId: IconPackId;
  theme: IconTheme;
  pack: IconPackModule | null;
  isLoading: boolean;
  setTheme: (theme: IconTheme) => void;
  getIcon: (name: IconName) => IconComponent | null;
}

export function resolvePackId(theme: IconTheme): IconPackId {
  if (theme.variant) {
    return `${theme.library}-${theme.variant}`;
  }
  return theme.library;
}

export function resolveIconTheme(packId: IconPackId): IconTheme {
  const knownSuffixes = [
    "-outlined",
    "-rounded",
    "-sharp",
    "-outline",
    "-filled",
    "-solid",
    "-regular",
    "-fill",
    "-duotone",
  ] as const;

  for (const suffix of knownSuffixes) {
    if (packId.endsWith(suffix)) {
      return {
        library: packId.slice(0, -suffix.length),
        variant: suffix.slice(1),
      };
    }
  }

  return { library: packId };
}
