/**
 * Generates registry config + playground stubs from Storybook stories.
 * Run: pnpm exec tsx apps/showcase/scripts/generate-registry.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const STORIES_DIR = path.resolve(ROOT, "../storybook/stories");
const REGISTRY_DIR = path.resolve(ROOT, "src/registry");

const SKIP_STORIES = new Set(["Themes.stories.tsx"]);
const EXISTING = new Set(["button", "select", "switch"]);

const CATEGORY_BY_SLUG: Record<string, string> = {
  button: "buttons",
  "toggle-button": "buttons",
  "toggle-button-group": "buttons",
  "file-trigger": "buttons",
  group: "buttons",
  text: "typography",
  heading: "typography",
  link: "typography",
  separator: "typography",
  badge: "typography",
  kbd: "typography",
  loader: "typography",
  skeleton: "typography",
  avatar: "typography",
  "progress-bar": "typography",
  meter: "typography",
  keyboard: "typography",
  card: "layout",
  alert: "layout",
  empty: "layout",
  "scroll-fade": "layout",
  sidebar: "layout",
  overlay: "layout",
  table: "layout",
  tree: "layout",
  "grid-list": "layout",
  virtualizer: "layout",
  field: "forms",
  form: "forms",
  input: "forms",
  "text-field": "forms",
  "text-area": "forms",
  "number-field": "forms",
  "search-field": "forms",
  checkbox: "forms",
  "checkbox-group": "forms",
  "radio-group": "forms",
  switch: "forms",
  slider: "forms",
  "input-group": "forms",
  "otp-field": "forms",
  "drop-zone": "forms",
  "drag-and-drop": "forms",
  select: "overlays",
  combobox: "overlays",
  "list-box": "overlays",
  popover: "overlays",
  menu: "overlays",
  "context-menu": "overlays",
  tooltip: "overlays",
  modal: "overlays",
  dialog: "overlays",
  drawer: "overlays",
  autocomplete: "overlays",
  "overlay-arrow": "overlays",
  tabs: "navigation",
  disclosure: "navigation",
  accordion: "navigation",
  breadcrumbs: "navigation",
  pagination: "navigation",
  toolbar: "navigation",
  calendar: "date-time",
  "date-field": "date-time",
  "time-field": "date-time",
  "date-picker": "date-time",
  "date-range-picker": "date-time",
  "color-thumb": "color",
  "color-swatch": "color",
  "color-area": "color",
  "color-slider": "color",
  "color-wheel": "color",
  "color-field": "color",
  "color-swatch-picker": "color",
  "color-picker": "color",
  "color-editor": "color",
  toast: "feedback",
  "tag-group": "feedback",
};

function pascalToSlug(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugToConfigName(slug: string): string {
  return slug.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

type ParsedControl =
  | { name: string; type: "boolean"; defaultValue?: boolean }
  | { name: string; type: "string"; defaultValue?: string }
  | { name: string; type: "number"; defaultValue?: number }
  | { name: string; type: "enum"; options: string[]; defaultValue?: string };

function parseArgTypes(source: string): ParsedControl[] {
  const argTypesMatch = source.match(/argTypes:\s*\{([\s\S]*?)\n\s*\},/);
  if (!argTypesMatch) return [];

  const block = argTypesMatch[1];
  const controls: ParsedControl[] = [];
  const entryRegex = /(\w+|"[^"]+"):\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null = entryRegex.exec(block);

  while (match) {
    const rawName = match[1];
    const name = rawName.replaceAll('"', "");
    const body = match[2];
    const controlMatch = body.match(/control:\s*"([^"]+)"/);
    const optionsMatch = body.match(/options:\s*\[([^\]]*)\]/);

    if (!controlMatch) {
      match = entryRegex.exec(block);
      continue;
    }

    const control = controlMatch[1];
    if (control === "boolean") {
      controls.push({ name, type: "boolean" });
    } else if (control === "text") {
      controls.push({ name, type: "string" });
    } else if (control === "number") {
      controls.push({ name, type: "number" });
    } else if (control === "select" && optionsMatch) {
      const options = optionsMatch[1]
        .split(",")
        .map((option) => option.trim().replaceAll(/['"]/g, ""))
        .filter(Boolean);
      controls.push({ name, type: "enum", options });
    }

    match = entryRegex.exec(block);
  }

  return controls;
}

function parseArgs(source: string): Record<string, unknown> {
  const argsMatch = source.match(/args:\s*\{([\s\S]*?)\n\s*\},/);
  if (!argsMatch) return {};

  const block = argsMatch[1];
  const args: Record<string, unknown> = {};
  const lineRegex = /^\s*([\w"-]+):\s*(.+?),?\s*$/gm;
  let match: RegExpExecArray | null = lineRegex.exec(block);

  while (match) {
    const name = match[1].replaceAll('"', "");
    const raw = match[2].trim();
    if (raw === "true" || raw === "false") {
      args[name] = raw === "true";
    } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
      args[name] = Number(raw);
    } else if (raw.startsWith('"') || raw.startsWith("'")) {
      args[name] = raw.slice(1, -1);
    }
    match = lineRegex.exec(block);
  }

  return args;
}

function parseComponentImport(source: string): {
  componentName: string;
  importPath: string;
} | null {
  const componentMatch = source.match(/component:\s*(\w+)/);
  if (!componentMatch) return null;
  const componentName = componentMatch[1];

  const importRegex = new RegExp(
    `import\\s*\\{[^}]*\\b${componentName}\\b[^}]*\\}\\s*from\\s*"([^"]+)"`,
  );
  const importMatch = source.match(importRegex);
  if (!importMatch) return null;

  return { componentName, importPath: importMatch[1] };
}

function parseTitle(source: string): string | null {
  const match = source.match(/title:\s*"Components\/([^"]+)"/);
  return match?.[1] ?? null;
}

function applyDefaults(
  controls: ParsedControl[],
  args: Record<string, unknown>,
) {
  for (const control of controls) {
    const value = args[control.name];
    if (value === undefined) continue;
    if (control.type === "enum" && typeof value === "string") {
      control.defaultValue = value;
    } else if (control.type === "boolean" && typeof value === "boolean") {
      control.defaultValue = value;
    } else if (control.type === "string" && typeof value === "string") {
      control.defaultValue = value;
    } else if (control.type === "number" && typeof value === "number") {
      control.defaultValue = value;
    }
  }
}

function hasCustomRender(source: string): boolean {
  return /render:\s*\(/.test(source) && !/component:\s*\w+/.test(source);
}

function writeConfig(slug: string, name: string, controls: ParsedControl[]) {
  const configVar = `${slugToConfigName(slug)}Config`;
  const category = CATEGORY_BY_SLUG[slug] ?? "forms";
  const controlsLines = controls
    .map((control) => {
      if (control.type === "enum") {
        const defaultValue =
          control.defaultValue !== undefined
            ? `, defaultValue: ${JSON.stringify(control.defaultValue)}`
            : "";
        return `    { name: ${JSON.stringify(control.name)}, type: "enum", options: ${JSON.stringify(control.options)}${defaultValue} },`;
      }
      const defaultValue =
        control.defaultValue !== undefined
          ? `, defaultValue: ${JSON.stringify(control.defaultValue)}`
          : "";
      return `    { name: ${JSON.stringify(control.name)}, type: "${control.type}"${defaultValue} },`;
    })
    .join("\n");

  const content = `import type { ComponentRegistryConfig } from "../types";

export const ${configVar}: ComponentRegistryConfig = {
  name: ${JSON.stringify(name)},
  slug: ${JSON.stringify(slug)},
  category: ${JSON.stringify(category)},
  description: ${JSON.stringify(`${name} component showcase.`)},
  controls: [
${controlsLines}
  ],
};
`;

  fs.mkdirSync(path.join(REGISTRY_DIR, slug), { recursive: true });
  fs.writeFileSync(path.join(REGISTRY_DIR, slug, "config.ts"), content);
}

function writeSimplePlayground(
  slug: string,
  componentName: string,
  importPath: string,
  controls: ParsedControl[],
  args: Record<string, unknown>,
) {
  const propsType = `${componentName}Props`;
  const defaults = controls
    .map((control) => {
      const value = args[control.name];
      if (value === undefined) return null;
      if (typeof value === "string") {
        return `${control.name} = ${JSON.stringify(value)}`;
      }
      return `${control.name} = ${String(value)}`;
    })
    .filter(Boolean)
    .join(",\n  ");

  const propNames = controls.map((control) => control.name);
  const jsxProps = propNames.map((name) => {
    if (name === "children") return "{children}";
    return `${name}={${name}}`;
  });

  const content = `import { ${componentName}, type ${propsType} } from "${importPath}";

export default function ${componentName}Playground({
  ${defaults}${defaults ? "," : ""}
  ...props
}: ${propsType} = {}) {
  return (
    <${componentName} ${jsxProps.join(" ")} {...props} />
  );
}
`;

  fs.writeFileSync(path.join(REGISTRY_DIR, slug, "playground.tsx"), content);
}

function writeStubPlayground(slug: string, name: string) {
  const content = `export default function ${slugToDisplayName(slug).replace(/\s/g, "")}Playground() {
  return <div>${name} playground coming soon.</div>;
}
`;
  fs.writeFileSync(path.join(REGISTRY_DIR, slug, "playground.tsx"), content);
}

const storyFiles = fs
  .readdirSync(STORIES_DIR)
  .filter((file) => file.endsWith(".stories.tsx") && !SKIP_STORIES.has(file));

const generated: string[] = [];
const stubs: string[] = [];

for (const file of storyFiles) {
  const source = fs.readFileSync(path.join(STORIES_DIR, file), "utf8");
  const title = parseTitle(source);
  if (!title) continue;

  const slug = pascalToSlug(title);
  if (EXISTING.has(slug)) continue;

  const controls = parseArgTypes(source);
  const args = parseArgs(source);
  applyDefaults(controls, args);

  const component = parseComponentImport(source);
  const customRender = hasCustomRender(source);

  writeConfig(
    slug,
    title.replace(/([a-z])([A-Z])/g, "$1 $2"),
    controls.length > 0
      ? controls
      : [{ name: "children", type: "string", defaultValue: title }],
  );

  if (component && !customRender) {
    writeSimplePlayground(
      slug,
      component.componentName,
      component.importPath,
      controls,
      args,
    );
    generated.push(slug);
  } else {
    writeStubPlayground(slug, slugToDisplayName(slug));
    stubs.push(slug);
  }
}

console.log(
  `Generated ${generated.length} playgrounds, ${stubs.length} stubs.`,
);
if (stubs.length > 0) {
  console.log("Stubs needing manual playgrounds:", stubs.join(", "));
}
