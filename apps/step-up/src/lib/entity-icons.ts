import type { IconName } from "@dev-ui/icons";

export const ENTITY_ICONS = {
  student: "users",
  trainer: "circle-user",
  batch: "layout-grid",
} as const satisfies Record<string, IconName>;

export type EntityKind = keyof typeof ENTITY_ICONS;

export function entityIcon(kind: EntityKind): IconName {
  return ENTITY_ICONS[kind];
}
