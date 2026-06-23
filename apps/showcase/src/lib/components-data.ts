import { getRegistryEntry } from "@/registry";

export interface ComponentInfo {
  name: string;
  slug: string;
  scale?: number;
}

export interface ComponentCategory {
  title: string;
  slug: string;
  components: ComponentInfo[];
}

function toDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const componentCategories: ComponentCategory[] = [
  {
    title: "Buttons",
    slug: "buttons",
    components: [
      { slug: "button", name: "Button" },
      { slug: "toggle-button", name: "Toggle Button" },
      { slug: "toggle-button-group", name: "Toggle Button Group" },
      { slug: "file-trigger", name: "File Trigger" },
      { slug: "group", name: "Group" },
    ],
  },
  {
    title: "Typography & display",
    slug: "typography",
    components: [
      { slug: "text", name: "Text" },
      { slug: "heading", name: "Heading" },
      { slug: "link", name: "Link" },
      { slug: "separator", name: "Separator" },
      { slug: "badge", name: "Badge" },
      { slug: "kbd", name: "Kbd" },
      { slug: "loader", name: "Loader" },
      { slug: "skeleton", name: "Skeleton" },
      { slug: "avatar", name: "Avatar" },
      { slug: "progress-bar", name: "Progress Bar" },
    ],
  },
  {
    title: "Layout & structure",
    slug: "layout",
    components: [
      { slug: "card", name: "Card" },
      { slug: "alert", name: "Alert" },
      { slug: "empty", name: "Empty" },
      { slug: "scroll-fade", name: "Scroll Fade" },
      { slug: "sidebar", name: "Sidebar" },
      { slug: "overlay", name: "Overlay" },
      { slug: "table", name: "Table" },
      { slug: "tree", name: "Tree" },
    ],
  },
  {
    title: "Forms & inputs",
    slug: "forms",
    components: [
      { slug: "field", name: "Field" },
      { slug: "input", name: "Input" },
      { slug: "text-field", name: "Text Field" },
      { slug: "text-area", name: "Text Area" },
      { slug: "number-field", name: "Number Field" },
      { slug: "search-field", name: "Search Field" },
      { slug: "checkbox", name: "Checkbox" },
      { slug: "checkbox-group", name: "Checkbox Group" },
      { slug: "radio-group", name: "Radio Group" },
      { slug: "switch", name: "Switch" },
      { slug: "slider", name: "Slider" },
      { slug: "input-group", name: "Input Group" },
      { slug: "otp-field", name: "OTP Field" },
      { slug: "drop-zone", name: "Drop Zone" },
    ],
  },
  {
    title: "Pickers & overlays",
    slug: "overlays",
    components: [
      { slug: "select", name: "Select" },
      { slug: "combobox", name: "Combobox" },
      { slug: "list-box", name: "List Box" },
      { slug: "popover", name: "Popover" },
      { slug: "menu", name: "Menu" },
      { slug: "context-menu", name: "Context Menu" },
      { slug: "tooltip", name: "Tooltip" },
      { slug: "modal", name: "Modal" },
      { slug: "dialog", name: "Dialog" },
      { slug: "drawer", name: "Drawer" },
      { slug: "command", name: "Command" },
    ],
  },
  {
    title: "Navigation",
    slug: "navigation",
    components: [
      { slug: "tabs", name: "Tabs" },
      { slug: "disclosure", name: "Disclosure" },
      { slug: "accordion", name: "Accordion" },
      { slug: "breadcrumbs", name: "Breadcrumbs" },
      { slug: "pagination", name: "Pagination" },
    ],
  },
  {
    title: "Date & time",
    slug: "date-time",
    components: [
      { slug: "calendar", name: "Calendar" },
      { slug: "date-field", name: "Date Field" },
      { slug: "time-field", name: "Time Field" },
      { slug: "date-picker", name: "Date Picker" },
    ],
  },
  {
    title: "Color",
    slug: "color",
    components: [
      { slug: "color-thumb", name: "Color Thumb" },
      { slug: "color-swatch", name: "Color Swatch" },
      { slug: "color-area", name: "Color Area" },
      { slug: "color-slider", name: "Color Slider", scale: 1 },
      { slug: "color-field", name: "Color Field" },
      { slug: "color-swatch-picker", name: "Color Swatch Picker" },
      { slug: "color-picker", name: "Color Picker" },
      { slug: "color-editor", name: "Color Editor" },
    ],
  },
  {
    title: "Feedback",
    slug: "feedback",
    components: [
      { slug: "toast", name: "Toast" },
      { slug: "tag-group", name: "Tag Group" },
    ],
  },
];

export const allComponents = componentCategories.flatMap((category) =>
  category.components.map((component) => ({
    ...component,
    category: category.slug,
    categoryTitle: category.title,
    href: `/components/${component.slug}`,
    scale: component.scale ?? 0.9,
  })),
);

export function getComponentBySlug(slug: string) {
  return allComponents.find((component) => component.slug === slug);
}

export function getComponentNeighbors(slug: string) {
  const index = allComponents.findIndex((component) => component.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: allComponents[index - 1] ?? null,
    next: allComponents[index + 1] ?? null,
  };
}

export function getRegisteredSlugs(): string[] {
  return allComponents
    .map((component) => component.slug)
    .filter((slug) => getRegistryEntry(slug) != null);
}

export function slugToName(slug: string): string {
  const found = getComponentBySlug(slug);
  return found?.name ?? toDisplayName(slug);
}
