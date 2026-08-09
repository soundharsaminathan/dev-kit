import { InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ChatCryptoService } from "./chat-crypto.service";

const MASTER_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function makeService(masterKey: string | null = MASTER_KEY) {
  const config = {
    get: (key: string) =>
      key === "CHAT_MASTER_KEY" ? (masterKey ?? undefined) : undefined,
  };
  return new ChatCryptoService(config as never);
}

describe("ChatCryptoService", () => {
  it("round-trips a payload through encrypt/decrypt", () => {
    const service = makeService();
    const wrapped = service.generateWrappedKey();
    const payload = { text: "hello 👋", location: { lat: 12.9, lng: 77.6 } };

    const { ciphertext, iv } = service.encryptPayload(wrapped, payload);
    expect(ciphertext).not.toContain("hello");

    const decrypted = service.decryptPayload(wrapped, ciphertext, iv);
    expect(decrypted).toEqual(payload);
  });

  it("generates distinct keys and ciphertexts", () => {
    const service = makeService();
    const wrappedA = service.generateWrappedKey();
    const wrappedB = service.generateWrappedKey();
    expect(wrappedA).not.toBe(wrappedB);

    const first = service.encryptPayload(wrappedA, { text: "same" });
    const second = service.encryptPayload(wrappedA, { text: "same" });
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("rejects tampered ciphertext", () => {
    const service = makeService();
    const wrapped = service.generateWrappedKey();
    const { ciphertext, iv } = service.encryptPayload(wrapped, {
      text: "secret",
    });

    const bytes = Buffer.from(ciphertext, "base64");
    bytes[0] ^= 0xff;
    const tampered = bytes.toString("base64");

    expect(() => service.decryptPayload(wrapped, tampered, iv)).toThrow();
  });

  it("rejects decryption with a different conversation key", () => {
    const service = makeService();
    const wrappedA = service.generateWrappedKey();
    const wrappedB = service.generateWrappedKey();
    const { ciphertext, iv } = service.encryptPayload(wrappedA, {
      text: "secret",
    });

    expect(() => service.decryptPayload(wrappedB, ciphertext, iv)).toThrow();
  });

  it("fails clearly when the master key is missing or malformed", () => {
    expect(() => makeService(null).generateWrappedKey()).toThrow(
      InternalServerErrorException,
    );
    expect(() => makeService("abc").generateWrappedKey()).toThrow(
      InternalServerErrorException,
    );
  });
});
