import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
import * as admin from "firebase-admin";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";

export interface VerifiedAuth {
  firebaseUid: string;
  email: string;
  name?: string;
  bypassUserId?: string;
}

@Injectable()
export class FirebaseService {
  private initialized = false;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  isBypassEnabled(): boolean {
    return this.config.get<string>("AUTH_BYPASS") === "true";
  }

  private ensureFirebase() {
    if (this.initialized || admin.apps.length > 0) {
      this.initialized = true;
      return;
    }

    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.config
      .get<string>("FIREBASE_PRIVATE_KEY")
      ?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.initialized = true;
    }
  }

  async verifyToken(token: string): Promise<VerifiedAuth> {
    if (this.isBypassEnabled()) {
      return this.verifyBypassToken(token);
    }

    this.ensureFirebase();

    if (!admin.apps.length) {
      throw new UnauthorizedException("Firebase is not configured");
    }

    const decoded = await admin.auth().verifyIdToken(token);
    return {
      firebaseUid: decoded.uid,
      email: decoded.email ?? `${decoded.uid}@firebase.local`,
      name: decoded.name,
    };
  }

  private verifyBypassToken(token: string): VerifiedAuth {
    const match = /^dev:([A-Z_]+):(.+)$/.exec(token);
    if (!match) {
      throw new UnauthorizedException("Invalid dev auth token");
    }

    const [, role, userId] = match;
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new UnauthorizedException("Invalid dev auth role");
    }

    return {
      firebaseUid: `dev-${userId}`,
      email: `${userId}@stepup.dev`,
      name: `Dev ${role}`,
      bypassUserId: userId,
    };
  }

  async resolveUser(auth: VerifiedAuth): Promise<DecryptedUser> {
    if (auth.bypassUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: auth.bypassUserId },
      });
      if (!user) {
        throw new UnauthorizedException("Bypass user not found");
      }
      const decrypted = this.crypto.decryptUser(user);
      return {
        ...decrypted,
        photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: auth.firebaseUid },
    });

    if (!user) {
      throw new UnauthorizedException(
        "User not found. Call POST /auth/sync first.",
      );
    }

    const decrypted = this.crypto.decryptUser(user);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
    };
  }
}
