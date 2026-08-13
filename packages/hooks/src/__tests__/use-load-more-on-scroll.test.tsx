import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadMoreOnScroll } from "../use-load-more-on-scroll";

function Probe({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
}) {
  const ref = useLoadMoreOnScroll({
    hasMore,
    onLoadMore,
    ...(isLoading != null ? { isLoading } : {}),
  });
  return <div ref={ref} data-testid="sentinel" />;
}

describe("useLoadMoreOnScroll", () => {
  let observerCallback: IntersectionObserverCallback | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(() => {
    observerCallback = undefined;
    observe.mockClear();
    disconnect.mockClear();

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = "";
      thresholds = [0];
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the next page when the sentinel intersects", () => {
    const onLoadMore = vi.fn();
    render(<Probe hasMore onLoadMore={onLoadMore} />);

    expect(observe).toHaveBeenCalled();
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not load while a page is already fetching", () => {
    const onLoadMore = vi.fn();
    render(<Probe hasMore isLoading onLoadMore={onLoadMore} />);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not observe when there is no next page", () => {
    const onLoadMore = vi.fn();
    render(<Probe hasMore={false} onLoadMore={onLoadMore} />);

    expect(observe).not.toHaveBeenCalled();
  });
});
