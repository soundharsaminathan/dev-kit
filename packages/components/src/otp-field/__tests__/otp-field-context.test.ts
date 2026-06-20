import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOTPFieldCellProps } from "../otp-field-context";

describe("useOTPFieldCellProps", () => {
  it("returns null when used outside OTPField context", () => {
    const { result } = renderHook(() => useOTPFieldCellProps({}));

    expect(result.current).toBeNull();
  });
});
