import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureQuerySnapshot,
  restoreQuerySnapshot,
} from "../optimistic-query";
import { useOptimisticMutation } from "../use-optimistic-mutation";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("captureQuerySnapshot", () => {
  it("cancels queries and returns the previous cache value", async () => {
    const queryClient = new QueryClient();
    const queryKey = ["items"];
    queryClient.setQueryData(queryKey, ["a"]);

    const snapshot = await captureQuerySnapshot<string[]>(
      queryClient,
      queryKey,
    );

    expect(snapshot).toEqual({ queryKey, previous: ["a"] });
  });
});

describe("restoreQuerySnapshot", () => {
  it("restores the previous cache value", () => {
    const queryClient = new QueryClient();
    const queryKey = ["items"];
    queryClient.setQueryData(queryKey, ["b"]);

    restoreQuerySnapshot(queryClient, {
      queryKey,
      previous: ["a"],
    });

    expect(queryClient.getQueryData(queryKey)).toEqual(["a"]);
  });
});

describe("useOptimisticMutation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies optimistic updates and rolls back on error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const queryKey = ["count"];
    queryClient.setQueryData(queryKey, 1);

    const onRollback = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          mutationFn: async () => {
            throw new Error("failed");
          },
          onOptimistic: async () => {
            const snapshot = await captureQuerySnapshot<number>(
              queryClient,
              queryKey,
            );
            queryClient.setQueryData(queryKey, 2);
            return snapshot;
          },
          onRollback: (snapshot) => {
            restoreQuerySnapshot(queryClient, snapshot);
            onRollback();
          },
          onError,
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData(queryKey)).toBe(1);
    expect(onRollback).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("keeps optimistic state on success and runs onSuccess", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const queryKey = ["count"];
    queryClient.setQueryData(queryKey, 1);
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          mutationFn: async () => 3,
          onOptimistic: async () => {
            const snapshot = await captureQuerySnapshot<number>(
              queryClient,
              queryKey,
            );
            queryClient.setQueryData(queryKey, 2);
            return snapshot;
          },
          onSuccess: (data) => {
            queryClient.setQueryData(queryKey, data);
            onSuccess(data);
          },
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryClient.getQueryData(queryKey)).toBe(3);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0]?.[0]).toBe(3);
  });
});
