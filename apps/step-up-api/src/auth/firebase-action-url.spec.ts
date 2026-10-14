import { describe, expect, it } from "vitest";
import { toAppEmailActionUrl } from "./firebase-action-url";

describe("toAppEmailActionUrl", () => {
  it("rewrites Firebase hosted verifyAndChangeEmail links onto the app", () => {
    const link =
      "https://step-up10.firebaseapp.com/__/auth/action?mode=verifyAndChangeEmail&oobCode=abc123&apiKey=&continueUrl=https%3A%2F%2Fstep-up.pages.dev%2Flogin&lang=en";

    expect(toAppEmailActionUrl(link, "https://step-up.pages.dev")).toBe(
      "https://step-up.pages.dev/auth/action?mode=verifyAndChangeEmail&oobCode=abc123&continueUrl=https%3A%2F%2Fstep-up.pages.dev%2Flogin",
    );
  });

  it("rewrites verification and reset links the same way", () => {
    expect(
      toAppEmailActionUrl(
        "https://step-up10.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=v1",
        "http://localhost:5199",
      ),
    ).toBe("http://localhost:5199/auth/action?mode=verifyEmail&oobCode=v1");
    expect(
      toAppEmailActionUrl(
        "https://step-up10.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=r1",
        "https://step-up.pages.dev/",
      ),
    ).toBe(
      "https://step-up.pages.dev/auth/action?mode=resetPassword&oobCode=r1",
    );
  });

  it("leaves unrelated URLs unchanged", () => {
    expect(
      toAppEmailActionUrl(
        "https://step-up.pages.dev/login",
        "https://step-up.pages.dev",
      ),
    ).toBe("https://step-up.pages.dev/login");
  });
});
