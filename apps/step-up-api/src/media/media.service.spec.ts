import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { MediaService } from "./media.service";

function configService() {
  return {
    get: (key: string) => {
      const values: Record<string, string> = {
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "step-up",
        R2_PUBLIC_URL: "https://media.example.com",
      };
      return values[key];
    },
  } as ConfigService;
}

describe("MediaService", () => {
  it("rejects non-image content types", async () => {
    const service = new MediaService(configService());
    await expect(
      service.createSignedUploadUrl("notes.txt", "text/plain"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows muted branch promo videos", async () => {
    const service = new MediaService(configService());
    await expect(
      service.createSignedUploadUrl("promo.mp4", "video/mp4", "branch"),
    ).resolves.toMatchObject({
      contentType: "video/mp4",
      publicUrl: expect.stringMatching(/^uploads\//),
    });
  });

  it("stores studio hero uploads under studio-heroes", async () => {
    const service = new MediaService(configService());
    await expect(
      service.createSignedUploadUrl("hero.jpg", "image/jpeg", "studio-hero"),
    ).resolves.toMatchObject({
      contentType: "image/jpeg",
      publicUrl: expect.stringMatching(/^studio-heroes\//),
      key: expect.stringMatching(/^studio-heroes\//),
    });
  });

  it("rejects video outside branch purpose", async () => {
    const service = new MediaService(configService());
    await expect(
      service.createSignedUploadUrl("clip.mp4", "video/mp4", "post"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects audio outside chat purpose", async () => {
    const service = new MediaService(configService());
    await expect(
      service.createSignedUploadUrl("note.webm", "audio/webm", "post"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns a storage key as publicUrl for private buckets", async () => {
    const service = new MediaService(configService());
    await expect(
      service.createSignedUploadUrl(
        "note.webm",
        "audio/webm;codecs=opus",
        "chat",
      ),
    ).resolves.toMatchObject({
      contentType: "audio/webm",
      provider: "r2",
      publicUrl: expect.stringMatching(/^chat\//),
      key: expect.stringMatching(/^chat\//),
    });
  });

  it("omits checksum params from browser-friendly signed upload URLs", async () => {
    const service = new MediaService(configService());
    const signed = await service.createSignedUploadUrl(
      "note.webm",
      "audio/webm",
      "chat",
    );
    expect(signed.uploadUrl).not.toMatch(/checksum/i);
  });

  it("resolves object keys from legacy absolute URLs", () => {
    const service = new MediaService(configService());
    expect(service.resolveObjectKey("chat/note.webm")).toBe("chat/note.webm");
    expect(
      service.resolveObjectKey("https://media.example.com/chat/note.webm"),
    ).toBe("chat/note.webm");
    expect(
      service.resolveObjectKey(
        "https://step-up.account.r2.cloudflarestorage.com/chat/note.webm?X-Amz-Signature=abc",
      ),
    ).toBe("chat/note.webm");
  });

  it("creates signed read URLs without checksum params", async () => {
    const service = new MediaService(configService());
    const readUrl = await service.signReadUrl("chat/note.webm");
    expect(readUrl).toMatch(/^https:\/\//);
    expect(readUrl).not.toMatch(/checksum/i);
  });
});
