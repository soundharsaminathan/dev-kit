import { describe, expect, it } from "vitest";
import { testEmail } from "./test-email";

describe("testEmail", () => {
  it("routes a username through the Gmail plus tag", () => {
    expect(testEmail("smoke-admin")).toBe("soundhar.adi+smoke-admin@gmail.com");
  });

  it("strips an existing domain from the username", () => {
    expect(testEmail("smoke-pay-1@stepup.dev")).toBe(
      "soundhar.adi+smoke-pay-1@gmail.com",
    );
  });
});
