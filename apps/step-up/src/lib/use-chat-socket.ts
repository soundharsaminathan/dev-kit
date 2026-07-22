import { useContext } from "react";
import { ChatSocketContext } from "@/lib/chat-socket-context";

export function useChatSocket() {
  return useContext(ChatSocketContext);
}
