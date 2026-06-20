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
      const entryName = file.slice(0, file.length - extname(file).length);
      return [entryName, resolve(srcDir, file)];
    }),
  );
}
