/**
 * Registry tooling from Storybook stories.
 *
 * Scaffold new entries (config + playground stubs):
 *   pnpm exec tsx apps/showcase/scripts/generate-registry.ts
 *
 * Re-sync controls on existing configs (preserves hand-tuned fields):
 *   pnpm exec tsx apps/showcase/scripts/generate-registry.ts --sync
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const STORIES_DIR = path.resolve(ROOT, "../storybook/stories");
const REGISTRY_DIR = path.resolve(ROOT, "src/registry");

const SKIP_STORIES = new Set(["Themes.stories.tsx"]);
const HAND_TUNED_SLUGS = new Set(["button", "select", "switch"]);

const SYNC_MODE = process.argv.includes("--sync");

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

type ParsedControl =
  | { name: string; type: "boolean"; defaultValue?: boolean }
  | { name: string; type: "string"; defaultValue?: string }
  | {
      name: string;
      type: "number";
      defaultValue?: number;
      min?: number;
      max?: number;
      step?: number;
    }
  | { name: string; type: "enum"; options: string[]; defaultValue?: string };

type ExistingConfig = {
  name?: string;
  category?: string;
  description: string | null;
  scale?: number;
  hasNormalize: boolean;
  hasExtraVisual: boolean;
  normalizeImport?: string;
  src: string;
};

type PlaygroundMeta = {
  props: string[];
  unions: Map<string, string[]>;
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

function extractObjectBlock(source: string, key: string): string | null {
  const keyIndex = source.indexOf(`${key}:`);
  if (keyIndex === -1) return null;

  const braceStart = source.indexOf("{", keyIndex);
  if (braceStart === -1) return null;

  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(braceStart + 1, i);
      }
    }
  }

  return null;
}

function parseTopLevelEntries(block: string) {
  const entries: Array<{ name: string; body: string }> = [];
  let i = 0;

  while (i < block.length) {
    while (i < block.length && /[\s,]/.test(block[i])) i++;
    if (i >= block.length) break;

    const nameMatch = block.slice(i).match(/^([\w"-]+|"[^"]+")\s*:/);
    if (!nameMatch) break;

    const rawName = nameMatch[1];
    const name = rawName.replaceAll('"', "");
    i += nameMatch[0].length;

    while (i < block.length && /\s/.test(block[i])) i++;
    if (block[i] !== "{") {
      i++;
      continue;
    }

    let depth = 0;
    const bodyStart = i;
    for (; i < block.length; i++) {
      if (block[i] === "{") depth++;
      else if (block[i] === "}") {
        depth--;
        if (depth === 0) {
          entries.push({ name, body: block.slice(bodyStart + 1, i) });
          i++;
          break;
        }
      }
    }
  }

  return entries;
}

function parseArgTypes(source: string): ParsedControl[] {
  const block = extractObjectBlock(source, "argTypes");
  if (!block) return [];

  const controls: ParsedControl[] = [];

  for (const entry of parseTopLevelEntries(block)) {
    const controlMatch = entry.body.match(/control:\s*"([^"]+)"/);
    const optionsMatch = entry.body.match(/options:\s*\[([^\]]*)\]/);

    if (!controlMatch) continue;

    const control = controlMatch[1];
    if (control === "boolean") {
      controls.push({ name: entry.name, type: "boolean" });
    } else if (control === "text") {
      controls.push({ name: entry.name, type: "string" });
    } else if (control === "number") {
      controls.push({ name: entry.name, type: "number" });
    } else if (control === "select" && optionsMatch) {
      const rawOptions = optionsMatch[1]
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean);
      const allNumeric = rawOptions.every((option) =>
        /^-?\d+(\.\d+)?$/.test(option),
      );
      if (allNumeric) {
        const numbers = rawOptions.map(Number);
        controls.push({
          name: entry.name,
          type: "number",
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          step: numbers.length > 1 ? numbers[1] - numbers[0] : 1,
        });
      } else {
        const options = rawOptions.map((option) =>
          option.replaceAll(/['"]/g, ""),
        );
        controls.push({ name: entry.name, type: "enum", options });
      }
    }
  }

  return controls;
}

function parseArgs(source: string): Record<string, unknown> {
  const block = extractObjectBlock(source, "args");
  if (!block) return {};
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

function parsePlaygroundMeta(slug: string): PlaygroundMeta {
  const pgPath = path.join(REGISTRY_DIR, slug, "playground.tsx");
  if (!fs.existsSync(pgPath)) {
    return { props: [], unions: new Map() };
  }

  const src = fs.readFileSync(pgPath, "utf8");
  const props = new Set<string>();
  const unions = new Map<string, string[]>();

  const typeMatch = src.match(/type \w+PlaygroundProps = \{([\s\S]*?)\};/);
  if (typeMatch) {
    for (const line of typeMatch[1].split("\n")) {
      const unionMatch = line.match(/^\s*(\w+)\??:\s*(.+);?\s*$/);
      if (!unionMatch) continue;
      const name = unionMatch[1];
      props.add(name);
      const typePart = unionMatch[2].trim();
      const stringUnion = [...typePart.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      if (stringUnion.length > 0) {
        unions.set(name, stringUnion);
      }
    }
  }

  const fnMatch = src.match(
    /export default function \w+Playground\(\{([\s\S]*?)\}(?:\s*=\s*\{\})?/,
  );
  if (fnMatch) {
    for (const m of fnMatch[1].matchAll(/^\s*(\w+)\s*=/gm)) props.add(m[1]);
    for (const m of fnMatch[1].matchAll(/^\s*(\w+)\??:/gm)) props.add(m[1]);
  }

  return { props: [...props].filter((p) => p !== "...props"), unions };
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

function inferControl(
  name: string,
  value: unknown,
  unions: Map<string, string[]>,
): ParsedControl | null {
  if (unions.has(name)) {
    return { name, type: "enum", options: unions.get(name)! };
  }
  if (typeof value === "boolean") return { name, type: "boolean" };
  if (typeof value === "number") return { name, type: "number" };
  if (typeof value === "string") return { name, type: "string" };
  return null;
}

function buildControls(
  storyControls: ParsedControl[],
  args: Record<string, unknown>,
  playground: PlaygroundMeta,
): ParsedControl[] {
  const controls: ParsedControl[] = [];
  const seen = new Set<string>();

  for (const control of storyControls) {
    controls.push({ ...control });
    seen.add(control.name);
  }

  for (const name of playground.props) {
    if (seen.has(name)) continue;
    const value = args[name];
    const inferred = inferControl(name, value, playground.unions);
    if (inferred) {
      controls.push(inferred);
      seen.add(name);
    }
  }

  for (const [name, value] of Object.entries(args)) {
    if (seen.has(name)) continue;
    const inferred = inferControl(name, value, playground.unions);
    if (inferred) {
      controls.push(inferred);
      seen.add(name);
    }
  }

  applyDefaults(controls, args);
  return controls;
}

function formatControl(control: ParsedControl): string {
  if (control.type === "enum") {
    const defaultValue =
      control.defaultValue !== undefined
        ? `, defaultValue: ${JSON.stringify(control.defaultValue)}`
        : "";
    return `    { name: ${JSON.stringify(control.name)}, type: "enum", options: ${JSON.stringify(control.options)}${defaultValue} },`;
  }

  if (control.type === "number") {
    const extras: string[] = [];
    if (control.defaultValue !== undefined) {
      extras.push(`defaultValue: ${control.defaultValue}`);
    }
    if (control.min !== undefined) extras.push(`min: ${control.min}`);
    if (control.max !== undefined) extras.push(`max: ${control.max}`);
    if (control.step !== undefined) extras.push(`step: ${control.step}`);
    const suffix = extras.length > 0 ? `, ${extras.join(", ")}` : "";
    return `    { name: ${JSON.stringify(control.name)}, type: "number"${suffix} },`;
  }

  const defaultValue =
    control.defaultValue !== undefined
      ? `, defaultValue: ${JSON.stringify(control.defaultValue)}`
      : "";
  return `    { name: ${JSON.stringify(control.name)}, type: "${control.type}"${defaultValue} },`;
}

function readExistingConfig(slug: string): ExistingConfig | null {
  const configPath = path.join(REGISTRY_DIR, slug, "config.ts");
  if (!fs.existsSync(configPath)) return null;
  const src = fs.readFileSync(configPath, "utf8");

  const name = src.match(/name:\s*"([^"]+)"/)?.[1];
  const category = src.match(/category:\s*"([^"]+)"/)?.[1];
  const description = src.match(
    /description:\s*(?:"([^"]+)"|(\n\s*`[\s\S]*?`))/,
  );
  const scale = src.match(/scale:\s*([\d.]+)/)?.[1];
  const hasNormalize = /normalizeControlValues:/.test(src);
  const hasExtraVisual = /extraVisualCases:/.test(src);
  const normalizeImport = src.match(
    /^import \{ normalize\w+ \} from "\.\/normalize";$/m,
  )?.[0];

  return {
    name,
    category,
    description:
      description?.[1] ??
      (description?.[0]?.includes("`")
        ? description[0].replace(/^\s*description:\s*/, "").trim()
        : null),
    scale: scale ? Number(scale) : undefined,
    hasNormalize,
    hasExtraVisual,
    normalizeImport,
    src,
  };
}

function writeScaffoldConfig(
  slug: string,
  name: string,
  controls: ParsedControl[],
) {
  const configVar = `${slugToConfigName(slug)}Config`;
  const category = CATEGORY_BY_SLUG[slug] ?? "forms";
  const controlsLines = controls.map(formatControl).join("\n");

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

function writeSyncedConfig(
  slug: string,
  controls: ParsedControl[],
  existing: ExistingConfig,
) {
  const configVar = `${slugToConfigName(slug)}Config`;
  const controlsLines = controls.map(formatControl).join("\n");

  const imports = ['import type { ComponentRegistryConfig } from "../types";'];
  if (existing.normalizeImport) imports.push(existing.normalizeImport);

  const optionalLines: string[] = [];
  if (existing.scale !== undefined) {
    optionalLines.push(`  scale: ${existing.scale},`);
  }
  if (existing.hasNormalize) {
    const fnName = existing.normalizeImport?.match(/normalize\w+/)?.[0];
    if (fnName) optionalLines.push(`  normalizeControlValues: ${fnName},`);
  }
  if (existing.hasExtraVisual) {
    const extraMatch = existing.src.match(/extraVisualCases:\s*\[[\s\S]*?\],/);
    if (extraMatch) optionalLines.push(`  ${extraMatch[0]}`);
  }

  const description =
    existing.description &&
    !existing.description.endsWith("component showcase.")
      ? existing.description
      : `${existing.name ?? slugToDisplayName(slug)} component showcase.`;

  const descriptionLine =
    typeof description === "string" && description.includes("\n")
      ? `description:\n    ${description},`
      : `description: ${JSON.stringify(description)},`;

  const content = `${imports.join("\n")}

export const ${configVar}: ComponentRegistryConfig = {
  name: ${JSON.stringify(existing.name ?? slugToDisplayName(slug))},
  slug: ${JSON.stringify(slug)},
  category: ${JSON.stringify(existing.category ?? "forms")},
  ${descriptionLine}
${optionalLines.length > 0 ? `${optionalLines.join("\n")}\n` : ""}  controls: [
${controlsLines}
  ],
};
`;

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

function hasCustomRender(source: string): boolean {
  return /render:\s*\(/.test(source) && !/component:\s*\w+/.test(source);
}

function listStoryFiles(): string[] {
  return fs
    .readdirSync(STORIES_DIR)
    .filter((file) => file.endsWith(".stories.tsx") && !SKIP_STORIES.has(file));
}

function runSync() {
  let updated = 0;
  let skipped = 0;

  for (const file of listStoryFiles()) {
    const source = fs.readFileSync(path.join(STORIES_DIR, file), "utf8");
    const title = parseTitle(source);
    if (!title) continue;

    const slug = pascalToSlug(title);
    if (HAND_TUNED_SLUGS.has(slug)) {
      skipped++;
      continue;
    }

    const existing = readExistingConfig(slug);
    if (!existing) continue;

    const storyControls = parseArgTypes(source);
    const args = parseArgs(source);
    const playground = parsePlaygroundMeta(slug);
    const controls = buildControls(storyControls, args, playground);

    if (controls.length === 0) {
      controls.push({
        name: "children",
        type: "string",
        defaultValue: existing.name ?? slugToDisplayName(slug),
      });
    }

    writeSyncedConfig(slug, controls, existing);
    updated++;
  }

  console.log(`Synced ${updated} configs, skipped ${skipped} hand-tuned.`);
}

function runGenerate() {
  const generated: string[] = [];
  const stubs: string[] = [];

  for (const file of listStoryFiles()) {
    const source = fs.readFileSync(path.join(STORIES_DIR, file), "utf8");
    const title = parseTitle(source);
    if (!title) continue;

    const slug = pascalToSlug(title);
    if (HAND_TUNED_SLUGS.has(slug)) continue;

    const controls = parseArgTypes(source);
    const args = parseArgs(source);
    applyDefaults(controls, args);

    const component = parseComponentImport(source);
    const customRender = hasCustomRender(source);

    writeScaffoldConfig(
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
}

if (SYNC_MODE) {
  runSync();
} else {
  runGenerate();
}
