import type { PackLibraryConfig } from "./types";

export const packLibraries = [
  {
    id: "lucide",
    label: "Lucide",
    packageName: "lucide-react",
    importPath: "lucide-react",
  },
  {
    id: "heroicons-outline",
    label: "Heroicons Outline",
    packageName: "@heroicons/react",
    importPath: "@heroicons/react/24/outline",
  },
  {
    id: "heroicons-solid",
    label: "Heroicons Solid",
    packageName: "@heroicons/react",
    importPath: "@heroicons/react/24/solid",
  },
  {
    id: "phosphor-regular",
    label: "Phosphor Regular",
    packageName: "@phosphor-icons/react",
    importPath: "@phosphor-icons/react",
    phosphorWeight: "regular",
  },
  {
    id: "phosphor-fill",
    label: "Phosphor Fill",
    packageName: "@phosphor-icons/react",
    importPath: "@phosphor-icons/react",
    phosphorWeight: "fill",
  },
  {
    id: "phosphor-duotone",
    label: "Phosphor Duotone",
    packageName: "@phosphor-icons/react",
    importPath: "@phosphor-icons/react",
    phosphorWeight: "duotone",
  },
  {
    id: "tabler-outline",
    label: "Tabler Outline",
    packageName: "@tabler/icons-react",
    importPath: "@tabler/icons-react",
  },
  {
    id: "tabler-filled",
    label: "Tabler Filled",
    packageName: "@tabler/icons-react",
    importPath: "@tabler/icons-react",
  },
  {
    id: "fluent-outline",
    label: "Fluent Outline",
    packageName: "@fluentui/react-icons",
    importPath: "@fluentui/react-icons",
  },
  {
    id: "fluent-filled",
    label: "Fluent Filled",
    packageName: "@fluentui/react-icons",
    importPath: "@fluentui/react-icons",
  },
  {
    id: "material-symbols-outlined",
    label: "Material Symbols Outlined",
    packageName: "material-symbols",
    importPath: "material-symbols",
    materialSymbols: "outlined",
  },
  {
    id: "material-symbols-rounded",
    label: "Material Symbols Rounded",
    packageName: "material-symbols",
    importPath: "material-symbols",
    materialSymbols: "rounded",
  },
  {
    id: "material-symbols-sharp",
    label: "Material Symbols Sharp",
    packageName: "material-symbols",
    importPath: "material-symbols",
    materialSymbols: "sharp",
  },
] as const satisfies readonly PackLibraryConfig[];

export type PackId = (typeof packLibraries)[number]["id"];
