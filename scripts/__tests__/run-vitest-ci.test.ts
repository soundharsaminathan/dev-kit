import { describe, expect, it } from "vitest";
import { buildVitestCiCommand } from "../run-vitest-ci.ts";

describe("buildVitestCiCommand", () => {
  it("writes coverage to a project-specific reports directory", () => {
    const command = buildVitestCiCommand("components");

    expect(command).toContain("--project components");
    expect(command).toContain("--coverage.reportsDirectory=");
    expect(command.replaceAll("\\", "/")).toContain("coverage/components");
    expect(command).toContain("--coverage.reporter=json-summary");
    expect(command).toContain("--outputFile=test-results/junit-components.xml");
  });
});
