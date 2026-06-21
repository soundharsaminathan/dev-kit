import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatAffectedE2eCliOutput,
  getChangedFiles,
  getStagedFiles,
  pascalToKebab,
  resolveAffectedE2eForArgv,
  resolveAffectedE2eFromGit,
  resolveAffectedE2eFromStaged,
  resolveAffectedE2eSpecs,
  toPlaywrightArgs,
} from "../affected-e2e-specs.ts";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe("pascalToKebab", () => {
  it("converts story names to spec file stems", () => {
    expect(pascalToKebab("Button")).toBe("button");
    expect(pascalToKebab("OTPField")).toBe("otp-field");
    expect(pascalToKebab("ToggleButtonGroup")).toBe("toggle-button-group");
  });
});

describe("getStagedFiles", () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it("returns normalized staged file paths", () => {
    mockExecSync.mockReturnValue(
      "packages\\components\\src\\button\\Button.tsx\n\nREADME.md\n",
    );

    expect(getStagedFiles()).toEqual([
      "packages/components/src/button/Button.tsx",
      "README.md",
    ]);
  });

  it("returns an empty array when git fails", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("not a git repo");
    });

    expect(getStagedFiles()).toEqual([]);
  });
});

describe("getChangedFiles", () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it("collects changed and untracked files using the origin-prefixed base", () => {
    mockExecSync.mockImplementation((command) => {
      if (command === "git diff --name-only origin/main") {
        return "packages/components/src/modal/Modal.tsx";
      }

      if (command === "git ls-files --others --exclude-standard") {
        return "apps/storybook/e2e/new.spec.ts";
      }

      throw new Error(`unexpected command: ${command}`);
    });

    expect(getChangedFiles("main")).toEqual([
      "packages/components/src/modal/Modal.tsx",
      "apps/storybook/e2e/new.spec.ts",
    ]);
  });

  it("falls back to the unprefixed base ref when the origin ref has no changes", () => {
    mockExecSync.mockImplementation((command) => {
      if (command === "git diff --name-only origin/develop") {
        return "";
      }

      if (command === "git diff --name-only develop") {
        return "packages/core/src/theme.ts";
      }

      if (command === "git ls-files --others --exclude-standard") {
        return "";
      }

      throw new Error(`unexpected command: ${command}`);
    });

    expect(getChangedFiles("develop")).toEqual(["packages/core/src/theme.ts"]);
  });

  it("keeps going when untracked lookup fails", () => {
    mockExecSync.mockImplementation((command) => {
      if (command === "git diff --name-only origin/main") {
        return "README.md";
      }

      if (command === "git ls-files --others --exclude-standard") {
        throw new Error("git unavailable");
      }

      throw new Error(`unexpected command: ${command}`);
    });

    expect(getChangedFiles("main")).toEqual(["README.md"]);
  });

  it("returns only untracked files when both base refs fail", () => {
    mockExecSync.mockImplementation((command) => {
      if (
        command === "git diff --name-only origin/feature" ||
        command === "git diff --name-only feature"
      ) {
        throw new Error("unknown ref");
      }

      if (command === "git ls-files --others --exclude-standard") {
        return "apps/storybook/e2e/draft.spec.ts";
      }

      throw new Error(`unexpected command: ${command}`);
    });

    expect(getChangedFiles("feature")).toEqual([
      "apps/storybook/e2e/draft.spec.ts",
    ]);
  });
});

describe("resolveAffectedE2eSpecs", () => {
  it("returns none when there are no changed files", () => {
    expect(resolveAffectedE2eSpecs([])).toEqual({
      mode: "none",
      reason: "No changed files",
    });
  });

  it("runs all specs when tokens change", () => {
    const result = resolveAffectedE2eSpecs(["packages/tokens/src/theme.ts"]);
    expect(result).toEqual({
      mode: "all",
      reason: "Global visual dependency changed: packages/tokens/src/theme.ts",
    });
  });

  it("runs all specs when core or storybook infrastructure changes", () => {
    expect(resolveAffectedE2eSpecs(["packages/core/src/theme.ts"]).mode).toBe(
      "all",
    );
    expect(
      resolveAffectedE2eSpecs(["apps/storybook/e2e/helpers/viewports.ts"]).mode,
    ).toBe("all");
    expect(
      resolveAffectedE2eSpecs(["apps/storybook/playwright.config.ts"]).mode,
    ).toBe("all");
  });

  it("maps component source changes to a spec file", () => {
    const result = resolveAffectedE2eSpecs([
      "packages/components/src/button/Button.tsx",
    ]);
    expect(result).toEqual({
      mode: "specs",
      specs: ["button.spec.ts"],
    });
  });

  it("maps story file changes to a spec file", () => {
    const result = resolveAffectedE2eSpecs([
      "apps/storybook/stories/Modal.stories.tsx",
    ]);
    expect(result).toEqual({
      mode: "specs",
      specs: ["modal.spec.ts"],
    });
  });

  it("ignores stories that intentionally have no e2e coverage", () => {
    const result = resolveAffectedE2eSpecs([
      "apps/storybook/stories/ColorSwatchPicker.stories.tsx",
    ]);

    expect(result).toEqual({
      mode: "all",
      reason: "Unmapped visual changes in components or storybook",
    });
  });

  it("includes directly changed e2e specs and sorts the result", () => {
    const result = resolveAffectedE2eSpecs([
      "apps/storybook/e2e/z-last.spec.ts",
      "packages/components/src/button/Button.tsx",
      "apps/storybook/stories/Modal.stories.tsx",
    ]);

    expect(result).toEqual({
      mode: "specs",
      specs: ["button.spec.ts", "modal.spec.ts", "z-last.spec.ts"],
    });
  });

  it("runs all specs when nx config changes", () => {
    const result = resolveAffectedE2eSpecs(["nx.json"]);
    expect(result.mode).toBe("all");
  });

  it("runs all specs for unmapped visual paths under components or storybook", () => {
    const result = resolveAffectedE2eSpecs([
      "packages/components/package.json",
    ]);

    expect(result).toEqual({
      mode: "all",
      reason: "Unmapped visual changes in components or storybook",
    });
  });

  it("runs all specs when other scripts or project config change", () => {
    expect(resolveAffectedE2eSpecs(["scripts/build.ts"]).mode).toBe("all");
    expect(resolveAffectedE2eSpecs(["packages/core/project.json"]).mode).toBe(
      "all",
    );
  });

  it("skips when no visual-relevant files changed", () => {
    const result = resolveAffectedE2eSpecs(["README.md"]);
    expect(result).toEqual({
      mode: "none",
      reason: "No visual-relevant file changes",
    });
  });
});

describe("resolveAffectedE2eFromGit", () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it("resolves specs from git changes", () => {
    mockExecSync.mockImplementation((command) => {
      if (command === "git diff --name-only origin/main") {
        return "packages/components/src/button/Button.tsx";
      }

      if (command === "git ls-files --others --exclude-standard") {
        return "";
      }

      throw new Error(`unexpected command: ${command}`);
    });

    expect(resolveAffectedE2eFromGit("main")).toEqual({
      mode: "specs",
      specs: ["button.spec.ts"],
    });
  });
});

describe("resolveAffectedE2eFromStaged", () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it("resolves specs from staged changes", () => {
    mockExecSync.mockReturnValue("apps/storybook/stories/Modal.stories.tsx");

    expect(resolveAffectedE2eFromStaged()).toEqual({
      mode: "specs",
      specs: ["modal.spec.ts"],
    });
  });
});

describe("resolveAffectedE2eForArgv", () => {
  const originalNxBase = process.env.NX_BASE;
  const originalGithubBaseRef = process.env.GITHUB_BASE_REF;

  beforeEach(() => {
    mockExecSync.mockReset();
    delete process.env.NX_BASE;
    delete process.env.GITHUB_BASE_REF;
  });

  afterEach(() => {
    if (originalNxBase === undefined) {
      delete process.env.NX_BASE;
    } else {
      process.env.NX_BASE = originalNxBase;
    }

    if (originalGithubBaseRef === undefined) {
      delete process.env.GITHUB_BASE_REF;
    } else {
      process.env.GITHUB_BASE_REF = originalGithubBaseRef;
    }
  });

  it("uses --base when resolving git changes", () => {
    mockExecSync.mockImplementation((command) => {
      if (command === "git diff --name-only origin/release") {
        return "packages/components/src/modal/Modal.tsx";
      }

      if (command === "git ls-files --others --exclude-standard") {
        return "";
      }

      throw new Error(`unexpected command: ${command}`);
    });

    expect(resolveAffectedE2eForArgv(["--base", "release"])).toEqual({
      mode: "specs",
      specs: ["modal.spec.ts"],
    });
  });

  it("falls back to NX_BASE then GITHUB_BASE_REF", () => {
    mockExecSync.mockImplementation((command) => {
      if (command === "git diff --name-only origin/develop") {
        return "README.md";
      }

      if (command === "git ls-files --others --exclude-standard") {
        return "";
      }

      throw new Error(`unexpected command: ${command}`);
    });

    process.env.NX_BASE = "develop";
    expect(resolveAffectedE2eForArgv([]).mode).toBe("none");

    delete process.env.NX_BASE;
    process.env.GITHUB_BASE_REF = "develop";
    expect(resolveAffectedE2eForArgv([]).mode).toBe("none");
  });

  it("uses staged files when --staged is passed", () => {
    mockExecSync.mockReturnValue("apps/storybook/stories/Button.stories.tsx");

    expect(resolveAffectedE2eForArgv(["--staged"])).toEqual({
      mode: "specs",
      specs: ["button.spec.ts"],
    });
  });
});

describe("formatAffectedE2eCliOutput", () => {
  it("formats all, none, and spec results for the CLI", () => {
    expect(
      formatAffectedE2eCliOutput({
        mode: "all",
        reason: "Global visual dependency changed: nx.json",
      }),
    ).toEqual({
      stdout: "all",
      stderr: "Global visual dependency changed: nx.json",
    });

    expect(
      formatAffectedE2eCliOutput({
        mode: "none",
        reason: "No visual-relevant file changes",
      }),
    ).toEqual({
      stdout: "none",
      stderr: "No visual-relevant file changes",
    });

    expect(
      formatAffectedE2eCliOutput({
        mode: "specs",
        specs: ["button.spec.ts", "modal.spec.ts"],
      }),
    ).toEqual({
      stdout: "button.spec.ts\nmodal.spec.ts",
    });
  });
});

describe("toPlaywrightArgs", () => {
  it("returns an empty array for all or none modes", () => {
    expect(toPlaywrightArgs({ mode: "all", reason: "tokens changed" })).toEqual(
      [],
    );
    expect(
      toPlaywrightArgs({ mode: "none", reason: "No changed files" }),
    ).toEqual([]);
  });

  it("prefixes spec files for Playwright", () => {
    expect(
      toPlaywrightArgs({
        mode: "specs",
        specs: ["button.spec.ts", "modal.spec.ts"],
      }),
    ).toEqual(["e2e/button.spec.ts", "e2e/modal.spec.ts"]);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
