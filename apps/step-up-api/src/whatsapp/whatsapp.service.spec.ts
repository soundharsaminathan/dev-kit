import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeliveryStatus } from "@prisma/client";
import { toE164, WhatsappService } from "./whatsapp.service";

describe("toE164", () => {
  it("prefixes 10-digit Indian numbers with 91", () => {
    expect(toE164("98765 43210")).toBe("919876543210");
  });

  it("strips plus and spaces from E.164", () => {
    expect(toE164("+91 98765 43210")).toBe("919876543210");
  });

  it("rejects invalid phones", () => {
    expect(toE164("123")).toBeNull();
    expect(toE164(null)).toBeNull();
    expect(toE164("")).toBeNull();
  });
});

describe("WhatsappService.sendInvoiceCreatedReminder", () => {
  const configValues: Record<string, string> = {};
  const config = {
    get: vi.fn((key: string) => configValues[key]),
  };
  const prisma = {
    whatsappMessage: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
    },
  };
  const crypto = {
    decryptUser: vi.fn(),
  };

  let service: WhatsappService;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(configValues)) {
      delete configValues[key];
    }
    vi.stubGlobal("fetch", fetchMock);
    service = new WhatsappService(
      config as never,
      prisma as never,
      crypto as never,
    );
  });

  it("skips when WhatsApp is not configured", async () => {
    await expect(service.sendInvoiceCreatedReminder("inv-1")).resolves.toEqual({
      status: "SKIPPED",
      reason: "unconfigured",
    });
    expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  it("skips when already SENT without calling Graph", async () => {
    configValues.WHATSAPP_TOKEN = "token";
    configValues.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
    prisma.whatsappMessage.findUnique.mockResolvedValue({
      status: DeliveryStatus.SENT,
    });

    await expect(service.sendInvoiceCreatedReminder("inv-1")).resolves.toEqual({
      status: "SKIPPED",
      reason: "already_sent",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips when phone is missing", async () => {
    configValues.WHATSAPP_TOKEN = "token";
    configValues.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
    prisma.whatsappMessage.findUnique.mockResolvedValue(null);
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "u-1",
      studioId: "studio-1",
      amount: 1000,
      student: {},
      studio: { id: "studio-1", name: "Floor One" },
    });
    crypto.decryptUser.mockReturnValue({
      name: "Ada",
      phone: null,
      alternateMobile: null,
    });
    prisma.whatsappMessage.upsert.mockResolvedValue({ id: "wa-1" });

    await expect(service.sendInvoiceCreatedReminder("inv-1")).resolves.toEqual({
      status: "SKIPPED",
      reason: "no_phone",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: DeliveryStatus.SKIPPED,
          errorCode: "no_phone",
        }),
      }),
    );
  });

  it("throws when Graph API fails so outbox can retry", async () => {
    configValues.WHATSAPP_TOKEN = "token";
    configValues.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
    prisma.whatsappMessage.findUnique.mockResolvedValue(null);
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "u-1",
      studioId: "studio-1",
      amount: 1500,
      student: {},
      studio: { id: "studio-1", name: "Floor One" },
    });
    crypto.decryptUser.mockReturnValue({
      name: "Ada Lovelace",
      phone: "9876543210",
      alternateMobile: null,
    });
    prisma.whatsappMessage.upsert.mockResolvedValue({ id: "wa-1" });
    prisma.whatsappMessage.update.mockResolvedValue({});
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "upstream", code: 500 } }),
    });

    await expect(service.sendInvoiceCreatedReminder("inv-1")).rejects.toThrow(
      /upstream/,
    );
    expect(prisma.whatsappMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: DeliveryStatus.FAILED }),
      }),
    );
  });

  it("sends a template and marks SENT", async () => {
    configValues.WHATSAPP_TOKEN = "token";
    configValues.WHATSAPP_PHONE_NUMBER_ID = "phone-id";
    prisma.whatsappMessage.findUnique.mockResolvedValue(null);
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "u-1",
      studioId: "studio-1",
      amount: 1500,
      student: {},
      studio: { id: "studio-1", name: "Floor One" },
    });
    crypto.decryptUser.mockReturnValue({
      name: "Ada Lovelace",
      phone: "9876543210",
      alternateMobile: null,
    });
    prisma.whatsappMessage.upsert.mockResolvedValue({ id: "wa-1" });
    prisma.whatsappMessage.update.mockResolvedValue({});
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wamid.abc" }] }),
    });

    await expect(service.sendInvoiceCreatedReminder("inv-1")).resolves.toEqual({
      status: "SENT",
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(prisma.whatsappMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DeliveryStatus.SENT,
          providerId: "wamid.abc",
        }),
      }),
    );
  });
});
