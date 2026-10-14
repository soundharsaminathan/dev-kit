import { InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { UserCryptoService } from "./user-crypto.service";

const MASTER_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function makeService(masterKey: string | null = MASTER_KEY) {
  const config = {
    get: (key: string) =>
      key === "PII_MASTER_KEY" ? (masterKey ?? undefined) : undefined,
  };
  return new UserCryptoService(config as never);
}

function pii(
  overrides: Partial<Parameters<UserCryptoService["encryptPii"]>[1]> = {},
) {
  return {
    email: "a@b.co",
    name: "A",
    phone: null,
    bio: null,
    instagramUrl: null,
    guardianName: null,
    alternateMobile: null,
    ...overrides,
  };
}

describe("UserCryptoService", () => {
  it("round-trips PII through encrypt/decrypt", () => {
    const service = makeService();
    const wrapped = service.generateWrappedKey();
    const value = pii({
      email: "Alex@StepUp.dev",
      name: "Alex Student",
      phone: "+91 91234 56789",
      bio: "Loves hip-hop",
      instagramUrl: "https://instagram.com/alex",
      guardianName: "Guardian One",
      alternateMobile: "+91 98765 43210",
    });

    const { ciphertext, iv } = service.encryptPii(wrapped, value);
    expect(ciphertext).not.toContain("Alex");
    expect(ciphertext).not.toContain("hip-hop");

    expect(service.decryptPii(wrapped, ciphertext, iv)).toEqual(value);
  });

  it("sealPii produces decryptable rows and stable email hashes", () => {
    const service = makeService();
    const sealed = service.sealPii({
      email: " Owner@StepUp.dev ",
      name: "Studio Owner",
      phone: null,
      bio: null,
      instagramUrl: null,
      guardianName: " Guardian One ",
      alternateMobile: null,
    });

    const decrypted = service.decryptUser({
      id: "owner-1",
      ...sealed,
    });

    expect(decrypted.email).toBe("Owner@StepUp.dev");
    expect(decrypted.name).toBe("Studio Owner");
    expect(decrypted.guardianName).toBe("Guardian One");
    expect(decrypted).not.toHaveProperty("encryptedKey");
    expect(sealed.emailHash).toBe(service.hashEmail("owner@stepup.dev"));
    expect(service.hashEmail("OWNER@stepup.dev")).toBe(sealed.emailHash);
  });

  it("defaults missing guardian fields when decrypting legacy ciphertext", () => {
    const service = makeService();
    const wrapped = service.generateWrappedKey();
    const { ciphertext, iv } = service.encryptPii(
      wrapped,
      pii({ email: "legacy@stepup.dev", name: "Legacy User" }),
    );

    const decrypted = service.decryptPii(wrapped, ciphertext, iv);
    expect(decrypted.guardianName).toBeNull();
    expect(decrypted.alternateMobile).toBeNull();
    expect(decrypted.email).toBe("legacy@stepup.dev");
  });

  it("generates distinct keys and ciphertexts", () => {
    const service = makeService();
    const wrappedA = service.generateWrappedKey();
    const wrappedB = service.generateWrappedKey();
    expect(wrappedA).not.toBe(wrappedB);

    const first = service.encryptPii(wrappedA, pii());
    const second = service.encryptPii(wrappedA, pii());
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("rejects tampered ciphertext", () => {
    const service = makeService();
    const wrapped = service.generateWrappedKey();
    const { ciphertext, iv } = service.encryptPii(wrapped, pii());

    const bytes = Buffer.from(ciphertext, "base64");
    bytes[0] ^= 0xff;
    const tampered = bytes.toString("base64");

    expect(() => service.decryptPii(wrapped, tampered, iv)).toThrow();
  });

  it("rejects decryption with a different user key", () => {
    const service = makeService();
    const wrappedA = service.generateWrappedKey();
    const wrappedB = service.generateWrappedKey();
    const { ciphertext, iv } = service.encryptPii(wrappedA, pii());

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

  it("round-trips studio secrets through encrypt/decrypt", () => {
    const service = makeService();
    const secret = "rzp_test_secret_value";
    const sealed = service.encryptStudioSecret(secret);
    expect(sealed.ciphertext).not.toContain(secret);
    expect(service.decryptStudioSecret(sealed.ciphertext, sealed.iv)).toBe(
      secret,
    );
  });
});
