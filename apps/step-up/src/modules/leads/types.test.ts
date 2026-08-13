import { describe, expect, it } from "vitest";
import { phoneTelHref } from "./types";

describe("phoneTelHref", () => {
  it("builds a tel link from a formatted mobile number", () => {
    expect(phoneTelHref("+91 91234 56789")).toBe("tel:+919123456789");
  });

  it("returns null when nothing dialable remains", () => {
    expect(phoneTelHref("Lead only")).toBeNull();
    expect(phoneTelHref("   ")).toBeNull();
  });
});
