export type AgentChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: AgentToolCall[];
};

export type AgentToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  /** Gemini 3 thought signature — must be echoed on the matching functionCall part. */
  thoughtSignature?: string;
};

export type AgentToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};
