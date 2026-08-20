import { describe, expect, it } from "vitest";
import { profile } from "./profile";
import { experienceCommits, files } from "./workspace";

describe("workspace content", () => {
  it("includes real college years 2014–2018", () => {
    const college = files["education/college.md"];
    expect(college?.meta?.years).toBe("2014–2018");
    expect(college?.body).toContain("2014");
    expect(college?.body).toContain("2018");
  });

  it("exposes profile identity", () => {
    expect(profile.name).toBe("Soundhar");
    expect(profile.email).toContain("@");
  });

  it("maps experience commits to files", () => {
    for (const commit of experienceCommits) {
      expect(files[commit.fileId]).toBeDefined();
    }
  });
});
