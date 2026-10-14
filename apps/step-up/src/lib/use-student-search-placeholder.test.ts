import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STUDENT_SEARCH_PLACEHOLDER_STATIC,
  useStudentSearchPlaceholder,
} from "./use-student-search-placeholder";

describe("useStudentSearchPlaceholder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on Search by name...", () => {
    const { result } = renderHook(() => useStudentSearchPlaceholder());
    expect(result.current).toBe("Search by name...");
  });

  it("deletes and types the next word character by character", () => {
    const { result } = renderHook(() =>
      useStudentSearchPlaceholder({ holdMs: 100, typeMs: 20, deleteMs: 20 }),
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // holding → deleting (no char change yet)
    expect(result.current).toBe("Search by name...");

    for (const next of [
      "Search by nam...",
      "Search by na...",
      "Search by n...",
      "Search by ...",
    ]) {
      act(() => {
        vi.advanceTimersByTime(20);
      });
      expect(result.current).toBe(next);
    }

    act(() => {
      vi.advanceTimersByTime(20);
    });
    // empty → switch to "email", still zero chars
    expect(result.current).toBe("Search by ...");

    for (const next of [
      "Search by e...",
      "Search by em...",
      "Search by ema...",
      "Search by emai...",
      "Search by email...",
    ]) {
      act(() => {
        vi.advanceTimersByTime(20);
      });
      expect(result.current).toBe(next);
    }
  });

  it("returns a static fallback when reduced motion is preferred", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useStudentSearchPlaceholder());
    expect(result.current).toBe(STUDENT_SEARCH_PLACEHOLDER_STATIC);
  });
});
