import type { Socket } from "socket.io-client";

export function createExternalStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState(next: T) {
      state = next;
      for (const listener of listeners) {
        listener();
      }
    },
    reset() {
      state = initial;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

export type NotificationsSocketState = {
  connected: boolean;
  socket: Socket | null;
};

export type ChatSocketState = {
  socket: Socket | null;
};

const disconnectedNotifications: NotificationsSocketState = {
  connected: false,
  socket: null,
};

const disconnectedChat: ChatSocketState = {
  socket: null,
};

export const notificationsSocketStore =
  createExternalStore<NotificationsSocketState>(disconnectedNotifications);

export const chatSocketStore =
  createExternalStore<ChatSocketState>(disconnectedChat);

export function resetRealtimeSocketStoresForTests() {
  notificationsSocketStore.reset();
  chatSocketStore.reset();
}
