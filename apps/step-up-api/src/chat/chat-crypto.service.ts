import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Practical at-rest encryption: each conversation gets a random data key,
 * wrapped with CHAT_MASTER_KEY. Message payloads (text, location, etc.) are
 * encrypted with the conversation key before hitting the database.
 */
@Injectable()
export class ChatCryptoService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private masterKey(): Buffer {
    const hex = this.config.get<string>("CHAT_MASTER_KEY");
    if (!hex || Buffer.from(hex, "hex").length !== KEY_LENGTH) {
      throw new InternalServerErrorException(
        "CHAT_MASTER_KEY must be set to a 64-char hex string",
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
      throw new InternalServerErrorException("Malformed conversation key");
    }
    return this.open(
      this.masterKey(),
      Buffer.from(iv, "base64"),
      Buffer.from(data, "base64"),
    );
  }

  encryptPayload(
    wrappedKey: string,
    payload: unknown,
  ): { ciphertext: string; iv: string } {
    const key = this.unwrapKey(wrappedKey);
    const { iv, data } = this.seal(
      key,
      Buffer.from(JSON.stringify(payload), "utf8"),
    );
    return { ciphertext: data.toString("base64"), iv: iv.toString("base64") };
  }

  decryptPayload<T = unknown>(
    wrappedKey: string,
    ciphertext: string,
    iv: string,
  ): T {
    const key = this.unwrapKey(wrappedKey);
    const plaintext = this.open(
      key,
      Buffer.from(iv, "base64"),
      Buffer.from(ciphertext, "base64"),
    );
    return JSON.parse(plaintext.toString("utf8")) as T;
  }
}
