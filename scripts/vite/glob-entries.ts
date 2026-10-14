import { extname, resolve } from "node:path";
import { globSync } from "glob";

export function globEntryMap(options: {
  srcDir: string;
  ignore?: string[];
}): Record<string, string> {
  const { srcDir, ignore = [] } = options;

  return Object.fromEntries(
    globSync("**/*.{ts,tsx}", {
      cwd: srcDir,
      ignore: ["**/*.d.ts", ...ignore],
    }).map((file) => {
      const normalized = file.replaceAll("\\", "/");
      const entryName = normalized.slice(
        0,
        normalized.length - extname(normalized).length,
      );
      return [entryName, resolve(srcDir, file)];
    }),
  );
}
