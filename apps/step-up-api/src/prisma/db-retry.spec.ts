import { describe, expect, it } from "vitest";
import { importFailureMessage } from "./db-retry";

describe("importFailureMessage", () => {
  it("maps Neon reachability errors to a short retry message", () => {
    expect(
      importFailureMessage(
        new Error(
          "Can't reach database server at `ep-example.neon.tech:5432`",
        ),
      ),
    ).toBe("Could not reach the database. Wait a moment and try the import again.");
  });

  it("keeps other error messages", () => {
    expect(importFailureMessage(new Error("Plan not found"))).toBe(
      "Plan not found",
    );
  });
});
