import { describe, expect, it } from "vitest";
import { decodeImportText } from "./decode-import-text";

describe("decodeImportText", () => {
  it("decodes ampersand entities", () => {
    expect(decodeImportText("Free style &amp; Choreography")).toBe(
      "Free style & Choreography",
    );
  });
});
