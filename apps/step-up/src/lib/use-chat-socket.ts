import { useSyncExternalStore } from "react";
import {
  type ChatSocketState,
  chatSocketStore,
} from "@/lib/realtime-socket-store";

export type ChatSocketContextValue = ChatSocketState;

export function useChatSocket(): ChatSocketContextValue {
  return useSyncExternalStore(
    chatSocketStore.subscribe,
    chatSocketStore.getSnapshot,
    chatSocketStore.getServerSnapshot,
  );
}
