/**
 * Generates src/registry/index.ts from registry folders.
 */
import fs from "node:fs";
import path from "node:path";

const REGISTRY_DIR = path.resolve(import.meta.dirname, "../src/registry");
const OUTPUT = path.join(REGISTRY_DIR, "index.ts");

const slugs = fs
  .readdirSync(REGISTRY_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const imports = slugs
  .map((slug) => {
    const configName = slug.replace(/-([a-z])/g, (_, c: string) =>
      c.toUpperCase(),
    );
    return `import { ${configName}Config } from "./${slug}/config";
import ${configName}Playground from "./${slug}/playground";`;
  })
  .join("\n");

const entries = slugs
  .map((slug) => {
    const configName = slug.replace(/-([a-z])/g, (_, c: string) =>
      c.toUpperCase(),
    );
    return `  "${slug}": {
    config: ${configName}Config,
    Playground: ${configName}Playground,
  },`;
  })
  .join("\n");

const content = `import type { ComponentRegistryEntry, ComponentSlug } from "./types";

${imports}

const registry = {
${entries}
} as const satisfies Record<string, ComponentRegistryEntry>;

export function getRegistryEntry(
  slug: ComponentSlug,
): ComponentRegistryEntry | null {
  return registry[slug as keyof typeof registry] ?? null;
}

export function getAllRegistryEntries(): ComponentRegistryEntry[] {
  return Object.values(registry);
}

export { registry };
`;

fs.writeFileSync(OUTPUT, content);
console.log(`Wrote registry index with ${slugs.length} entries.`);
