import type { Connect, PreviewServer, ViteDevServer } from "vite";
import {
  buildPortfolioSystemPrompt,
  type ChatMessage,
} from "../src/agent/portfolioContext";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

type ChatBody = {
  messages?: ChatMessage[];
};

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as unknown);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(
  res: Connect.ServerResponse,
  status: number,
  payload: unknown,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function handleAgentChat(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    sendJson(res, 503, {
      error:
        "Set GROQ_API_KEY to enable the free agent. Get a key at https://console.groq.com",
      code: "missing_api_key",
    });
    return;
  }

  let body: ChatBody;
  try {
    body = (await readJsonBody(req)) as ChatBody;
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const userMessages = incoming.filter(
    (m) =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  );

  if (userMessages.length === 0) {
    sendJson(res, 400, {
      error: "messages must include at least one user turn",
    });
    return;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: buildPortfolioSystemPrompt() },
    ...userMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 8000),
    })),
  ];

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    const data = (await groqRes.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };

    if (!groqRes.ok) {
      sendJson(res, groqRes.status >= 400 ? groqRes.status : 502, {
        error: data.error?.message ?? "Groq request failed",
        code: "groq_error",
      });
      return;
    }

    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      sendJson(res, 502, { error: "Empty response from model", code: "empty" });
      return;
    }

    sendJson(res, 200, { reply, model: GROQ_MODEL });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : "Upstream request failed",
      code: "upstream",
    });
  }
}

function attachAgentApi(server: ViteDevServer | PreviewServer) {
  server.middlewares.use("/api/agent/chat", (req, res, next) => {
    void handleAgentChat(req, res).catch((error: unknown) => {
      console.error("[agent/chat]", error);
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Internal agent error" });
      }
      next(error);
    });
  });
}

/** Vite plugin: POST /api/agent/chat → Groq free-tier Llama */
export function portfolioAgentApiPlugin() {
  return {
    name: "portfolio-agent-api",
    configureServer(server: ViteDevServer) {
      attachAgentApi(server);
    },
    configurePreviewServer(server: PreviewServer) {
      attachAgentApi(server);
    },
  };
}
