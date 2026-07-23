import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, createApiClient } from "@/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createApiClient auth", () => {
  it("throws ApiError 401 when token is missing", async () => {
    const client = createApiClient(async () => null);
    await expect(client.get("/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Missing auth token",
    });
  });

  it("surfaces upstream 401 as ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: "Unauthorized" }),
      }),
    );

    const client = createApiClient(async () => "dev:STUDENT:student-1");
    await expect(client.get("/notifications")).rejects.toBeInstanceOf(ApiError);
    await expect(client.get("/notifications")).rejects.toMatchObject({
      status: 401,
      message: "Unauthorized",
    });
  });
});

describe("apiRequest", () => {
  it("parses successful JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
      }),
    );

    await expect(apiRequest<{ ok: boolean }>("/health")).resolves.toEqual({
      ok: true,
    });
  });
});
