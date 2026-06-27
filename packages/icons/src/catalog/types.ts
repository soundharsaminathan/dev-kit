import type { ComponentType, SVGProps } from "react";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type IconCatalogEntry = Partial<Record<string, string>>;

export type IconCatalog = Record<string, IconCatalogEntry>;

export interface PackLibraryConfig {
  id: string;
  label: string;
  packageName: string;
  importPath: string;
  phosphorWeight?: "regular" | "fill" | "duotone";
  materialSymbols?: "outlined" | "rounded" | "sharp";
}
