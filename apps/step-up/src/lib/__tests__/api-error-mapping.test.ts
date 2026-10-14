import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "@/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ApiError mapping", () => {
  it("uses string message from error JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: "Batch is full" }),
      }),
    );

    const client = createApiClient(async () => "dev:STUDENT:student-1");
    await expect(client.post("/bookings", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Batch is full",
    });
  });

  it("falls back when body has no string message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: "boom" }),
      }),
    );

    const client = createApiClient(async () => "dev:STUDENT:student-1");
    await expect(client.get("/health")).rejects.toBeInstanceOf(ApiError);
    await expect(client.get("/health")).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("handles empty error bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "",
      }),
    );

    const client = createApiClient(async () => "dev:STUDENT:student-1");
    await expect(client.patch("/billing/x/paid", {})).rejects.toMatchObject({
      status: 403,
      message: "Request failed with status 403",
    });
  });
});
