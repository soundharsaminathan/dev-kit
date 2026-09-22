import { expect, test } from "@playwright/test";
import { apiBaseUrl } from "../env";
import {
  errorMessage,
  expectOk,
  expectStatus,
  login,
  post,
  SEED_EMAIL,
  SEED_PASSWORD,
} from "./helpers";

test.describe("auth @http", () => {
  test("health is public and login returns a staff session @http", async () => {
    const health = await expectOk<{ ok: boolean; service: string }>(
      null,
      "/health",
    );
    expect(health).toEqual({ ok: true, service: "loan-mate-api" });

    const session = await login("owner");
    expect(session.user.role).toBe("COMPANY_OWNER");
    expect(session.user.email).toBe(SEED_EMAIL.owner);
    expect(session.accessToken.startsWith("dev:COMPANY_OWNER:")).toBeTruthy();

    const me = await expectOk<{ id: string; role: string }>(
      "owner",
      "/auth/me",
    );
    expect(me.id).toBe(session.user.id);
    expect(me.role).toBe("COMPANY_OWNER");
  });

  test("missing token, bad password, and unknown user are rejected @http", async () => {
    const missing = await fetch(`${apiBaseUrl}/auth/me`);
    expect(missing.status).toBe(401);

    const badPassword = await expectStatus(
      "owner",
      "/auth/login",
      401,
      post({
        email: SEED_EMAIL.owner,
        password: "not-the-seed-password",
      }),
    );
    expect(errorMessage(badPassword.data)).toContain("Invalid credentials");

    await expectStatus(
      null,
      "/auth/login",
      401,
      post({ email: "nobody@example.com", password: SEED_PASSWORD }),
    );
  });

  test("bypass login issues a dev token only when AUTH_BYPASS is on @http", async () => {
    const owner = await login("owner");
    const bypass = await expectOk<{
      accessToken: string;
      user: { id: string };
    }>(null, "/auth/bypass", post({ userId: owner.user.id }));
    expect(bypass.user.id).toBe(owner.user.id);
    expect(bypass.accessToken).toBe(`dev:COMPANY_OWNER:${owner.user.id}`);

    await expectStatus(null, "/auth/bypass", 400, post({}));
  });

  test("collection officer cannot create a company @http", async () => {
    const denied = await expectStatus(
      "collector",
      "/companies",
      403,
      post({
        name: "Denied NBFC",
        slug: "denied-nbfc",
        ownerName: "Nobody",
        ownerEmail: "nobody-denied@example.com",
      }),
    );
    expect(errorMessage(denied.data)).toContain("Insufficient permissions");
  });
});
