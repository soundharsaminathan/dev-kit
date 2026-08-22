import { describe, expect, it } from "vitest";
import { decodeImportText } from "./decode-import-text";

describe("decodeImportText", () => {
  it("decodes ampersand entities", () => {
    expect(decodeImportText("Free style &amp; Choreography")).toBe(
      "Free style & Choreography",
    );
  });

  it("leaves plain ampersands untouched", () => {
    expect(decodeImportText("Tom & Jerry")).toBe("Tom & Jerry");
  });

  it("decodes double-encoded entities", () => {
    expect(decodeImportText("Free style &amp;amp; Choreography")).toBe(
      "Free style & Choreography",
    );
  });
});
