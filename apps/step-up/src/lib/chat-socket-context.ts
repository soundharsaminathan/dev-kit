import { createContext } from "react";
import type { Socket } from "socket.io-client";

export type ChatSocketContextValue = {
  socket: Socket | null;
};

export const ChatSocketContext = createContext<ChatSocketContextValue>({
  socket: null,
});
