import { describe, expect, it } from "vitest";
import {
  emailActionCopy,
  parseEmailActionMode,
} from "@/lib/firebase-email-action";

describe("parseEmailActionMode", () => {
  it("accepts Firebase email action modes", () => {
    expect(parseEmailActionMode("verifyAndChangeEmail")).toBe(
      "verifyAndChangeEmail",
    );
    expect(parseEmailActionMode("verifyEmail")).toBe("verifyEmail");
    expect(parseEmailActionMode("resetPassword")).toBe("resetPassword");
  });

  it("rejects the hosted-page invalid mode", () => {
    expect(parseEmailActionMode("invalid")).toBeNull();
    expect(parseEmailActionMode(undefined)).toBeNull();
  });
});

describe("emailActionCopy", () => {
  it("explains email change success", () => {
    expect(emailActionCopy("verifyAndChangeEmail").successTitle).toBe(
      "Email updated",
    );
  });
});
