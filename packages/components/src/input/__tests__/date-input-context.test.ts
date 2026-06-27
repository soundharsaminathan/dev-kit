import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDateInputContext } from "../date-input-context";

describe("date-input-context", () => {
  it("throws when used outside DateField or TimeField", () => {
    expect(() =>
      renderHook(() => useDateInputContext("DateInputSegment")),
    ).toThrow("DateInputSegment must be used within DateField or TimeField");
  });
});
