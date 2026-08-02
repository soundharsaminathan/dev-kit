import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  const configValues: Record<string, string> = {};
  const config = {
    get: vi.fn((key: string) => configValues[key]),
  };

  let service: EmailService;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(configValues)) {
      delete configValues[key];
    }
    vi.stubGlobal("fetch", fetchMock);
    service = new EmailService(config as never);
  });

  it("skips send when RESEND_API_KEY is missing", async () => {
    await service.sendStaffInvite({
      to: "staff@stepup.dev",
      studioName: "Step Up",
      inviteUrl: "http://localhost:5199/join?token=abc",
      role: "STAFF",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to Resend when configured", async () => {
    configValues.RESEND_API_KEY = "re_test";
    configValues.EMAIL_FROM = "Step Up <hello@stepup.dev>";
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "",
    });

    await service.sendStaffInvite({
      to: "staff@stepup.dev",
      studioName: "Step Up",
      inviteUrl: "http://localhost:5199/join?token=abc",
      role: "STAFF",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test",
        }),
      }),
    );
  });
});
