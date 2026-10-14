import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Deterministic hash for seed fixtures (same password → same hash). */
export function hashPasswordDeterministic(password: string, saltHex: string): string {
  const hash = scryptSync(password, saltHex, SCRYPT_KEYLEN).toString("hex");
  return `${saltHex}:${hash}`;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
