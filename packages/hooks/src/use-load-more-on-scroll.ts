import { useEffect, useRef } from "react";

export type UseLoadMoreOnScrollOptions = {
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
};

export function useLoadMoreOnScroll<T extends HTMLElement = HTMLDivElement>({
  hasMore,
  isLoading = false,
  onLoadMore,
  rootMargin = "240px 0px",
}: UseLoadMoreOnScrollOptions) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          hasMore &&
          !isLoading
        ) {
          onLoadMore();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, rootMargin]);

  return ref;
}
