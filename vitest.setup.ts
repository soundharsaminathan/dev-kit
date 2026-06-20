import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

class ResizeObserverMock {
  observe = () => {};
  disconnect = () => {};
  unobserve = () => {};
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
