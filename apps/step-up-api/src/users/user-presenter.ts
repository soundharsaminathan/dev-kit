import { Inject, Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import { MediaService } from "../media/media.service";
import {
  type EncryptedUserFields,
  UserCryptoService,
} from "./user-crypto.service";

export type PresentLiteInput = EncryptedUserFields & {
  id: string;
  photoUrl?: string | null;
};

export type PresentLiteOptions = {
  email?: boolean;
  phone?: boolean;
};

export type PresentLiteUser = {
  id: string;
  name: string;
  photoUrl: string | null;
  email?: string;
  phone?: string | null;
};

/**
 * Slim list presentation: decrypt name (+ optional email/phone) and sign photo.
 * Skips banner/cover. Future optimization: denormalize displayName onto
 * BatchSummary so discover cards can skip trainer PII decrypt entirely.
 */
@Injectable()
export class UserPresenter {
  constructor(
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async presentLite(
    user: User | PresentLiteInput,
    opts: PresentLiteOptions = {},
  ): Promise<PresentLiteUser> {
    const presented = await this.presentLiteMany([user], opts);
    return presented[0]!;
  }

  async presentLiteMany(
    users: Array<User | PresentLiteInput>,
    opts: PresentLiteOptions = {},
  ): Promise<PresentLiteUser[]> {
    if (users.length === 0) return [];

    const decrypted = users.map((user) => this.crypto.decryptUser(user));
    const signedPhotos = await this.media.signReadUrls(
      decrypted.map((user) => user.photoUrl ?? ""),
    );

    return decrypted.map((user, index) => {
      const presented: PresentLiteUser = {
        id: user.id,
        name: user.name,
        photoUrl: user.photoUrl ? (signedPhotos[index] ?? null) : null,
      };
      if (opts.email) {
        presented.email = user.email;
      }
      if (opts.phone) {
        presented.phone = user.phone;
      }
      return presented;
    });
  }
}
