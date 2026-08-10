import { describe, expect, it } from "vitest";
import {
  avatarLetter,
  displayNameFromEmail,
  resolveDisplayName,
} from "./display-name";

describe("display-name", () => {
  it("uses the email local-part as username", () => {
    expect(displayNameFromEmail("hari.student@stepup.dev")).toBe("hari.student");
    expect(displayNameFromEmail("")).toBeUndefined();
    expect(displayNameFromEmail(null)).toBeUndefined();
  });

  it("prefers a real display name over the email username", () => {
    expect(resolveDisplayName("Hari", "hari@stepup.dev")).toBe("Hari");
    expect(resolveDisplayName("New User", "hari@stepup.dev")).toBe("hari");
    expect(resolveDisplayName("", "hari@stepup.dev")).toBe("hari");
    expect(resolveDisplayName(null, "hari@stepup.dev")).toBe("hari");
  });

  it("uses the first letter of the resolved name for avatars", () => {
    expect(avatarLetter("Hari", "x@y.com")).toBe("H");
    expect(avatarLetter("New User", "hari@stepup.dev")).toBe("H");
    expect(avatarLetter(null, "alex@stepup.dev")).toBe("A");
    expect(avatarLetter(null, null)).toBe("?");
  });
});
