import { describe, expect, it } from "vitest";
import { COMPONENT_VISUAL_INTERACTIONS } from "../component-visual-interactions";

describe("component-visual-interactions", () => {
  it("maps every interaction slug to a unique interaction id", () => {
    const interactions = Object.values(COMPONENT_VISUAL_INTERACTIONS);
    expect(new Set(interactions).size).toBe(interactions.length);
  });
});
