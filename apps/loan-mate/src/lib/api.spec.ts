import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, createApiClient } from "@/lib/api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses a call with no session and does not hit the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn();
    const api = createApiClient(() => null, { onUnauthorized });

    await expect(api.get("/loans")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Missing auth token",
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the bearer token and parses a success body", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(200, { id: "loan-1" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const api = createApiClient(() => "staff-token");

    await expect(api.post("/loans", { principal: 1000 })).resolves.toEqual({
      id: "loan-1",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain("/loans");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ principal: 1000 }));
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer staff-token",
    );
  });

  it("surfaces string and validation-array error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(400, { message: "Overpayment" }))
        .mockResolvedValueOnce(
          jsonResponse(400, { message: ["mode must be an enum", "amount"] }),
        )
        .mockResolvedValueOnce(new Response("upstream down", { status: 502 })),
    );

    await expect(apiRequest("/payments", { token: "t" })).rejects.toMatchObject(
      { status: 400, message: "Overpayment" },
    );
    await expect(apiRequest("/payments", { token: "t" })).rejects.toMatchObject(
      { status: 400, message: "mode must be an enum, amount" },
    );
    await expect(apiRequest("/payments", { token: "t" })).rejects.toMatchObject(
      { status: 502, message: "upstream down" },
    );
  });

  it("clears the session when the API returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { message: "Unauthorized" })),
    );
    const onUnauthorized = vi.fn();
    const api = createApiClient(() => "expired", { onUnauthorized });

    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
