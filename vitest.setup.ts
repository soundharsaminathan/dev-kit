import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

class ResizeObserverMock {
  observe = () => {};
  disconnect = () => {};
  unobserve = () => {};
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

function createMatchMedia(query: string): MediaQueryList {
  const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);
  const matches = maxWidthMatch
    ? window.innerWidth <= Number(maxWidthMatch[1])
    : query.includes("(prefers-color-scheme: dark)")
      ? false
      : query.includes("(hover: hover)")
        ? true
        : false;

  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as MediaQueryList;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(createMatchMedia),
});
