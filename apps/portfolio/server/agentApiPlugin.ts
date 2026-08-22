import type { Connect, PreviewServer, ViteDevServer } from "vite";
import { answerFromPortfolio } from "../src/agent/localAnswer";
import {
  buildPortfolioSystemPrompt,
  type ChatMessage,
} from "../src/agent/portfolioContext";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";
const LOCAL_MODEL = "local-portfolio";

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

function lastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === "user") return m.content;
  }
  return "";
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

  const question = lastUserMessage(userMessages);
  const apiKey = process.env.GROQ_API_KEY?.trim();

  // Free offline path — always works without a key
  if (!apiKey) {
    sendJson(res, 200, {
      reply: answerFromPortfolio(question),
      model: LOCAL_MODEL,
      mode: "local",
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
      sendJson(res, 200, {
        reply: `${answerFromPortfolio(question)}\n\n_(Groq unavailable — answered locally.)_`,
        model: LOCAL_MODEL,
        mode: "local-fallback",
        upstreamError: data.error?.message ?? "Groq request failed",
      });
      return;
    }

    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      sendJson(res, 200, {
        reply: answerFromPortfolio(question),
        model: LOCAL_MODEL,
        mode: "local-fallback",
      });
      return;
    }

    sendJson(res, 200, { reply, model: GROQ_MODEL, mode: "groq" });
  } catch (error) {
    sendJson(res, 200, {
      reply: `${answerFromPortfolio(question)}\n\n_(Upstream error — answered locally.)_`,
      model: LOCAL_MODEL,
      mode: "local-fallback",
      upstreamError:
        error instanceof Error ? error.message : "Upstream request failed",
    });
  }
}

function attachAgentApi(server: ViteDevServer | PreviewServer, base: string) {
  const roots = new Set(["/api/agent/chat"]);
  const prefix = base.replace(/\/$/, "");
  if (prefix && prefix !== "/") {
    roots.add(`${prefix}/api/agent/chat`);
  }

  for (const mount of roots) {
    server.middlewares.use(mount, (req, res, next) => {
      void handleAgentChat(req, res).catch((error: unknown) => {
        console.error("[agent/chat]", error);
        if (!res.headersSent) {
          sendJson(res, 500, { error: "Internal agent error" });
        }
        next(error);
      });
    });
  }
}

/** Vite plugin: POST /api/agent/chat → Groq, with local free fallback */
export function portfolioAgentApiPlugin(base = "/") {
  return {
    name: "portfolio-agent-api",
    configureServer(server: ViteDevServer) {
      attachAgentApi(server, base);
    },
    configurePreviewServer(server: PreviewServer) {
      attachAgentApi(server, base);
    },
  };
}
