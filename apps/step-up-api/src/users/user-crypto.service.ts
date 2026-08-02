import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { User } from "@prisma/client";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;

export type UserPii = {
  email: string;
  name: string;
  phone: string | null;
  bio: string | null;
  instagramUrl: string | null;
};

export type EncryptedUserFields = {
  encryptedKey: string;
  piiCiphertext: string;
  piiIv: string;
};

export type DecryptedUser = Omit<
  User,
  "encryptedKey" | "piiCiphertext" | "piiIv" | "emailHash"
> &
  UserPii;

export const userPiiSelect = {
  encryptedKey: true,
  piiCiphertext: true,
  piiIv: true,
} as const;

/**
 * Practical at-rest encryption: each user gets a random data key,
 * wrapped with PII_MASTER_KEY. Profile PII is encrypted with the user
 * key before hitting the database.
 */
@Injectable()
export class UserCryptoService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private masterKey(): Buffer {
    const hex = this.config.get<string>("PII_MASTER_KEY");
    if (!hex || Buffer.from(hex, "hex").length !== KEY_LENGTH) {
      throw new InternalServerErrorException(
        "PII_MASTER_KEY must be set to a 64-char hex string",
      );
    }
    return Buffer.from(hex, "hex");
  }

  private seal(key: Buffer, plaintext: Buffer): { iv: Buffer; data: Buffer } {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { iv, data: Buffer.concat([encrypted, cipher.getAuthTag()]) };
  }

  private open(key: Buffer, iv: Buffer, data: Buffer): Buffer {
    const tag = data.subarray(data.length - TAG_LENGTH);
    const encrypted = data.subarray(0, data.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  generateWrappedKey(): string {
    const dataKey = randomBytes(KEY_LENGTH);
    const { iv, data } = this.seal(this.masterKey(), dataKey);
    return `${iv.toString("base64")}.${data.toString("base64")}`;
  }

  private unwrapKey(wrappedKey: string): Buffer {
    const [iv, data] = wrappedKey.split(".");
    if (!iv || !data) {
      throw new InternalServerErrorException("Malformed user key");
    }
    return this.open(
      this.masterKey(),
      Buffer.from(iv, "base64"),
      Buffer.from(data, "base64"),
    );
  }

  hashEmail(email: string): string {
    return createHmac("sha256", this.masterKey())
      .update(email.trim().toLowerCase())
      .digest("hex");
  }

  encryptPii(
    wrappedKey: string,
    pii: UserPii,
  ): { ciphertext: string; iv: string } {
    const key = this.unwrapKey(wrappedKey);
    const { iv, data } = this.seal(
      key,
      Buffer.from(JSON.stringify(pii), "utf8"),
    );
    return { ciphertext: data.toString("base64"), iv: iv.toString("base64") };
  }

  decryptPii(wrappedKey: string, ciphertext: string, iv: string): UserPii {
    const key = this.unwrapKey(wrappedKey);
    const plaintext = this.open(
      key,
      Buffer.from(iv, "base64"),
      Buffer.from(ciphertext, "base64"),
    );
    return JSON.parse(plaintext.toString("utf8")) as UserPii;
  }

  sealPii(
    pii: UserPii,
    existingWrappedKey?: string,
  ): EncryptedUserFields & { emailHash: string } {
    const encryptedKey = existingWrappedKey ?? this.generateWrappedKey();
    const { ciphertext, iv } = this.encryptPii(encryptedKey, {
      email: pii.email.trim(),
      name: pii.name.trim(),
      phone: pii.phone?.trim() || null,
      bio: pii.bio?.trim() || null,
      instagramUrl: pii.instagramUrl?.trim() || null,
    });
    return {
      encryptedKey,
      piiCiphertext: ciphertext,
      piiIv: iv,
      emailHash: this.hashEmail(pii.email),
    };
  }

  decryptUser<T extends EncryptedUserFields>(
    row: T,
  ): Omit<T, "encryptedKey" | "piiCiphertext" | "piiIv" | "emailHash"> &
    UserPii {
    const {
      encryptedKey,
      piiCiphertext,
      piiIv,
      emailHash: _emailHash,
      ...rest
    } = row as T & { emailHash?: string };
    const pii = this.decryptPii(encryptedKey, piiCiphertext, piiIv);
    return { ...rest, ...pii };
  }

  encryptStudioSecret(secret: string): { ciphertext: string; iv: string } {
    const { iv, data } = this.seal(
      this.masterKey(),
      Buffer.from(secret, "utf8"),
    );
    return {
      ciphertext: data.toString("base64"),
      iv: iv.toString("base64"),
    };
  }

  decryptStudioSecret(ciphertext: string, iv: string): string {
    const plaintext = this.open(
      this.masterKey(),
      Buffer.from(iv, "base64"),
      Buffer.from(ciphertext, "base64"),
    );
    return plaintext.toString("utf8");
  }
}
