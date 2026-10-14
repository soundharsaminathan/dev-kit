import { act, renderHook } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createExternalStore,
  notificationsSocketStore,
  resetRealtimeSocketStoresForTests,
} from "@/lib/realtime-socket-store";

afterEach(() => {
  resetRealtimeSocketStoresForTests();
});

describe("createExternalStore", () => {
  it("notifies subscribers when state changes", () => {
    const store = createExternalStore({ count: 0 });
    const seen: number[] = [];

    const { result } = renderHook(() =>
      useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        store.getServerSnapshot,
      ),
    );

    seen.push(result.current.count);
    act(() => {
      store.setState({ count: 1 });
    });
    seen.push(result.current.count);

    expect(seen).toEqual([0, 1]);
  });
});

describe("notificationsSocketStore", () => {
  it("is readable outside the provider tree", () => {
    const { result } = renderHook(() =>
      useSyncExternalStore(
        notificationsSocketStore.subscribe,
        notificationsSocketStore.getSnapshot,
        notificationsSocketStore.getServerSnapshot,
      ),
    );

    expect(result.current.connected).toBe(false);

    act(() => {
      notificationsSocketStore.setState({
        connected: true,
        socket: null,
      });
    });

    expect(result.current.connected).toBe(true);
  });
});
