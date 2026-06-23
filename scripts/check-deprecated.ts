import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const DEPRECATED_DIAGNOSTIC_CODE = 6385;

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const DEFAULT_PROJECTS = [
  "packages/tokens/tsconfig.json",
  "packages/core/tsconfig.json",
  "packages/components/tsconfig.json",
  "apps/storybook/tsconfig.json",
  "apps/showcase/tsconfig.json",
] as const;

export type DeprecatedUsage = {
  file: string;
  line: number;
  column: number;
  message: string;
};

export function resolveTsconfigProjects(
  rootConfigPath = path.join(workspaceRoot, "tsconfig.json"),
): string[] {
  if (!fs.existsSync(rootConfigPath)) {
    return [...DEFAULT_PROJECTS];
  }

  const configFile = ts.readConfigFile(rootConfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.formatDiagnostic(configFile.error, formatHost()));
  }

  const references = configFile.config.references;
  if (!Array.isArray(references) || references.length === 0) {
    return [...DEFAULT_PROJECTS];
  }

  return references
    .map((reference) => reference?.path)
    .filter((value): value is string => typeof value === "string")
    .map((value) => {
      const referencePath = path.join(workspaceRoot, value);
      return referencePath.endsWith(".json")
        ? referencePath
        : path.join(referencePath, "tsconfig.json");
    });
}

export function collectDeprecatedUsages(
  configPaths: readonly string[] = DEFAULT_PROJECTS,
  rootDir = workspaceRoot,
): DeprecatedUsage[] {
  const usages: DeprecatedUsage[] = [];

  for (const configRel of configPaths) {
    const configPath = path.isAbsolute(configRel)
      ? configRel
      : path.join(rootDir, configRel);
    const configDir = path.dirname(configPath);
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

    if (configFile.error) {
      throw new Error(ts.formatDiagnostic(configFile.error, formatHost()));
    }

    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      configDir,
    );

    if (parsed.errors.length > 0) {
      const message = parsed.errors
        .map((error) => ts.formatDiagnostic(error, formatHost()))
        .join("\n");
      throw new Error(message);
    }

    const host = ts.createCompilerHost(parsed.options, true);
    const program = ts.createProgram(parsed.fileNames, parsed.options, host);

    for (const sourceFile of program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      if (sourceFile.fileName.includes("node_modules")) {
        continue;
      }

      const diagnostics = program
        .getSuggestionDiagnostics(sourceFile)
        .filter((diagnostic) => diagnostic.code === DEPRECATED_DIAGNOSTIC_CODE);

      for (const diagnostic of diagnostics) {
        const start = diagnostic.start ?? 0;
        const { line, character } =
          sourceFile.getLineAndCharacterOfPosition(start);

        usages.push({
          file: path.relative(rootDir, sourceFile.fileName),
          line: line + 1,
          column: character + 1,
          message: ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n",
          ),
        });
      }
    }
  }

  return usages.sort((left, right) => {
    const byFile = left.file.localeCompare(right.file);
    if (byFile !== 0) {
      return byFile;
    }

    if (left.line !== right.line) {
      return left.line - right.line;
    }

    return left.column - right.column;
  });
}

export function formatDeprecatedUsages(usages: DeprecatedUsage[]): string {
  if (usages.length === 0) {
    return "";
  }

  return usages
    .map(
      (usage) => `${usage.file}:${usage.line}:${usage.column} ${usage.message}`,
    )
    .join("\n");
}

function formatHost(): ts.FormatDiagnosticsHost {
  return {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => workspaceRoot,
    getNewLine: () => "\n",
  };
}

function main() {
  const usages = collectDeprecatedUsages(resolveTsconfigProjects());

  if (usages.length === 0) {
    return;
  }

  console.error(
    `Deprecated API usage is not allowed (${usages.length}):\n${formatDeprecatedUsages(usages)}`,
  );
  process.exitCode = 1;
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main();
}
