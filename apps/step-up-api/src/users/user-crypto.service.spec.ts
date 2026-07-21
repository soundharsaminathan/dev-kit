import { InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { UserCryptoService } from "./user-crypto.service";

const MASTER_KEY =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00";

function makeService(masterKey: string | null = MASTER_KEY) {
  const config = {
    get: (key: string) =>
      key === "PII_MASTER_KEY" ? (masterKey ?? undefined) : undefined,
  };
  return new UserCryptoService(config as never);
}

describe("UserCryptoService", () => {
  it("round-trips PII through encrypt/decrypt", () => {
    const service = makeService();
    const wrapped = service.generateWrappedKey();
    const pii = {
      email: "Alex@StepUp.dev",
      name: "Alex Student",
      phone: "+91 91234 56789",
      bio: "Loves hip-hop",
      instagramUrl: "https://instagram.com/alex",
    };

    const { ciphertext, iv } = service.encryptPii(wrapped, pii);
    expect(ciphertext).not.toContain("Alex");
    expect(ciphertext).not.toContain("hip-hop");

    expect(service.decryptPii(wrapped, ciphertext, iv)).toEqual(pii);
  });

  it("sealPii produces decryptable rows and stable email hashes", () => {
    const service = makeService();
    const sealed = service.sealPii({
      email: " Owner@StepUp.dev ",
      name: "Studio Owner",
      phone: null,
      bio: null,
      instagramUrl: null,
    });

    const decrypted = service.decryptUser({
      id: "owner-1",
      ...sealed,
    });

    expect(decrypted.email).toBe("Owner@StepUp.dev");
    expect(decrypted.name).toBe("Studio Owner");
    expect(decrypted).not.toHaveProperty("encryptedKey");
    expect(sealed.emailHash).toBe(service.hashEmail("owner@stepup.dev"));
    expect(service.hashEmail("OWNER@stepup.dev")).toBe(sealed.emailHash);
  });

  it("generates distinct keys and ciphertexts", () => {
    const service = makeService();
    const wrappedA = service.generateWrappedKey();
    const wrappedB = service.generateWrappedKey();
    expect(wrappedA).not.toBe(wrappedB);

    const pii = {
      email: "a@b.co",
      name: "A",
      phone: null,
      bio: null,
      instagramUrl: null,
    };
    const first = service.encryptPii(wrappedA, pii);
    const second = service.encryptPii(wrappedA, pii);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("rejects tampered ciphertext", () => {
    const service = makeService();
    const wrapped = service.generateWrappedKey();
    const { ciphertext, iv } = service.encryptPii(wrapped, {
      email: "a@b.co",
      name: "Secret",
      phone: null,
      bio: null,
      instagramUrl: null,
    });

    const bytes = Buffer.from(ciphertext, "base64");
    bytes[0] ^= 0xff;
    const tampered = bytes.toString("base64");

    expect(() => service.decryptPii(wrapped, tampered, iv)).toThrow();
  });

  it("rejects decryption with a different user key", () => {
    const service = makeService();
    const wrappedA = service.generateWrappedKey();
    const wrappedB = service.generateWrappedKey();
    const { ciphertext, iv } = service.encryptPii(wrappedA, {
      email: "a@b.co",
      name: "Secret",
      phone: null,
      bio: null,
      instagramUrl: null,
    });

    expect(() => service.decryptPii(wrappedB, ciphertext, iv)).toThrow();
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
